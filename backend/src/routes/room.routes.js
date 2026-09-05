import express from 'express';
import { createRoom, getRoom } from '../controllers/room.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', protect, createRoom);
router.get('/:roomId', protect, getRoom);

export default router;
