import {
    AppBar, Container, IconButton, Tab, Tabs,
    Typography, Toolbar, Button, Box, Paper, Grid, Snackbar
} from "@material-ui/core";
import * as React from "react";
import {Rnd} from "react-rnd";
import * as rps from "react-pro-sidebar";
import {PubSub} from "pubsub-js";
import AddIcon from "@material-ui/icons/Add";
import CloseIcon from '@material-ui/icons/Close';
import MinimizeIcon from '@material-ui/icons/Minimize';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import Alert from '@material-ui/lab/Alert';


import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import DashboardModal from '@uppy/react/lib/DashboardModal';
import {useUppy} from '@uppy/react';
import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';


import {WorkspaceUniqueIdContext, WorkspaceUserContext} from "./Workspace";
import {
    SERVER_MSG_TYPE, PUBSUB_TOPIC, TUSD_URL, APP_TYPE, CLIENT_MSG_TYPE, fetchAPI,
    appendQueryParameter
} from "./api";

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
            <IconButton size="small" style={{ height: '100%'}} onClick={props.onMaximize}>
                <ZoomOutMapIcon fontSize="inherit" />
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

function WhiteboardAppContents(props) {
    const currUser = React.useContext(WorkspaceUserContext);
    const nickname = encodeURIComponent(currUser.nickname);

    let spaceUrl = appendQueryParameter(props.padUrl, 'nickname', nickname)

    return (
        <iframe style={{flexGrow: 1, pointerEvents: props.pointerEventsEnabled ? 'auto' : 'none'}}
                title={props.uuid} src={spaceUrl}/>
    );
}

function TemplateAppContents(props) {
    return (
        // <iframe style={{flexGrow: 1, pointerEvents: props.pointerEventsEnabled ? 'auto' : 'none'}}
        //         title={props.uuid} src='https://google.com?igu=1' />
        <iframe style={{flexGrow: 1, pointerEvents: props.pointerEventsEnabled ? 'auto' : 'none'}}
                title={props.uuid} src='http://spacedeck.synchronous.localhost/spaces/bf4e63a6-ee2c-411b-aabe-d481ee558aa6?spaceAuth=762db34' />
    );
}

function OfflinePadAppContents(props) {
    return (
        <iframe style={{flexGrow: 1}}
                title={props.uuid} src='http://justnotepad.com/' />
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
            // change position so events can be fired on apps behind them
            position: props.minimized ? 'absolute': 'static',
            top: props.minimized ? '-5000px' : 'auto',
            flexDirection: 'column'
        }}>
            <AppTitleBar minimized={props.minimized} onClose={props.onClose}
                         onMinimize={props.onMinimize} onMaximize={props.onMaximize}
                         title={props.name}/>
            {props.children}

        </div>
    )
}


