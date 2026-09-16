import { Room } from '../models/Room.model.js';
import { randomUUID } from 'crypto';

export const createRoom = async (req, res, next) => {
    try {
        // Fix #9: Math.random() produces 6-digit IDs (~900K possibilities) — trivially enumerable.
        // crypto.randomUUID() generates a 128-bit cryptographically random UUID (v4).
        const roomId = randomUUID();
        const room = await Room.create({
            roomId,
            owner: req.user._id,
        });

        res.status(201).json({ success: true, room });
    } catch (error) {
        next(error);
    }
};

export const getRoom = async (req, res, next) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });
        if (!room) {
            return res.status(404).json({ success: false, message: 'Room not found' });
        }
        res.status(200).json({ success: true, room });
    } catch (error) {
        next(error);
    }
};
