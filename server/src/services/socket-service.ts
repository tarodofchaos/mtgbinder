import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info({ userId: socket.userId }, 'User connected to socket');

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join a trade session room
    socket.on('join-trade-session', (sessionCode: string) => {
      socket.join(`trade:${sessionCode}`);
      logger.info({ userId: socket.userId, sessionCode }, 'User joined trade session room');
    });

    // Leave a trade session room
    socket.on('leave-trade-session', (sessionCode: string) => {
      socket.leave(`trade:${sessionCode}`);
      logger.info({ userId: socket.userId, sessionCode }, 'User left trade session room');
    });

    socket.on('disconnect', () => {
      logger.info({ userId: socket.userId }, 'User disconnected from socket');
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
}

// Emit to all users in a trade session
export function emitToTradeSession(sessionCode: string, event: string, data: unknown): void {
  if (io) {
    io.to(`trade:${sessionCode}`).emit(event, data);
  }
}

// Emit to a specific user
export function emitToUser(userId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// Trade session events
export const TradeEvents = {
  USER_JOINED: 'trade:user-joined',
  USER_LEFT: 'trade:user-left',
  MATCHES_UPDATED: 'trade:matches-updated',
  SESSION_COMPLETED: 'trade:session-completed',
  SESSION_EXPIRED: 'trade:session-expired',
} as const;
