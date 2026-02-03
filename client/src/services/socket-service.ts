import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function initializeSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io({
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinTradeSessionRoom(sessionCode: string): void {
  socket?.emit('join-trade-session', sessionCode);
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
