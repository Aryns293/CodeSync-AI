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
    }
}, { timestamps: true });

export const Room = mongoose.model('Room', roomSchema);