function WorkspaceTab(props) {
    // contains the info + states (i.e. position + size) of each app
    const [apps, setApps] = React.useState({});
    const [pointerEventsEnabled, setPointerEventsEnabled] = React.useState(true);
    const [topAppUuid, setTopAppUuid] = React.useState();
    const [open, setOpen] = React.useState(false);
    const [open2, setOpen2] = React.useState(false);
    const appAreaRef = React.useRef();

    const status = async () => {
        let response = await fetchAPI(
            'GET', 'heartbeat/');
        if (response.details !== 200) {
            if (localStorage.getItem('offline') === 'false') {
                setOpen(true);
                setOpen2(false);
                localStorage.setItem('offline', 'true');
                for (let app in apps) {
                    if (apps[app].name === 'Offline Pad') {
                        apps[app].minimized = false;
                        break;
                    }
                }
            }
            // if (!hasOffline) {
            //     console.log('add')
            //     addApp(APP_TYPE.OFFLINE_PAD);
            // }
        } else if (localStorage.getItem('offline') === 'true') {
            localStorage.setItem('offline', 'false');
            console.log('regain')
            setOpen2(true);
            setOpen(false);
        }
    };



    let date = new Date();
    if (date.getSeconds() % 3 === 0) {
        status();
    }

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen(false);
    };

    const handleClose2 = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }

        setOpen2(false);
    };

    function setAppMinimized(appId, minimizedUpdater) {
        setApps((prevApps) => {
            let apps = Object.assign({}, prevApps);
            apps[appId].minimized = minimizedUpdater(apps[appId].minimized);
            if (!apps[appId].minimized) {
                setTopAppUuid(appId);
            }
            return apps;
        });
    }

    function setAppMaximized(appId, maximizedUpdater) {
        setApps((prevApps) => {
            let apps = Object.assign({}, prevApps);
            apps[appId].maximized = maximizedUpdater(apps[appId].maximized);

            if (apps[appId].maximized) {
                for (const diffAppId in prevApps) {
                    if (diffAppId !== appId) {
                        apps[diffAppId].minimized = true;
                    }
                }
            }

            return apps;
        });
    }

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

            // must use function to avoid apps in the dependency array
            setApps(oldApps => {
                let newApps = {};

                data['app_list'].forEach(serializedApp => {
                    const appId = serializedApp['unique_id'];
                    const appData = serializedApp['data'];
                    const appType = serializedApp['app_type'];
                    const appName = serializedApp['name'];

                    if (appId in oldApps) {
                        newApps[appId] = oldApps[appId];
                    } else {
                        newApps[appId] = {
                            id: appId,
                            minimized: true,
                            maximized: false,  // if true, app takes up as much space as possible
                            type: appType,
                            data: appData,
                            name: appName,
                            x: 100,
                            y: 100,
                            width: 'auto',
                            height: 'auto',
                            switchMinimized: () => {
                                setPointerEventsEnabled(true);
                                setAppMinimized(appId, minimized => !minimized);
                            },
                            onMinimize: () => {
                                setPointerEventsEnabled(true);
                                setAppMinimized(appId, () => true);
                            },
                            onClose: () => {
                                setPointerEventsEnabled(true);
                                PubSub.publish(
                                    PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
                                    {'type': CLIENT_MSG_TYPE.DELETE_APP, 'tabId': props.tabId, 'appId': appId}
                                );
                            },
                            switchMaximized: () => {
                                setPointerEventsEnabled(true);
                                setAppMaximized(appId, maximized => !maximized);
                            },
                        }
                    }
                });

                return newApps;
            });
        });
    }, [props.tabId]);

    let hasOffline;
    for (let app in apps) {
        if (apps[app].name === 'Offline Pad') {
            if (!hasOffline) {
                hasOffline = true;
            } else {
                PubSub.publish(
                    PUBSUB_TOPIC.WS_SEND_MSG_TOPIC,
                    {'type': CLIENT_MSG_TYPE.DELETE_APP, 'tabId': props.tabId, 'appId': app}
                );
            }
        }
    }


    React.useEffect(() => {
        localStorage.setItem('offline', 'false');
        addApp(APP_TYPE.OFFLINE_PAD);
        // eslint-disable-next-line
    }, [])

    function addApp(type) {
        let name;
        if (type === APP_TYPE.PAD) {
            name = "Text pad";
        }
        else if (type === APP_TYPE.FILE_SHARE) {
            name = "File share";
        }
        else if (type === APP_TYPE.TEMPLATE) {
            name = 'Template';
        }
        else if (type === APP_TYPE.OFFLINE_PAD) {
            let app;
            for (app in apps) {
                if (apps[app].name === 'Offline Pad') {
                    return;
                }
            }
            name = 'Offline Pad';
        }
        else if (type === APP_TYPE.WHITEBOARD) {
            name = 'Whiteboard';
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
        else if (app.type === APP_TYPE.OFFLINE_PAD) {
            appContents = <OfflinePadAppContents/>
        }
        else if (app.type === APP_TYPE.WHITEBOARD) {
            const appData = app.data;
            appContents = <WhiteboardAppContents pointerEventsEnabled={pointerEventsEnabled}
                                                 padUrl={appData['iframe_url']} />;
        }
        else if (app.type === APP_TYPE.TEMPLATE) {
            appContents = <TemplateAppContents pointerEventsEnabled={pointerEventsEnabled}/>;
        }
        else {
            console.error('invalid app type: ' + app.type);
            console.error(typeof app.type);
        }


        return (
            <Rnd
                key={app.id}
                bounds={`#appArea-${props.tabId}`}
                size={{
                    width: app.maximized ? appAreaRef.current.clientWidth : app.width,
                    height: app.maximized ? appAreaRef.current.clientHeight : app.height,
                }}
                position={{
                    x: app.maximized ? 0 : app.x,
                    y: app.maximized ? 0 : app.y,
                }}
                onDragStart={() => {
                    setPointerEventsEnabled(false);
                    setTopAppUuid(app.id);
                }}
                onDragStop={(e, data) => {
                    setPointerEventsEnabled(true);

                    const newApps = Object.assign({}, apps);
                    const newApp = newApps[app.id];
                    newApp.x = data.x;
                    newApp.y = data.y;
                    setApps(newApps);
                }}
                onResizeStart={() => {
                    setPointerEventsEnabled(false);
                    setTopAppUuid(app.id);
                }}
                onResizeStop={(e, direction, ref, delta, position) => {
                    setPointerEventsEnabled(true);

                    const newApps = Object.assign({}, apps);
                    const newApp = newApps[app.id];
                    newApp.width = ref.style.width;
                    newApp.height = ref.style.height;
                    // position can also change in resizing when moving the top left corner
                    newApp.x = position.x;
                    newApp.y = position.y;
                    setApps(newApps);
                }}
                dragHandleClassName="handle"
                minHeight='200px'  // how to not use magic constants?
                minWidth='50px'
                style={{     // change z index to prioritize recently selected app
                    // TODO: set topAppUuid when anything is clicked, not just drag
                    zIndex: topAppUuid === app.id ? '1' : 'auto'
                }}
            >
                <WorkspaceApp minimized={app.minimized} onClose={app.onClose}
                              onMinimize={app.onMinimize} onMaximize={app.switchMaximized}
                              uuid={app.id} name={app.name}>
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
            <Snackbar open={open} autoHideDuration={6000} onClose={handleClose}>
                <Alert onClose={handleClose} severity="error">
                    You have lost connection
                </Alert>
            </Snackbar>
            <Snackbar open={open} autoHideDuration={7000} onClose={handleClose}
                      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={handleClose} severity="info">
                    Offline pad opened for continued support
                </Alert>
            </Snackbar>
            <Snackbar open={open2} autoHideDuration={6000} onClose={handleClose2}
                      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={handleClose2} severity="success">
                    You have regained connection
                </Alert>
            </Snackbar>
            <rps.ProSidebar>
                <rps.Menu>
                    <rps.MenuItem icon={<AddIcon />} onClick={() => addApp(APP_TYPE.FILE_SHARE)} >
                        Add file share
                    </rps.MenuItem>
                    <rps.MenuItem icon={<AddIcon />} onClick={() => addApp(APP_TYPE.PAD)} >
                        Add pad
                    </rps.MenuItem>
                    <rps.MenuItem icon={<AddIcon />} onClick={() => addApp(APP_TYPE.WHITEBOARD)} >
                        Add whiteboard
                    </rps.MenuItem>
                    <rps.MenuItem icon={<AddIcon />} onClick={() => addApp(APP_TYPE.TEMPLATE)} >
                        Add test
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
                 id={`appArea-${props.tabId}`}
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