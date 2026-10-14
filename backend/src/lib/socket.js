import Chat from '../models/Chat.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

let io = null;

async function currentSocketUser(token) {
  const decoded = verifyToken(token);
  if (decoded.role === 'customer' || decoded.role === 'organizer') {
    if (!mongoose.Types.ObjectId.isValid(decoded.sub)) throw new Error('Invalid account');
    const user = await User.findById(decoded.sub).select('email status sessionVersion isOrganizer');
    if (!user || user.status !== 'Active' || (decoded.sessionVersion || 0) !== (user.sessionVersion || 0)) throw new Error('Revoked account');
    if (decoded.role === 'organizer' && !user.isOrganizer) throw new Error('Removed organizer');
    decoded.email = user.email;
  }
  return decoded;
}

export function disconnectUser(email) {
  io?.in(`user:${String(email).toLowerCase().trim()}`).disconnectSockets(true);
}

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
  io.use(async (socket, next) => {
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
      const decoded = await currentSocketUser(token);
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
    socket.on('authenticate', async (token) => {
      try {
        const decoded = await currentSocketUser(token);
        for (const room of socket.rooms) { if (room !== socket.id) socket.leave(room); }
        socket.user = decoded;
        if (decoded?.email) {
          const userRoom = `user:${decoded.email.toLowerCase().trim()}`;
          socket.join(userRoom);
          socket.emit('authenticated', { email: decoded.email, role: decoded.role });
        }
      } catch (e) {
        for (const room of socket.rooms) { if (room !== socket.id) socket.leave(room); }
        socket.user = null;
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    });

    // Join a specific trip or chat room
    socket.on('join_chat', async (data, acknowledge) => {
      const reply = (allowed) => { if (typeof acknowledge === 'function') acknowledge(allowed); };
      if (!socket.user?.email) return reply(false);
      const tripId = data?.tripId;
      const chatId = data?.chatId;
      if (!tripId && !chatId) return reply(false);
      try {
        const chat = await Chat.findOne({
          ...(chatId ? { _id: chatId } : {}), ...(tripId ? { tripId } : {}),
          $or: [{ userEmail: socket.user.email }, { organizerEmail: socket.user.email }],
        }).select('tripId');
        if (!chat) return reply(false);
        if (tripId) socket.join(`trip:${chat.tripId}`);
        socket.join(`chat:${chat._id}`);
        reply(true);
      } catch { reply(false); }
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
      if (tripId && socket.rooms.has(`trip:${tripId}`)) {
        socket.to(`trip:${tripId}`).emit('typing', payload);
      }
      if (chatId && socket.rooms.has(`chat:${chatId}`)) {
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
  // Different customers can chat about the same trip. Private message bodies
  // belong to one conversation, not to everyone subscribed to that trip.
  if (data?.chatId) io.to(`chat:${data.chatId}`).emit(event, data);
}

/**
 * Emits an event to all devices/tabs belonging to a specific user or organizer email
 */
export function emitToUser(email, event, data) {
  if (!io || !email) return;
  const userRoom = `user:${String(email).toLowerCase().trim()}`;
  io.to(userRoom).emit(event, data);
}

