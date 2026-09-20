import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
      socket.handshake.query?.token;

    if (!token) {
      // Allow unauthenticated connection but flag it
      socket.user = null;
      return next();
    }

    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      return next();
    } catch (err) {
      // Invalid token, continue as unauthenticated
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    // If authenticated, join user's private notification/chat room
    if (socket.user?.email) {
      const userRoom = `user:${socket.user.email.toLowerCase().trim()}`;
      socket.join(userRoom);
    }

    // Dynamic authentication for clients logging in after socket connects
    socket.on('authenticate', (token) => {
      try {
        const decoded = verifyToken(token);
        socket.user = decoded;
        if (decoded?.email) {
          const userRoom = `user:${decoded.email.toLowerCase().trim()}`;
          socket.join(userRoom);
          socket.emit('authenticated', { email: decoded.email, role: decoded.role });
        }
      } catch (e) {
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    });

    // Join a specific trip or chat room
    socket.on('join_chat', (data) => {
      const tripId = data?.tripId;
      const chatId = data?.chatId;
      if (tripId) {
        socket.join(`trip:${tripId}`);
      }
      if (chatId) {
        socket.join(`chat:${chatId}`);
      }
    });

    // Leave a specific trip or chat room
    socket.on('leave_chat', (data) => {
      const tripId = data?.tripId;
      const chatId = data?.chatId;
      if (tripId) {
        socket.leave(`trip:${tripId}`);
      }
      if (chatId) {
        socket.leave(`chat:${chatId}`);
      }
    });

    // Typing indicator
    socket.on('typing', ({ tripId, chatId, isTyping }) => {
      const payload = {
        sender: socket.user?.email || 'Anonymous',
        isTyping: Boolean(isTyping),
        tripId,
        chatId,
      };
      if (tripId) {
        socket.to(`trip:${tripId}`).emit('typing', payload);
      }
      if (chatId) {
        socket.to(`chat:${chatId}`).emit('typing', payload);
      }
    });

    socket.on('disconnect', () => {
      // Clean up handled automatically by Socket.IO
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/**
 * Emits an event to all clients currently inside a trip's chat room
 */
export function emitToChat(tripId, event, data) {
  if (!io || !tripId) return;
  io.to(`trip:${tripId}`).emit(event, data);
}

/**
 * Emits an event to all devices/tabs belonging to a specific user or organizer email
 */
export function emitToUser(email, event, data) {
  if (!io || !email) return;
  const userRoom = `user:${String(email).toLowerCase().trim()}`;
  io.to(userRoom).emit(event, data);
}

