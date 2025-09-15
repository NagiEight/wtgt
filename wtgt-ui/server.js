import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import { createClient } from 'redis';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import Room from './models/Room.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({
    origin: 'http://localhost:5173', // or wherever your frontend runs
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

// Redis
const redis = createClient({ url: process.env.REDIS_URL });
redis.on('error', err => console.error('❌ Redis error:', err));
await redis.connect();

// Multer
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, 'uploads/'),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

/* ------------------- API Routes ------------------- */

// Host a room
app.post('/host', upload.single('video'), async (req, res) => {
    const { roomId, host } = req.body;
    const videoPath = req.file?.path;

    if (!roomId || !host || !videoPath) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const room = new Room({ roomId, host, videoPath });
    await room.save();

    await redis.hSet(`room:${roomId}`, {
        host,
        videoPath,
        createdAt: Date.now()
    });
    await redis.expire(`room:${roomId}`, 7200); // 2-hour TTL

    res.status(200).json({ message: 'Room hosted', roomId, videoPath });
});

// Join a room
app.post('/join', async (req, res) => {
    const { roomId, username } = req.body;
    const roomData = await redis.hGetAll(`room:${roomId}`);

    if (!roomData?.host) {
        return res.status(404).json({ error: 'Room not found' });
    }

    await redis.sAdd(`room:${roomId}:users`, username);
    res.status(200).json({ message: `Joined room #${roomId}`, host: roomData.host });
});

// Stream video
app.get('/stream/:roomId', async (req, res) => {
    const roomData = await redis.hGetAll(`room:${req.params.roomId}`);
    if (!roomData?.videoPath) return res.sendStatus(404);

    const filePath = path.resolve(roomData.videoPath);
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4'
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4'
        });
        fs.createReadStream(filePath).pipe(res);
    }
});

// Download video
app.get('/download/:roomId', async (req, res) => {
    const roomData = await redis.hGetAll(`room:${req.params.roomId}`);
    if (!roomData?.videoPath) return res.sendStatus(404);

    res.download(roomData.videoPath);
});

/* ------------------- Socket.IO ------------------- */

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('join-room', async ({ roomId, username }) => {
        socket.join(roomId);
        await redis.sAdd(`room:${roomId}:users`, username);
        io.to(roomId).emit('user-joined', `${username} joined room #${roomId}`);
    });

    socket.on('chat-message', async ({ roomId, username, message }) => {
        const msg = { user: username, text: message, timestamp: Date.now() };
        await redis.rPush(`room:${roomId}:chat`, JSON.stringify(msg));
        io.to(roomId).emit('chat-message', msg);
    });

    socket.on('sync-playback', async ({ roomId, time, paused }) => {
        await redis.hSet(`room:${roomId}:playback`, { time, paused });
        io.to(roomId).emit('sync-playback', { time, paused });
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

/* ------------------- Start Server ------------------- */

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
