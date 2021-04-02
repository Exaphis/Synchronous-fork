import {
    AppBar, Container, IconButton, Tab, Tabs,
    Typography, Toolbar, Button, Box, Paper, Grid
} from "@material-ui/core";
import * as React from "react";
import {Rnd} from "react-rnd";
import * as rps from "react-pro-sidebar";
import {PubSub} from "pubsub-js";
import AddIcon from "@material-ui/icons/Add";
import CloseIcon from '@material-ui/icons/Close';
import MinimizeIcon from '@material-ui/icons/Minimize';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';

import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import DashboardModal from '@uppy/react/lib/DashboardModal';
import {useUppy} from '@uppy/react';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';

import {WorkspaceUniqueIdContext, WorkspaceUserContext} from "./Workspace";
import {SERVER_MSG_TYPE, PUBSUB_TOPIC, TUSD_URL, APP_TYPE, CLIENT_MSG_TYPE} from "./api";

function AppTitleBar(props) {
    const title = props.title !== undefined ? props.title : "Untitled Window";
    return (
        <Grid style={{
            height: '2em',
            backgroundColor: 'darkGray',
            display: 'flex'
        }} className="handle">
            <span style={{flexGrow: 1, height: '100%', display: 'inline-flex',
                alignItems: 'center', overflow: 'hidden'}}>
                { title }
            </span>
            <IconButton size="small" style={{ height: '100%'}} onClick={props.onMinimize}>
                <MinimizeIcon fontSize="inherit" />
            </IconButton>
            <IconButton size="small" style={{height: '100%'}} onClick={props.onClose}>
                <CloseIcon fontSize="inherit"/>
            </IconButton>
        </Grid>
    );
}


function FileUploadAppContents() {
    const workspaceUniqueId = React.useContext(WorkspaceUniqueIdContext);
    const [fileComponents, setFileComponents] = React.useState([])

    const uppy = useUppy(() => {
        return new Uppy({
            restrictions: {
                maxFileSize: 10485760  // 10 mebibytes (should be same as tusd)
            },
            meta: {
                workspaceUniqueId: workspaceUniqueId
            }
        }).use(Tus, {endpoint: TUSD_URL});
    })

    React.useEffect(() => {
        /**
         * @param {Object}   data                      - Websocket message sent from the server.
         * @param {Object[]} data.file_list            - List of files containing created_at, file_id, and name.
         * @param {string} data.file_list[].file_id    - File ID generated by tus for the file.
         * @param {string} data.file_list[].name       - Original name of the file when uploaded.
         * @param {string} data.file_list[].created_at - Timestamp of when the file was uploaded.
         */
        let token = PubSub.subscribe(SERVER_MSG_TYPE.FILE_LIST, (msg, data) => {
            setFileComponents(
                data.file_list.map((file) => {
                    return (
                        <Box my={5}>
                            <Paper>
                                <Grid container style={{display: "flex"}}>
                                    <Grid item style={{display: "flex", flexGrow: 1,
                                        marginLeft: "1em", alignItems: "center"}}>
                                        <Typography variant="h5" gutterBottom>
                                            {file.name}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <IconButton color="inherit" href={TUSD_URL + file.file_id}
                                                    rel="noreferrer" target="_blank">
                                            <CloudDownloadIcon />
                                        </IconButton>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Box>
                    );
                })
            );
        });

        return function cleanup() {
            PubSub.unsubscribe(token);
        }
    });

    React.useEffect(() => {
        PubSub.publish(
            PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
            {'type': CLIENT_MSG_TYPE.FILE_LIST_REQUEST}
        );
    }, []);

    const [isModalOpen, setModalOpen] = React.useState(false);

    return (
        <Container maxWidth="md">
            <Box my={5}>
                {fileComponents}
                <Button variant="contained" color="primary" onClick={() => setModalOpen(true)}>
                    Share a file
                </Button>
                {/* Portal to root needed for modal? */}
                <DashboardModal
                    uppy={uppy}
                    closeModalOnClickOutside
                    open={isModalOpen}
                    onRequestClose={() => setModalOpen(false)}
                />
            </Box>
        </Container>
    );
}


function PadAppContents(props) {
    const currUser = React.useContext(WorkspaceUserContext);
    const nickname = encodeURIComponent(currUser.nickname);
    const color = encodeURIComponent(currUser.color);

    let padUrl = props.padUrl + `?showChat=false&userName=${nickname}&userColor=${color}`;

    return (
        <iframe style={{flexGrow: 1, pointerEvents: props.pointerEventsEnabled ? 'auto' : 'none'}}
                title={props.uuid} src={padUrl}/>
    );
}


function TemplateAppContents(props) {
    return (
        <iframe style={{flexGrow: 1, pointerEvents: props.pointerEventsEnabled ? 'auto' : 'none'}}
                title={props.uuid} src='https://google.com?igu=1' />
    );
}


