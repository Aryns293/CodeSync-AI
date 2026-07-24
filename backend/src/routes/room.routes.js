import express from 'express';
import { createRoom, getRoom } from '../controllers/room.controller.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', optionalAuth, createRoom);
router.get('/:roomId', getRoom);

export default router;
