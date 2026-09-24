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
      return next(new Error('Authentication error: no token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      return next(new Error('Authentication error: user not found'));
    }

    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
    next();
  } catch {
    next(new Error('Authentication error: invalid token'));
  }
};