function WorkspaceApp(props) {
    return (
        <div id={props.uuid} style={{
            backgroundColor: 'white',
            height: '100%',
            border: '2px solid gray',
            borderRadius: '5px',
            display: 'flex',
            // fixes firefox rendering of iframes (vs. display: none)
            // firefox would have problems with rendering iframes (i.e. etherpad) when display is none.
            // instead, visibility: hidden should work the same.
            visibility: props.minimized ? 'hidden': 'visible',
            flexDirection: 'column'
        }}>
            <AppTitleBar minimized={props.minimized} onClose={props.onClose}
                         onMinimize={props.onMinimize} title={props.name}/>
            {props.children}
        </div>
    )
}


function WorkspaceTab(props) {
    const [apps, setApps] = React.useState({});
    const [pointerEventsEnabled, setPointerEventsEnabled] = React.useState(true);
    const [topAppUuid, setTopAppUuid] = React.useState();

    const appAreaRef = React.useRef();
    const appAreaPosRef = React.useRef({'left': 100, 'top': 100});

    // contains the states (i.e. position + size) of each app
    const appStatesRef = React.useRef({});

    function setAppMinimized(appId, minimizedUpdater) {
        setApps((prevApps) => {
            let apps = Object.assign({}, prevApps);
            apps[appId].minimized = minimizedUpdater(apps[appId].minimized);
            return apps;
        });
    }

    function getElementOffset(el) {
        if (el === undefined) {
            return {
                left: 0,
                top: 0
            };
        }

        // https://stackoverflow.com/a/28222246
        const rect = el.getBoundingClientRect();
        return {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY
        };
    }

    appAreaPosRef.current = getElementOffset(appAreaRef.current);

    React.useEffect(() => {
        PubSub.publish(
            PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
            {
                type: CLIENT_MSG_TYPE.APP_LIST_REQUEST,
                tabId: props.tabId
            }
        );

        PubSub.subscribe(SERVER_MSG_TYPE.APP_LIST, (msg, data) => {
            if (data['tab_id'] !== props.tabId) {
                return;
            }

            // data['app_list']:
            //     - list of apps
            //     - each app contains `type` (enum), `unique_id`, and `data`
            console.log('app list:');
            console.log(data['app_list']);

            setApps(currApps => {
                let newApps = {};
                data['app_list'].forEach(serializedApp => {
                    const appId = serializedApp['unique_id'];
                    const appData = serializedApp['data'];
                    const appType = serializedApp['app_type'];
                    const appName = serializedApp['name'];

                    if (appId in currApps) {
                        newApps[appId] = currApps[appId];
                    }
                    else {
                        newApps[appId] = {
                            id: appId,
                            minimized: true,
                            type: appType,
                            data: appData,
                            name: appName,
                            switchMinimized: () => {
                                setAppMinimized(appId, minimized => !minimized);
                            },
                            onMinimize: () => {
                                setAppMinimized(appId, () => true);
                            },
                            onClose: () => {
                                PubSub.publish(
                                    PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
                                    {'type': CLIENT_MSG_TYPE.DELETE_APP, 'tabId': props.tabId, 'appId': appId}
                                );
                            }
                        }

                        appStatesRef.current[appId] = {
                            x: appAreaPosRef.current.left,
                            y: appAreaPosRef.current.top,
                            width: 'auto',
                            height: 'auto'
                        };
                    }
                });


                // prune orphaned states
                Object.keys(appStatesRef.current).forEach((appId) => {
                    if (!(appId in newApps)) {
                        delete appStatesRef.current[appId];
                    }
                });

                return newApps;
            });
        });
    }, [props.tabId]);

    function addApp(type) {
        let name;
        if (type === APP_TYPE.PAD) {
            name = "Text pad";
        }
        else if (type === APP_TYPE.FILE_SHARE) {
            name = "File share";
        }
        else {
            console.log('Unknown app type: ' + type);
            return;
        }

        PubSub.publish(
            PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
            {
                type: CLIENT_MSG_TYPE.NEW_APP,
                tabId: props.tabId,
                appType: type,
                name: name
            }
        );
    }

    // console.log(apps);

    const appComponents = Object.values(apps).map((app) => {
        let appContents;

        if (app.type === APP_TYPE.PAD) {
            const appData = app.data;
            appContents = <PadAppContents pointerEventsEnabled={pointerEventsEnabled}
                                          padUrl={appData['iframe_url']} />;
        }
        else if (app.type === APP_TYPE.FILE_SHARE) {
            appContents = <FileUploadAppContents/>;
        }
        else {
            console.error('invalid app type: ' + app.type);
            console.error(typeof app.type);
            appContents = <TemplateAppContents/>;
        }

        return (
            <Rnd
                key={app.id}
                bounds='.appArea'
                onDragStart={() => {
                    setPointerEventsEnabled(false);
                    setTopAppUuid(app.id);
                }}
                onDragStop={(e, data) => {
                    setPointerEventsEnabled(true);
                    const appState = appStatesRef.current[app.id];
                    appState.x = data.x;
                    appState.y = data.y;
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                    const appState = appStatesRef.current[app.id];
                    appState.width = ref.style.width;
                    appState.height = ref.style.height;
                    // position can also change in resizing when moving the top left corner
                    appState.x = position.x;
                    appState.y = position.y;
                }}
                default={appStatesRef.current[app.id]}
                dragHandleClassName="handle"
                minHeight='200px'  // how to not use magic constants?
                minWidth='50px'
                style={{     // change z index to prioritize recently selected app
                    zIndex: topAppUuid === app.id ? '1' : 'auto'
                }}
            >
                <WorkspaceApp minimized={app.minimized} onClose={app.onClose}
                              onMinimize={app.onMinimize} uuid={app.id} name={app.name}>
                    {appContents}
                </WorkspaceApp>
            </Rnd>
        );
    });

    return (
        <div style={{
            backgroundColor: 'lightGray',
            height: '100%',
            width: '100%',
            // use display: none instead of returning null so any embedded iframes do not
            // have to reload when switching tabs
            // use flex so the appComponents can resize to maximum width allowed
            display: 'flex',
            position: props.hidden ? 'absolute': 'static',
            left: props.hidden ? '-5000px' : 'auto'
        }}>
            <rps.ProSidebar>
                <rps.Menu>
                    <rps.MenuItem icon={<AddIcon />} onClick={() => addApp(APP_TYPE.FILE_SHARE)} >
                        Add file share
                    </rps.MenuItem>
                    <rps.MenuItem icon={<AddIcon />} onClick={() => addApp(APP_TYPE.PAD)} >
                        Add pad
                    </rps.MenuItem>
                    {
                        Object.values(apps).map((app) => (
                            app.minimized &&
                            <rps.MenuItem key={app.id} onClick={app.switchMinimized}
                                icon={
                                    <IconButton component="div"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    app.onClose();
                                                }}
                                                color="inherit">
                                        <CloseIcon />
                                    </IconButton>
                                } >
                                {app.name}
                            </rps.MenuItem>
                        ))
                    }
                </rps.Menu>
            </rps.ProSidebar>

            <div style={{flexGrow: 1}}
                 className="appArea"
                 ref={appAreaRef}>
                { appComponents }
            </div>

        </div>
    )
}


