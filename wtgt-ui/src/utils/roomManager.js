let ws = null;
let messageContent = '';
export const initSocket = (serverIp) => {
    if (!ws || ws.readyState === WebSocket.CLOSED) {
        ws = new WebSocket(serverIp);
    }
    if (ws) {

        ws.onopen = () => {
            console.log('WebSocket connection established.');
        };

        return ws;
    }
    else {
        console.error('Failed to initialize WebSocket:', error);
        return null;
    }
};


export const getSocket = () => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not ready. Call initSocket first.');
        // navigate('/');
        return null;
    }
    return ws;
};

/**
 * @param {string} MediaName
 * @param {bool} IsPaused 
 */
const host = async (MediaName, IsPaused) => {
    console.log('sending: ', JSON.stringify({ type: "host", content: { MediaName: MediaName, IsPaused: IsPaused } }));
    ws.send(JSON.stringify({ type: "host", content: { MediaName: MediaName, IsPaused: IsPaused } }));
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        alert('Failed to connect to server. Please check the IP and try again.');
    }
    ws.onmessage = (message) => {
        MediaName = JSON.parse(message.data).content.CurrentMedia;
        console.log('Received message:', MediaName);
    }
}


/**
 * @param {string} roomID
 */
const join = async (roomID) => {
    console.log('sending: ', JSON.stringify({ type: "join", content: roomID }));
    ws.send(JSON.stringify({ type: "join", content: roomID }));
    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        alert('Failed to connect to server. Please check the IP and try again.');
    }

    ws.onmessage = (message) => {
        messageContent = JSON.parse(message.data).content;
        console.log('Received message:', messageContent);
    }
}

const getMediaName = () => {
    return messageContent;
}


const leave = () => {
    console.log('sending: ', JSON.stringify({ type: "leave" }));
    ws.send(JSON.stringify({ type: "leave" }));
    ws.onmessage = (message) => {
        console.log('Received message:', message.data);
    }
}

export {
    host,
    join,
    leave,
    getMediaName
}