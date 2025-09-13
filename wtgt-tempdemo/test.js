const http = require("http");
const ws = require("ws");
const crypto = require("crypto");

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("WebSocket chat server is running\n");
});

const wss = new ws.Server({ server });

const messages = {
	/**
	 *	"messageID": {
	 *		sender: senderID,
	 *		text: message,
	 *		timestamp: somethingsomething
	 *	}
	 */
};

wss.on("connection", (ws, req) => {
    console.log("New client connected");
	const IP = req.socket.remoteAddress;
	const userID = crypto.createHash("sha256").update(IP).digest("hex");

    ws.send(JSON.stringify(wsRequestWrapper("init", messages)));
    ws.on("message", (message) => {
        const ContentJSON = JSON.parse(message);
		console.log(message.toString());
		const msgID = crypto.createHash("sha256")
				.update(userID.concat(ContentJSON.content, Object.keys(messages).length.toString()))
				.digest("hex");

		const msgObj = {
			sender: userID,
			text: ContentJSON.content,
			timestamp: getCurrentTime()
		}
		
		messages[msgID] = msgObj;

        wss.clients.forEach((client) => {
            if(client.readyState === ws.OPEN) {
                client.send(JSON.stringify(wsRequestWrapper("chat", msgObj)));
            }
        });
	});

	ws.on("close", () => {
    	console.log("Client disconnected");
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

const getCurrentTime = () => {
	const now = new Date();
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
	const year = now.getFullYear();

	const formatted = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;

	return formatted;
}

const wsRequestWrapper = (type, content) => {
	return {type, content};
}