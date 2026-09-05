import { Room } from '../models/Room.model.js';

export const createRoom = async (req, res, next) => {
    try {
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
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
