
const http = require("http");
const ws = require("ws");
const crypto = require("crypto");

const PORT = 3000;

const users = {
	/*	"UserID": {
	 *		"UserName": Claire Iidea,
	 *		"avt": <bytestring>
	 *	}
	 * */
};

const messages = {
	/*	"MessageID": {
	 *		"SenderID": SenderID,
	 *		"content": "Hello World!",
	 *		"timestamp": somethingsomething
	 *	}
	 * */
};

const server = http.createServer((req, res) => {

});

const wss = new ws.Server({server});

wss.on("connection", (client, req) => {
	const IP = req.socket.remoteAddress;
	const UserID = crypto.createHash("sha256").update(IP).digest("hex");

	console.log(`New connection fron ${IP}.`);
	client.send(JSON.stringify({ type: "init", messages, users }));

	client.on("message", (content, isBinary) => {
        console.log(`Incoming request from: ${UserID}`);

		if(isBinary) {
			users[UserID].avt = content.toString("base64");
			wss.clients.forEach((c) => {
				if(c.readyState === ws.OPEN) {
					const toSendJSON = {
						type: "avt",
						content: {
							UserID,
							avt: content.toString("base64")
						}
					}

					c.send(JSON.stringify(toSendJSON));
				}
			});
		}
		else {
			const ContentJSON = JSON.parse(content.toString());
			if(ContentJSON.type === "message") {
				const msgID = crypto.createHash("sha256")
						.update(UserID.concat(ContentJSON.content, Object.keys(messages).length.toString()))
						.digest("hex");

				const msgObj = {
					SenderID: UserID,
					content: ContentJSON.content,
					timestamp: getCurrentTime()
				}

				messages[msgID] = msgObj;

				wss.clients.forEach((c) => {
					if(c.readyState === ws.OPEN) {
						const toSendJSON = {
							type: "message",
							content: {
								info: msgObj
							}
						}

						c.send(JSON.stringify(toSendJSON));
					}
				});
			}
			else if(ContentJSON.type === "member") {
				users[UserID].UserName = ContentJSON.UserName;
				const ContentJSON = {
					type: "member",
					content: {
						UserID,
						UserName: ContentJSON.UserName
					}
				}
			}
			else {
				client.send(`Unknown content type: ${ContentJSON.type}.`)
			}
		}
	});
});

/*	{
 *		"type": "message"
 *		"content": "hello world!"
 *	}
 * */

/*	{
 *		"type": "member",
 *		"UserName": "Claire Iidea"
 *	}
 * */

server.listen(PORT, () => {
	console.log(`Hello World! Server's running at port ${PORT}.`)
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