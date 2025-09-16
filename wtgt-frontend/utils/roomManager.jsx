// @ts-check

/**
 * @param {string} mediaName
 * @param {WebSocket} ws
 */
const host = async ( mediaName, ws ) => {
    ws.send(JSON.stringify({type: "host", content: mediaName}));
}

/**
 * @param {string} roomID
 * @param {string} userName
 * @param {string} password
 */
const join = async (roomID, userName, password) => {
    
}

export {
    host,

}