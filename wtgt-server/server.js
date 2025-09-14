
const
    http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    path = require("path")
;

const PORT = 3000;

const users = {
	/*	UserID: {
	 *		UserName: Claire Iidea,
	 *		avt: <bytestring>
	 *	}
	 * */
};

const messages = {
	/*	MessageID: {
	 *		SenderID: SenderID,
	 *		content: "Hello World!",
	 *		timestamp: somethingsomething
	 *	}
	 * */
};

const logs = [
    /**
     *  {
     *      event: "connection",
     *      user: userID,
     *      timestamp: getCurrentTime()
     *  }
     *  {
     *      event: "disconnection",
     *      user: userID,
     *      timestamp: getCurrentTime()
     *  },
     *  {
     *      event: "message",
     *      user: userID,
     *      text: "Hello World!",
     *      timestamp: getCurrentTime()
     *  }
     */
];

const server = http.createServer((req, res) => {

});

const wss = new ws.Server({server});

wss.on("connection", (client, req) => {
	const IP = req.socket.remoteAddress;
	const UserID = sha256Hash(IP);

    logs.push({
        event: "connection",
        user: UserID,
        timestamp: getCurrentTime()
    });

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
				const msgID = sha256Hash(UserID.concat(ContentJSON.content, Object.keys(messages).length.toString()));

				const msgObj = {
					SenderID: UserID,
					content: ContentJSON.content,
					timestamp: getCurrentTime()
				}

                logs.push({
                    event: "message",
                    user: UserID,
                    text: ContentJSON.content,
                    timestamp: getCurrentTime()
                });

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

    client.on("close", () => {
        console.log(`${UserID} disconnected.`)
        logs.push({
            event: "disconnection",
            user: UserID,
            timestamp: getCurrentTime()
        });
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

server.on("close", createLog);

server.on('error', (err) => {
    console.error('Server error:', err);
    shutdown();
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown();
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    shutdown();
});

const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        createLog();
        console.log('All connections closed, exiting.');
        process.exit(0);
    });
}
  

const createLog = async () => {
    await fs.mkdir("logs", { recursive: true });
    let logID = sha256Hash(getCurrentTime());
    let logstring = [];

    logs.forEach((log) => {
        if(log.event === "connection") {
            logstring.push(`[${log.timestamp}] ${log.user} connected.`);
        }
        else if(log.event === "disconnection") {
            logstring.push(`[${log.timestamp}] ${log.user} disconnected.`);
        }
        else if(log.event === "message") {
            logstring.push(`[${log.timestamp}] ${log.user}: ${log.text}`);
        }
    });

    let fileName = `${logID}.log`;
    let filePath = path.join("logs", fileName);

    let counter = 1;
    while(true) {
        try {
            await fs.access(filePath);

            fileName = `${logID}_${counter}.log`;
            filePath = path.join("logs", fileName);
            ++counter;
        }
        catch {
            break;
        }
    }

    await fs.writeFile(filePath, logstring.join("\n"), "utf-8");
};

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

const sha256Hash = (content) => {
    return crypto.createHash("sha256").update(content).digest("hex");
}