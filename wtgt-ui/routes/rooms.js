import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { store } from '../store.js';

const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, 'uploads/'),
    filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Host a room
router.post('/host', upload.single('video'), (req, res) => {
    const { roomId, host } = req.body;
    const videoPath = req.file?.path;

    if (!roomId || !host || !videoPath) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    store.setRoom(roomId, { host, videoPath });

    // Set cleanup after 2 hours
    setTimeout(() => store.cleanupRoom(roomId), 7200000);

    res.status(200).json({ message: 'Room hosted', roomId, videoPath });
});

// Join a room
router.post('/join', (req, res) => {
    const { roomId, username } = req.body;
    const roomData = store.getRoom(roomId);

    if (!roomData?.host) {
        return res.status(404).json({ error: 'Room not found' });
    }

    store.addUserToRoom(roomId, username);
    res.status(200).json({ message: `Joined room #${roomId}`, host: roomData.host });
});

// Stream video
router.get('/stream/:roomId', (req, res) => {
    const roomData = store.getRoom(req.params.roomId);
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
router.get('/download/:roomId', (req, res) => {
    const roomData = store.getRoom(req.params.roomId);
    if (!roomData?.videoPath) return res.sendStatus(404);

    res.download(roomData.videoPath);
});

export default router;