import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { config } from '../utils/config';
import { prisma } from '../utils/prisma';
import { activeSocketConnections } from '../utils/metrics';

let io: Server | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

interface TradeMessagePayload {
  sessionCode: string;
  content: string;
}

interface TradeTypingPayload {
  sessionCode: string;
  isTyping: boolean;
}

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: config.isProduction ? true : config.clientUrl,
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
    activeSocketConnections.inc();
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

    // Send message in trade session
    socket.on('trade-message', async (payload: TradeMessagePayload) => {
      try {
        if (!payload.sessionCode || !payload.content || typeof payload.content !== 'string') {
          socket.emit('error', { message: 'Invalid message data' });
          return;
        }

        const sanitizedCode = payload.sessionCode.toUpperCase().slice(0, 10);
        const trimmedContent = payload.content.trim();

        if (!trimmedContent || trimmedContent.length > 1000) {
          socket.emit('error', { message: 'Message must be between 1 and 1000 characters' });
          return;
        }

        // Find the session
        const session = await prisma.tradeSession.findUnique({
          where: { sessionCode: sanitizedCode },
          select: { id: true, initiatorId: true, joinerId: true },
        });

        if (!session) {
          socket.emit('error', { message: 'Trade session not found' });
          return;
        }

        // Verify user is part of the session
        if (session.initiatorId !== socket.userId && session.joinerId !== socket.userId) {
          socket.emit('error', { message: 'Not authorized to send messages in this session' });
          return;
        }

        // Save message to database
        const message = await prisma.tradeMessage.create({
          data: {
            sessionId: session.id,
            senderId: socket.userId!,
            content: trimmedContent,
          },
          include: {
            sender: {
              select: { id: true, displayName: true, shareCode: true },
            },
          },
        });

        // Broadcast message to all users in the trade room
        io?.to(`trade:${sanitizedCode}`).emit('trade-message', message);

        logger.info({ userId: socket.userId, sessionCode: sanitizedCode }, 'Trade message sent');
      } catch (error) {
        logger.error({ error, userId: socket.userId }, 'Failed to send trade message');
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('trade-typing', async (payload: TradeTypingPayload) => {
      try {
        if (!payload.sessionCode || typeof payload.isTyping !== 'boolean') {
          return;
        }

        const sanitizedCode = payload.sessionCode.toUpperCase().slice(0, 10);

        // Verify user is part of the session
        const session = await prisma.tradeSession.findUnique({
          where: { sessionCode: sanitizedCode },
          select: { initiatorId: true, joinerId: true },
        });

        if (!session || (session.initiatorId !== socket.userId && session.joinerId !== socket.userId)) {
          return;
        }

        // Broadcast typing indicator to other users in the room (not to self)
        socket.to(`trade:${sanitizedCode}`).emit('trade-typing', {
          userId: socket.userId,
          isTyping: payload.isTyping,
        });
      } catch (error) {
        logger.error({ error, userId: socket.userId }, 'Failed to handle typing indicator');
      }
    });

    // Handle errors on the socket
    socket.on('error', (error) => {
      logger.error({ error, userId: socket.userId }, 'Socket error');
    });

    socket.on('disconnect', (reason) => {
      activeSocketConnections.dec();
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
  SELECTION_UPDATED: 'trade:selection-updated',
  SESSION_COMPLETED: 'trade:session-completed',
  SESSION_EXPIRED: 'trade:session-expired',
  MESSAGE: 'trade-message',
  TYPING: 'trade-typing',
} as const;
