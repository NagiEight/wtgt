import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
    roomId: String,
    host: String,
    videoPath: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Room', RoomSchema);
