import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import roomRoutes from './routes/rooms.js';
import { store } from './store.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
}));

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/rooms', roomRoutes);

/* ------------------- Socket.IO ------------------- */

io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id);

    socket.on('join-room', ({ roomId, username }) => {
        socket.join(roomId);
        store.addUserToRoom(roomId, username);
        io.to(roomId).emit('user-joined', `${username} joined room #${roomId}`);
    });

    socket.on('chat-message', ({ roomId, username, message }) => {
        const msg = { user: username, text: message, timestamp: Date.now() };
        store.addChat(roomId, msg);
        io.to(roomId).emit('chat-message', msg);
    });

    socket.on('sync-playback', ({ roomId, time, paused }) => {
        store.updatePlayback(roomId, { time, paused });
        io.to(roomId).emit('sync-playback', { time, paused });
    });

    socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected:', socket.id);
    });
});

/* ------------------- Start Server ------------------- */

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
