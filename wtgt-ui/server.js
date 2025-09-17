import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = {}; // In-memory store: roomId -> { username, fileName }

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'host') {
                const { roomId, username, fileName } = data;

                rooms[roomId] = { username, fileName };
                console.log(`Room ${roomId} hosted by ${username} with video ${fileName}`);

                ws.send(JSON.stringify({
                    type: 'host_ack',
                    roomId,
                    message: 'Room hosted successfully',
                }));
            }
        } catch (err) {
            console.error('Invalid message:', err);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

app.get('/', (req, res) => {
    res.send('Video hosting backend is running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
