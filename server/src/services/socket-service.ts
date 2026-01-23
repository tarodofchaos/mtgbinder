import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.clientUrl,
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
      const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
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
      try {
        if (!sessionCode || typeof sessionCode !== 'string') {
          socket.emit('error', { message: 'Invalid session code' });
          return;
        }

        const sanitizedCode = sessionCode.toUpperCase().slice(0, 10);
        socket.join(`trade:${sanitizedCode}`);
        logger.info({ userId: socket.userId, sessionCode: sanitizedCode }, 'User joined trade session room');
      } catch (error) {
        logger.error({ error, userId: socket.userId, sessionCode }, 'Failed to join trade session');
        socket.emit('error', { message: 'Failed to join session' });
      }
    });

    // Leave a trade session room
    socket.on('leave-trade-session', (sessionCode: string) => {
      try {
        if (!sessionCode || typeof sessionCode !== 'string') {
          return;
        }

        const sanitizedCode = sessionCode.toUpperCase().slice(0, 10);
        socket.leave(`trade:${sanitizedCode}`);
        logger.info({ userId: socket.userId, sessionCode: sanitizedCode }, 'User left trade session room');
      } catch (error) {
        logger.error({ error, userId: socket.userId, sessionCode }, 'Failed to leave trade session');
      }
    });

    // Handle errors on the socket
    socket.on('error', (error) => {
      logger.error({ error, userId: socket.userId }, 'Socket error');
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId: socket.userId, reason }, 'User disconnected from socket');
    });
  });

  // Handle server-level errors
  io.engine.on('connection_error', (error) => {
    logger.error({ error }, 'Socket.IO connection error');
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
