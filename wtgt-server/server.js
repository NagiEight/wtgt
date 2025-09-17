//Imports
const
    http = require("http"),
    ws = require("ws"),
    crypto = require("crypto"),
    fs = require("fs/promises"),
    path = require("path")
;

//Constants
const 
    PORT = 3000,
    rooms = {
        /**
         *  roomID (will be the same as the host's id): {
         *      currentMedia: "medianame.mp4",
         *      mods: [],
         *      members: [...memberIDs],
         *      isPaused: false,
         *      messages: {
         *          messageID: {
         *              Sender: memberID,
         *              Text: "hello world!",
         *              Timestamp: somethingsomething
         *          }
         *      }
         *  }
         */
    },
    members = {
        /**
         *  MemberID: {
         *      UserName: "Claire Iidea",
         *      In: roomID,
         *      Socket: wsObj,
         *      Avt: <byteString>
         *  }
        */
    },
    server = http.createServer((req, res) => {

    }),
    wss = new ws.Server({ server })
;

wss.on("connection", (client, req) => {
    const
        url = new URL(req.url, `ws://${req.headers.host}`),
        userProfile = {
            UserName: url.searchParams.get("UserName"), 
            Avt: url.searchParams.get("Avt")
        },
        IP = req.socket.remoteAddress,
        UserID = sha256Hash(IP)
    ;

    if(Object.keys(members).includes(UserID)) {
        return;
    }

    Logs.addEntry("", "connection", UserID);

    members[UserID] = {
        UserName: userProfile.UserName,
        In: "",
        Socket: client,
        Avt: userProfile.Avt
    }

    client.on("close", () => {
        Logs.addEntry("", "disconnection", UserID);
        delete members[UserID];
    });

    client.on("message", (message) => {
        const ContentJSON = JSON.parse(message.toString());
        const isInRoom = members[UserID].In !== "";

        switch(ContentJSON.type) {
            case "host":
                if(!isInRoom) {
                    members[UserID].In = UserID;
                    rooms[UserID] = {
                        currentMedia: ContentJSON.content.MediaName,
                        isPaused: ContentJSON.content.IsPaused,
                        mods: [],
                        members: [UserID],
                        messages: {}
                    }
                    Logs.addEntry(UserID, "host", UserID);
                }
                else {
                    sendError(client, `Member ${UserID} is already belong to a room.`);
                }
            break;

            case "join":
                if(!isInRoom) {
                    rooms[ContentJSON.content].members.push(UserID);
                    members[UserID].In = ContentJSON.content;

                    const currentRoom = rooms[ContentJSON.content];
                    const membersObj = {};

                    for(const memberID of currentRoom.members) {
                        membersObj[memberID] = {
                            UserName: members[memberID].UserName,
                            Avt: members[memberID].Avt
                        };
                    }

                    client.send(JSON.stringify({type: "init", content: {
                        CurrentMedia: currentRoom.MediaName,
                        IsPaused: currentRoom.IsPaused,
                        Mods: currentRoom.mods,
                        Members: membersObj,
                        Messages: currentRoom.messages
                    }}));

                    broadcastToRoom(members[UserID].In, {
                        type: "join",
                        content: {
                            UserID,
                            UserName: userProfile["UserName"],
                            Avt: userProfile["Avt"]
                        }
                    });
                    Logs.addEntry(members[UserID].In, "join", UserID);
                }
                else {
                    sendError(client, `Member ${UserID} is already belong to a room.`);
                }
            break;

            case "message":
                if(isInRoom) {
                    const MessageID = sha256Hash(UserID + ContentJSON.content + Object.keys(rooms[members[UserID].In].messages).length.toString());
                    const MessageObject = {
                        Sender: UserID,
                        Text: ContentJSON.content,
                        Timestamp: getCurrentTime()
                    };
                    
                    rooms[members[UserID].In].messages[MessageID] = MessageObject;

                    broadcastToRoom(members[UserID].In, {
                        type: "message",
                        content: {
                            MessageID,
                            MessageObject
                        }
                    });

                    Logs.addEntry(members[UserID].In, "message", UserID, { text: ContentJSON.content });
                }
                else {
                    sendError(client, `Member ${UserID} does not belong to a room.`);
                }
            break;

            case "election":
                const isMemberBelongToRoom = rooms[members[UserID].In].members.includes(ContentJSON.content);
                const isMemberAMod = rooms[members[UserID].In].mods.includes(ContentJSON.content);
                const isMemberHasPermission = members[UserID].In == UserID;

                if(isMemberBelongToRoom && !isMemberAMod && isMemberHasPermission) {
                    rooms[members[UserID].In].mods.push(ContentJSON.content);

                    broadcastToRoom(members[UserID].In, ContentJSON);
                    Logs.addEntry(members[UserID].In, "election", ContentJSON.content);
                }
                else if(isMemberHasPermission) {
                    sendError(client, `Insufficient permission.`);
                }
                else if(isMemberAMod) {
                    sendError(client, `Member ${ContentJSON.content} is already a moderator.`);
                }
                else {
                    sendError(client, `Unknown member ${ContentJSON.content}: Member does not exist or does not belong to this room.`);
                }
            break;
            
            case "leave":
                if(isInRoom) {
                    if(UserID === members[UserID].In) {
                        broadcastToRoom(members[UserID].In, {type: "end"});

                        for(const MemberID of rooms[members[UserID].In].members) {
                            members[MemberID].In = "";
                        }

                        delete rooms[members[UserID].In];
                    }
                    else {
                        rooms[members[UserID].In].members = rooms[members[UserID].In].members.filter(member => member !== UserID);
                        broadcastToRoom(members[UserID].In, {type: "leave", content: UserID});
                        members[UserID].In = "";
                        Logs.addEntry(members[UserID].In, "leave", UserID);
                    }
                }
                else {
                    sendError(client, `Member ${UserID} does not belong to a room.`);
                }
            break;

            case "pause":
                if(UserID === members[UserID].In) {
                    rooms[members[UserID].In].isPaused = ContentJSON.content;
                    broadcastToRoom(members[UserID].In, ContentJSON);
                    Logs.addEntry(members[UserID].In, "pause", UserID);
                }
                else {
                    sendError(client, "Insufficient permission.");
                }
            break;

            case "sync":
                if(UserID === members[UserID].In) {
                    broadcastToRoom(members[UserID].In, ContentJSON);
                    Logs.addEntry(members[UserID].In, "sync", UserID, { to: ContentJSON.content });
                }
                else {
                    sendError(client, "Insufficient permission.");
                }
            break;

            default:
                sendError(client, `Unknown request type: ${ContentJSON.type}`);
            break;
        }
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
 * 
 *  {
 *      type: "election",
 *      content: MemberID
 *  }
 */

server.listen(PORT, () => {
    console.log(`Hello World! Server's running at port: ${PORT}.`)
});

//classes
const Logs = class {
    /**
     * Server's log. Use addEntry instead of mutating this directly.
     */
    static logs = [
        /**
         *  {
         *      event: "host",
         *      user: userIP,
         *      target: roomID
         *      timestamp: getCurrentTime()
         *  },
         *  {
         *      event: "connection",
         *      user: userID,
         *      timestamp: getCurrentTime()
         *  },
         *  {
         *      event: "disconnection",
         *      user: userID,
         *      timestamp: getCurrentTime()
         *  },
         *  {
         *      event: "election",
         *      target: userID,
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

    /**
     * A list of predefined suffix for most logging event types. Don't mutate this, please.
     */
    static formatList = {
        connection: " connected.",
        disconnection: " disconnected.",
        election: " elected to modertor.",
        host: " hosted a new room.",
        join: " joined.",
        leave: " left.",
        pause: " paused."
    };
    
    static generateLogString = (logEntry, suffix) => {
        return `{${logEntry.roomID}}[${logEntry.timestamp}] ${logEntry.entryTarget}${suffix}\n`;
    };
    
    /**
     * Add a new entry to the logs.
     * 
     * @param {string} entryType 
     * @param {string} entryTarget 
     * @param {object} extras 
    */
    static addEntry = (roomID, entryType, entryTarget, extras = {}) => {
        const allowedEntryType = ["connection", "disconnection", "election", "host", "message", "join", "leave", "pause", "sync"];

        if(!allowedEntryType.includes(entryType)) {
            throw new TypeError(`Unknown entryType "${entryType}", please try again.`);
        }

        const logEntry = {
            event: entryType,
            entryTarget,
            roomID,
            ...extras,
            timestamp: getCurrentTime()
        };
        Logs.logs.push(logEntry);

        if(logEntry.event === "message") {
            console.log(Logs.generateLogString(logEntry, `: ${logEntry.text}`));
        }
        else if(logEntry.event === "sync") {
            console.log(Logs.generateLogString(logEntry, `: Skipped to ${logEntry.to}.`));
        }
        else {
            console.log(Logs.generateLogString(logEntry, Logs.formatList[logEntry.event]));
        }
    }

    static toString = () => {
        let output = "";

        Logs.logs.forEach(log => {
            if(log.event === "message") {
                output += Logs.generateLogString(log, `: ${log.text}`);
            }
            else if(logEntry.event === "sync") {
                output += Logs.generateLogString(logEntry, `: Skipped to ${logEntry.to}.`)
            }
            else {
                output += Logs.generateLogString(log, Logs.formatList[log.event]);
            }
        });

        return output.trim();
    }

    /**
     * Create a log file at logs.
     */
    static createLog = async () => {
        await fs.mkdir("logs", { recursive: true });
    
        const logstring = Logs.toString();
    
        let
            logID = sha256Hash(getCurrentTime()),
            fileName = `${logID}.log`,
            filePath = path.join("logs", fileName),
            counter = 1
        ;
    
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
    
        await fs.writeFile(filePath, logstring, "utf-8");
    };
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
};

/**
 * Returns a SHA-256 hash of the given content.
 */
const sha256Hash = (content) => {
    return crypto.createHash("sha256").update(content).digest("hex");
};

const broadcastToRoom = (RoomID, message) => {
    if(!rooms[RoomID])
        return;

    rooms[RoomID].members.forEach(memberID => {
        const member = members[memberID];
        if(member && member.socket.readyState === ws.OPEN) {
            member.Socket.send(JSON.stringify(message));
        }
    });
};

const sendError = (client, message) => {
    client.send(JSON.stringify({
        type: "error",
        content: message
    }));
};