import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, // Optional for backward compatibility with guests
    },
    language: {
        type: String,
        default: 'cpp',
    },
    code: {
        type: String,
        default: '// start coding here...',
    },
    // These fields are written by socket.service.js on every code change.
    // Defining them here prevents Mongoose strict mode from silently dropping them.
    lastModifiedBy: {
        type: String,
        default: null,
    },
    lastModifiedAt: {
        type: String, // ISO timestamp string (matches what the client sends)
        default: null,
    },
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