function WorkspaceArea() {
    const [tabs, setTabs] = React.useState([]);
    const [currTab, setCurrTab] = React.useState(-1);

    React.useEffect(() => {
        PubSub.subscribe(SERVER_MSG_TYPE.TAB_LIST, (msg, data) => {
            // console.log('set tab list:');
            // console.log(data['tab_list']);

            const tabList = data['tab_list'];
            setTabs(tabList);
            if (tabList.length > 0 && (currTab < 0 || currTab >= tabList.length)) {
                setCurrTab(tabList.length - 1);
            }
        });
    }, [currTab])

    const handleTabChange = (event, newValue) => {
        setCurrTab(newValue);
    };

    function closeTab(event, uniqueId) {
        // https://stackoverflow.com/a/63277341
        // prevent close press from propagating to tab button
        event.stopPropagation();

        // use function to avoid capturing the current value of currTab
        // within closure
        setCurrTab(currTab => Math.min(currTab, tabs.length - 2));

        PubSub.publish(
            PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
            {'type': CLIENT_MSG_TYPE.DELETE_TAB, 'uniqueId': uniqueId}
        );
    }

    function createNewTab() {
        setCurrTab(tabs.length);  // new tab will be appended to the end (hopefully!)
        PubSub.publish(
            PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
            {'type': CLIENT_MSG_TYPE.NEW_TAB, 'name': 'Unnamed tab'}
        );
    }

    let tabComponents = <p>You have no tabs. How about creating one?</p>;
    if (tabs.length > 0) {
        tabComponents = tabs.map((tab, tabIdx) => {
            return <WorkspaceTab key={tab.unique_id}
                                 tabId={tab.unique_id}
                                 hidden={currTab !== tabIdx} />;
        });
    }

    return (
        <Container maxWidth="xl" disableGutters={true}>
            <AppBar position="static">
                <Toolbar>
                    <Tabs value={currTab} edge="start" onChange={handleTabChange}  variant="scrollable" scrollButtons="auto">
                        {
                            tabs.length === 0 ? null : tabs.map((tab) => {
                                return (
                                    <Tab key={tab.unique_id} label={
                                        <span> {tab.name}
                                            <IconButton component="div"  // https://stackoverflow.com/a/63277341
                                                        onClick={(event) => closeTab(event, tab.unique_id)}
                                                        color="inherit">
                                               <CloseIcon />
                                            </IconButton>
                                        </span>
                                    }/>
                                );
                            })
                        }
                    </Tabs>
                    <IconButton color="inherit" edge="end" onClick={createNewTab}>
                        <AddIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>
            <div style={{ height: "100vh" }}>
                { tabComponents }
            </div>
        </Container>
    )
}

export { WorkspaceArea };