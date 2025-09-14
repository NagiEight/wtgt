/**
 * server.js
 * 
 * Backend server for a local chat application.
 * 
 * Features:
 * - HTTP server (currently unused, but can be extended for REST endpoints)
 * - WebSocket server for real-time chat communication
 * - User and message management in-memory
 * - Logging of connections, disconnections, and messages
 * - Graceful shutdown and persistent log file creation
 * 
 * Data Structures:
 * - users: Stores user information keyed by UserID
 * - messages: Stores chat messages keyed by MessageID
 * - logs: Stores event logs for connections, disconnections, and messages
 * 
 * WebSocket Message Types:
 * - "init": Initial data sent to client after connection
 * - "message": Chat message
 * - "member": User profile/name update
 * - "avt": Avatar image update (binary)
 * - "pause": Media pause/resume state
 * - "media": Media change event
 * 
 * Logging:
 * - Logs are saved to the "logs" directory on shutdown or server close.
 * 
 * Error Handling:
 * - Handles server errors, uncaught exceptions, and unhandled promise rejections.
 */

const
    http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    path = require("path")
;

const PORT = 3000;

// In-memory user storage
const users = {
	/**
     *  UserID: {
	 *		UserName: Claire Iidea,
	 *		avt: <bytestring>
	 *	}
	 */
};

// In-memory message storage
const messages = {
	/**
     *	MessageID: {
	 *		SenderID: SenderID,
	 *		content: "Hello World!",
	 *		timestamp: somethingsomething
	 *	}
	 */
};

// Event logs for connections, disconnections, and messages
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

// HTTP server (can be extended for REST endpoints)
const server = http.createServer((req, res) => {

});

// Media state for chat room
let currentMedia = "";
let isPaused = false;

// WebSocket server for real-time communication
const wss = new ws.Server({server});

/**
 * Handles new WebSocket connections.
 * Assigns a UserID based on client IP, sends initial data, and listens for messages.
 */
wss.on("connection", (client, req) => {
	const IP = req.socket.remoteAddress;
	const UserID = sha256Hash(IP);

    logs.push({
        event: "connection",
        user: UserID,
        timestamp: getCurrentTime()
    });

	console.log(`New connection fron ${IP}.`);
	client.send(JSON.stringify({ type: "init", content: { messages, users,  }}));

    // Handle incoming messages from client
	client.on("message", (content, isBinary) => {
        console.log(`Incoming request from: ${UserID}`);

		if(isBinary) {
			// Handle avatar image upload (binary data)
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
				// Handle chat message
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
				// Handle user profile/name update
				users[UserID].UserName = ContentJSON.content;
				const ContentJSON = {
					type: "member",
					content: {
						UserID,
						UserName: ContentJSON.content
					}
				}
			}
            else if(ContentJSON.type === "pause") {
                // Handle media pause/resume state
                isPaused = ContentJSON.paused;
                wss.clients.forEach((c) => {
                    c.send(ContentJSON.content.toString());
                });
            }
            else if(ContentJSON.type === "media") {
                // Handle media change event
                currentMedia = ContentJSON.media;
                
            }
			else {
				client.send(`Unknown content type: ${ContentJSON.type}.`)
			}
		}
	});

    // Handle client disconnection
    client.on("close", () => {
        console.log(`${UserID} disconnected.`)
        logs.push({
            event: "disconnection",
            user: UserID,
            timestamp: getCurrentTime()
        });
    });
});

/**
 * Example WebSocket message formats:
 * 
 *  {
 *      type: "message",
 *      content: "hello world!"
 *  }
 * 
 *  {
 *      type: "member",
 *      content: "Claire Iidea" 
 *  }
 * 
 *  {
 *      type: "pause",
 *      content: false
 *  }
 */

// Start HTTP/WebSocket server
server.listen(PORT, () => {
	console.log(`Hello World! Server's running at port ${PORT}.`)
});

// Log creation and shutdown handling
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

/**
 * Gracefully shuts down the server and writes logs to disk.
 */
const shutdown = () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        createLog();
        console.log('All connections closed, exiting.');
        process.exit(0);
    });
}
  
/**
 * Writes the event logs to a uniquely named file in the "logs" directory.
 */
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

/**
 * Returns the current time as a formatted string.
 */
const getCurrentTime = () => {
	const
        now = new Date(),
        hours = String(now.getHours()).padStart(2, '0'),
        minutes = String(now.getMinutes()).padStart(2, '0'),
        seconds = String(now.getSeconds()).padStart(2, '0'),
        day = String(now.getDate()).padStart(2, '0'),
        month = String(now.getMonth() + 1).padStart(2, '0'), 
        year = now.getFullYear()
    ;

	const formatted = `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;

	return formatted;
}

/**
 * Returns a SHA-256 hash of the given content.
 */
const sha256Hash = (content) => {
    return crypto.createHash("sha256").update(content).digest("hex");
}