import { io } from 'socket.io-client';
import { getToken } from './apiClient';

let socket = null;

function getSocketUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL || '';
  if (!raw) {
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:4000';
      }
      return window.location.origin;
    }
    return 'http://localhost:4000';
  }
  return raw.replace(/\/api\/v1\/?$/, '');
}

export function getSocket() {
  if (!socket) {
    const token = getToken();
    const url = getSocketUrl();

    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      const currentToken = getToken();
      if (currentToken) {
        socket.emit('authenticate', currentToken);
      }
    });
  }
  return socket;
}

export function updateSocketAuth(token) {
  const s = getSocket();
  if (s) {
    s.auth = { token };
    if (s.connected) {
      s.emit('authenticate', token);
    } else {
      s.connect();
    }
  }
}

export function joinChatRoom(tripId, chatId) {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('join_chat', { tripId, chatId });
  } else if (s) {
    s.once('connect', () => {
      s.emit('join_chat', { tripId, chatId });
    });
  }
}

export function leaveChatRoom(tripId, chatId) {
  const s = getSocket();
  if (s && s.connected) {
    s.emit('leave_chat', { tripId, chatId });
  }
}

export default getSocket;
