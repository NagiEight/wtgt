import http from "http";
import ws, { OPEN } from "ws";
import crypto from "crypto";

const users = {
    /*  "UserID": {
     *      "UserName": Claire Iidea,
     *      "avt": <bytes>
     *  }
     * */
};

const messages = {
    /*  "MessageID": {
     *      "SenderID": SenderID,
     *      "content": "Hello World!",
     *      "timestamp": somethingsomething
     *  }
     * */
};

const server = http.createServer((req, res) => {
    
});

const wss = new ws.Server({server});

wss.on("connection", (client, req) => {
    const IP = req.socket.remoteAddress;
    const UserID = crypto.createHash("sha256").update(IP).digest("hex");

    console.log(`New connection fron ${IP}.`);
    client.send(JSON.stringify(messages));
    client.send(JSON.stringify())
     

    client.on("message", (content, isBinary) => {
        if(isBinary) {
            users[UserID].avt = content;
        }
        else {
            const ContentJSON = JSON.parse(content.toString());

            if(ContentJSON.type === "message") {
                messages[
                    crypto.createHash("sha256")
                        .update(UserID.concat(ContentJSON.content, Object.keys(messages).length.toString()))
                        .digest("hex")
                ] = {
                    "SenderID": UserID,
                    "content": ContentJSON.content,
                    "timestamp": Date.now()
                }

                Object.entries(users).forEach(([userId, userinfo]) => {
                    if(users)
                });
            }
            else if(ContentJSON.type === "member") {
                users[UserID].UserName = ContentJSON.UserName
            }
            else {
                client.send(`Unknown content type: ${ContentJSON.type}.`)
            }
        }
    });
});

/*  {
 *      "type": "message"
 *      "content": "hello world!"
 *  }
 * */

/*  {
 *      "type": "member",
 *      "UserName": "Claire Iidea"
 *  }
 * */
