// @ts-check

/**
 * @param {string} mediaName
 * @param {WebSocket} ws
 */
const host = async ( mediaName, ws ) => {
    ws.send(JSON.stringify({ type: "host", content: mediaName }));
}

/**
 * @param {string} roomID
 * @param {WebSocket} ws
 */
const join = async (roomID, ws) => {
    ws.send(JSON.stringify({ type: "join", content: roomID }));
}

/**
 * @param {WebSocket} ws
 */
const leave = (ws) => {
    ws.send(JSON.stringify({ type: "leave" }));
}

export {
    host,
    join,

}