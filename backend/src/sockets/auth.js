import jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import { User } from '../models/User.model.js';

// Runs before any event handler. Verifies the httpOnly JWT cookie and
// attaches a server-trusted user object to the socket — client-supplied
// identity is never trusted.
export const socketAuth = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = cookies.jwt;

    if (!token) {
      const err = new Error('Authentication error: no token provided');
      err.data = { code: 'AUTH_REQUIRED' };
      return next(err);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      const err = new Error('Authentication error: user not found');
      err.data = { code: 'AUTH_REQUIRED' };
      return next(err);
    }

    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
    next();
  } catch {
    const err = new Error('Authentication error: invalid token');
    err.data = { code: 'AUTH_REQUIRED' };
    next(err);
  }
};
