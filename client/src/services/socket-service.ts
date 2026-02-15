import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const listeners: Set<(s: Socket | null) => void> = new Set();

export function initializeSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  // In dev mode, use relative path to benefit from Vite proxy
  // In production, the client and server are on the same origin
  socket = io({
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    notifyListeners();
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
    notifyListeners();
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  notifyListeners();
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    notifyListeners();
  }
}

export function subscribeToSocket(listener: (s: Socket | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => listener(socket));
}

export function joinTradeSessionRoom(sessionCode: string): void {
  if (!socket) {
    console.warn('Attempted to join trade session room without socket initialization');
    return;
  }
  socket.emit('join-trade-session', sessionCode);
}

export function leaveTradeSessionRoom(sessionCode: string): void {
  socket?.emit('leave-trade-session', sessionCode);
}

export const TradeEvents = {
  USER_JOINED: 'trade:user-joined',
  USER_LEFT: 'trade:user-left',
  MATCHES_UPDATED: 'trade:matches-updated',
  SESSION_COMPLETED: 'trade:session-completed',
  SESSION_EXPIRED: 'trade:session-expired',
  MESSAGE: 'trade-message',
  TYPING: 'trade-typing',
} as const;
