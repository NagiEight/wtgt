/**
 * userprofileEditorBackend.js
 * 
 * A simple Node.js HTTP server for editing and saving user profiles for a local chat app.
 * 
 * Features:
 * - Exposes a POST /save endpoint to accept and save user profile data as JSON.
 * - Saves the received data to a specified file path.
 * 
 * Usage:
 * - Start the server and send a POST request with JSON body to /save.
 * - The server responds with success or error messages in JSON format.
 * 
 * Note:
 * - The writePath variable should be set to the desired file location for saving profiles.
 */

const
    http = require("http"),
    fs = require("fs/promises")
;

const writePath = ""; // Set this to the file path where user profiles should be saved

/**
 * HTTP server to handle profile saving requests.
 * 
 * Endpoints:
 *   POST /save - Accepts JSON data and writes it to the file specified by writePath.
 */
const server = http.createServer((req, res) => {
    if(req.url === "/save" && req.method === "POST") {
        let body;

        req.on("data", chunk => {
            body += chunk.toString();
        });
        
        req.on("end", () => {
            try {
                const jsonData = JSON.parse(body);

                fs.writeFile(writePath, JSON.stringify(jsonData, null, 4), err => {
                    if(err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'Failed to save data' }));
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Data saved successfully' }));
                });
            }
            catch(err) {

            }
        });
    }
    else {
        res.writeHead(404);
        res.end();
    }
});