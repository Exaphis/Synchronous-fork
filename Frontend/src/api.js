let APP_URL_MAPPING;
export let TUSD_URL;
export let BACKEND_URL;

const protocol = window.location.protocol;
if (window.location.hostname === 'synchronous.localhost') {
    // we're under a reverse proxy for localhost
    TUSD_URL = `${protocol}//tusd.synchronous.localhost/files/`;
    BACKEND_URL = 'api.synchronous.localhost';
    APP_URL_MAPPING = {
        'ETHERPAD_PLACEHOLDER': `${protocol}//etherpad.synchronous.localhost`,
        'SPACEDECK_PLACEHOLDER': `${protocol}//spacedeck.synchronous.localhost`
    }
}
else {
    TUSD_URL = `${protocol}//tusd.synchronous.localhost/files/`;
    BACKEND_URL = 'api.synchronous.localhost';
    APP_URL_MAPPING = {
        'ETHERPAD_PLACEHOLDER': `${protocol}//etherpad.synchronous.localhost`,
        'SPACEDECK_PLACEHOLDER': `${protocol}//spacedeck.synchronous.localhost`
    }
}

// pubsub topics used for communication within the frontend
// pubsub topics and msg types must be unique!!
export const PUBSUB_TOPIC = {
    WS_SEND_MSG_TOPIC: 'wsSendMsg'
}

export const APP_TYPE = {
    TEMPLATE: 0,
    PAD: 1,
    FILE_SHARE: 2,
    WHITEBOARD: 3,
    OFFLINE_PAD: 4
};

// possible type parameters of websocket messages sent by client
export const CLIENT_MSG_TYPE = {
    ACTIVITY: 'activity',
    NICKNAME_CHANGE: 'nicknameChange',
    FILE_LIST_REQUEST: 'fileListRequest',
    NEW_TAB: 'newTab',
    DELETE_TAB: 'deleteTab',
    TAB_NAME_CHANGE: 'tabNameChange',
    NEW_APP: 'newApp',
    APP_LIST_REQUEST: 'appListRequest',
    DELETE_APP: 'deleteApp'
};

// possible type parameters of websocket messages sent by server
// usable as pubsub-js topics for subscriptions
export const SERVER_MSG_TYPE = {
    USER_LIST: 'user_list',
    CURRENT_USER: 'current_user',
    NICKNAME_CHANGE: 'nickname_change',
    FILE_LIST: 'file_list',
    TAB_LIST: 'tab_list',
    NEW_APP: 'new_app',
    APP_LIST: 'app_list'
};


export function translateAppUrl(url) {
    for (const [key, value] of Object.entries(APP_URL_MAPPING)) {
        url = url.replace(key, value);
    }

    return url;
}

// https://stackoverflow.com/a/62916568
export function appendQueryParameter(url, name, value) {
    if (url.length === 0) {
        return;
    }

    let rawURL = url;

    // URL with `?` at the end and without query parameters
    // leads to incorrect result.
    if (rawURL.charAt(rawURL.length - 1) === "?") {
        rawURL = rawURL.slice(0, rawURL.length - 1);
    }

    const parsedURL = new URL(rawURL);
    let parameters = parsedURL.search;

    parameters += (parameters.length === 0) ? "?" : "&";
    parameters = `${parameters}${name}=${value}`;

    return `${parsedURL.origin}${parsedURL.pathname}${parameters}`;
}


export function getUrlFromEndpoint(protocol, endpoint) {
    return protocol + '://' + BACKEND_URL + '/' + endpoint;
}

export function fetchAPI(methodType, endpoint, data=null,
                         token=null, headers={'Content-Type': 'application/json'}, stringify_data=true) {
    let req_headers = {};
    if (headers) {
        req_headers = headers;
    }

    if (token !== null) {
        req_headers['Authorization'] = 'Token ' + token.toString()
    }

    let requestOptions = {
        method: methodType,
        headers: req_headers
    };

    if (data !== null) {
        if (stringify_data) {
            requestOptions.body = JSON.stringify(data);
        }
        else {
            requestOptions.body = data;
        }
    }

    return fetch(getUrlFromEndpoint('http', endpoint), requestOptions)
    .then(async response => {
        let data;

        try {
            data = await response.json()
        } catch (e) {
            throw response.status;
        }

        if (!response.ok) {
            throw JSON.stringify(data);
        }

        return data;
    })
    .catch(error => {
        if (error instanceof Error) {
            return {
                error: true,
                details: error.message
            }
        }

        return {
            error: true,
            details: error
        }
    });
}