import express from 'express';
import { createRoom, getRoom } from '../controllers/room.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

router.post('/', apiLimiter, protect, createRoom);
router.get('/:roomId', apiLimiter, protect, getRoom);

export default router;
