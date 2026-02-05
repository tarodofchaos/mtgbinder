import { Router, Response } from 'express';
import { customAlphabet } from 'nanoid';
import { TradeSessionStatus, NotificationType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { computeTradeMatches } from '../services/match-service';
import { emitToTradeSession, emitToUser } from '../services/socket-service';

const router = Router();
const generateSessionCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

router.use(authMiddleware);

router.post('/session', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { withUserId } = req.body;

    // Clean up any expired sessions for this user
    await prisma.tradeSession.updateMany({
      where: {
        initiatorId: req.userId,
        status: TradeSessionStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      data: { status: TradeSessionStatus.EXPIRED },
    });

    // Check for existing active session
    const where: any = {
      status: { in: [TradeSessionStatus.PENDING, TradeSessionStatus.ACTIVE] },
      expiresAt: { gt: new Date() },
    };

    if (withUserId) {
      // Find session between these two users
      where.OR = [
        { initiatorId: req.userId, joinerId: withUserId },
        { initiatorId: withUserId, joinerId: req.userId },
      ];
    } else {
      // Find any session initiated by this user
      where.initiatorId = req.userId;
    }

    const existingSession = await prisma.tradeSession.findFirst({
      where,
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    if (existingSession) {
      res.json({ data: existingSession });
      return;
    }

    const sessionCode = generateSessionCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const data: any = {
      sessionCode,
      initiatorId: req.userId!,
      expiresAt,
    };

    if (withUserId) {
      data.joinerId = withUserId;
      data.status = TradeSessionStatus.ACTIVE;
    }

    const session = await prisma.tradeSession.create({
      data,
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    res.status(201).json({ data: session });
  } catch (error) {
    next(error);
  }
});

router.get('/session', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const sessions = await prisma.tradeSession.findMany({
      where: {
        OR: [
          { initiatorId: req.userId },
          { joinerId: req.userId },
        ],
        status: { in: [TradeSessionStatus.PENDING, TradeSessionStatus.ACTIVE] },
        expiresAt: { gt: new Date() },
      },
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: sessions });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/join', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.expiresAt < new Date()) {
      await prisma.tradeSession.update({
        where: { id: session.id },
        data: { status: TradeSessionStatus.EXPIRED },
      });
      throw new AppError('Trade session has expired', 400);
    }

    if (session.initiatorId === req.userId) {
      throw new AppError('Cannot join your own trade session', 400);
    }

    if (session.joinerId && session.joinerId !== req.userId) {
      throw new AppError('Trade session already has a partner', 400);
    }

    if (session.status === TradeSessionStatus.COMPLETED) {
      throw new AppError('Trade session has already been completed', 400);
    }

    const updatedSession = await prisma.tradeSession.update({
      where: { id: session.id },
      data: {
        joinerId: req.userId,
        status: TradeSessionStatus.ACTIVE,
      },
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    // Notify initiator
    const joiner = await prisma.user.findUnique({ where: { id: req.userId } });
    const notification = await prisma.notification.create({
      data: {
        userId: session.initiatorId,
        type: NotificationType.TRADE_MATCH,
        title: 'User joined your trade session!',
        message: `${joiner?.displayName} has joined your trade session ${session.sessionCode}`,
        data: {
          sessionCode: session.sessionCode,
          type: 'join',
        },
      },
    });

    emitToUser(session.initiatorId, 'notification', notification);

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.get('/:code/matches', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.initiatorId !== req.userId && session.joinerId !== req.userId) {
      throw new AppError('Not authorized to view this session', 403);
    }

    if (!session.joinerId) {
      throw new AppError('Waiting for another user to join', 400);
    }

    const matches = await computeTradeMatches(session.initiatorId, session.joinerId);

    // Transform matches to include nested card object as expected by shared TradeMatch interface
    const transformMatch = (match: any) => ({
      card: {
        id: match.cardId,
        name: match.cardName,
        setCode: match.setCode,
        setName: match.setName,
        scryfallId: match.scryfallId,
        rarity: match.rarity,
        manaCost: match.manaCost,
        manaValue: match.manaValue,
        typeLine: match.typeLine,
        oracleText: match.oracleText,
        collectorNumber: match.collectorNumber,
        imageUri: match.imageUri,
        priceEur: match.priceEur,
        priceEurFoil: null,
        priceUsd: match.priceUsd,
        priceUsdFoil: match.priceUsdFoil,
      },
      offererUserId: match.offererUserId,
      receiverUserId: match.receiverUserId,
      availableQuantity: match.availableQuantity,
      condition: match.condition,
      language: match.language,
      isAlter: match.isAlter,
      photoUrl: match.photoUrl,
      isFoil: match.isFoil,
      priority: match.priority,
      priceEur: match.priceEur,
      tradePrice: match.tradePrice,
      isMatch: match.isMatch,
    });

    const transformedMatches = {
      userAOffers: matches.userAOffers.map(transformMatch),
      userBOffers: matches.userBOffers.map(transformMatch),
      userATotalValue: matches.userATotalValue,
      userBTotalValue: matches.userBTotalValue,
    };

    // Cache the matches (Prisma handles Json automatically, no stringify needed)
    await prisma.tradeSession.update({
      where: { id: session.id },
      data: { matchesJson: transformedMatches as any },
    });

    res.json({
      data: {
        session,
        ...transformedMatches,
        userASelectedJson: session.userASelectedJson || {},
        userBSelectedJson: session.userBSelectedJson || {},
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/selection', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;
    const { selectionJson } = req.body; // Map of { cardId: quantity }

    if (!selectionJson || typeof selectionJson !== 'object') {
      throw new AppError('selectionJson must be an object', 400);
    }

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    const isInitiator = req.userId === session.initiatorId;
    const isJoiner = req.userId === session.joinerId;

    if (!isInitiator && !isJoiner) {
      throw new AppError('Not authorized to update selections in this session', 403);
    }

    const updateData: any = {};
    if (isInitiator) {
      updateData.userASelectedJson = selectionJson;
    } else {
      updateData.userBSelectedJson = selectionJson;
    }

    const updatedSession = await prisma.tradeSession.update({
      where: { id: session.id },
      data: updateData,
    });

    // Notify other user via socket
    emitToTradeSession(session.sessionCode, 'trade:selection-updated', {
      userId: req.userId,
      selectionJson,
    });

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/complete', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.initiatorId !== req.userId) {
      throw new AppError('Only the session initiator can complete the session', 403);
    }

    const updatedSession = await prisma.tradeSession.update({
      where: { id: session.id },
      data: { status: TradeSessionStatus.COMPLETED },
    });

    // Notify joiner
    if (session.joinerId) {
      const notification = await prisma.notification.create({
        data: {
          userId: session.joinerId,
          type: NotificationType.TRADE_MATCH,
          title: 'Trade completed!',
          message: `The trade session ${session.sessionCode} has been completed.`,
          data: { sessionCode: session.sessionCode, type: 'complete' },
        },
      });
      emitToUser(session.joinerId, 'notification', notification);
    }

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/delete', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.initiatorId !== req.userId) {
      throw new AppError('Only the session initiator can delete the session', 403);
    }

    // Notify joiner if they exist
    if (session.joinerId) {
      const notification = await prisma.notification.create({
        data: {
          userId: session.joinerId,
          type: NotificationType.TRADE_MATCH,
          title: 'Trade deleted',
          message: `The trade session ${session.sessionCode} has been deleted by the initiator.`,
          data: { sessionCode: session.sessionCode, type: 'delete' },
        },
      });
      emitToUser(session.joinerId, 'notification', notification);
    }

    await prisma.tradeSession.delete({ where: { id: session.id } });

    res.json({ message: 'Trade session deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/history', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { startDate, endDate, sort = 'desc' } = req.query;

    const where: any = {
      OR: [
        { initiatorId: req.userId },
        { joinerId: req.userId },
      ],
      status: TradeSessionStatus.COMPLETED,
      joinerId: { not: null }, // Only completed sessions with a partner
    };

    // Add date range filters if provided
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        // Include the entire end date
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sessions = await prisma.tradeSession.findMany({
      where,
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute match counts from matchesJson
    const sessionsWithCounts = sessions.map((session) => {
      let matchCount = 0;
      if (session.matchesJson) {
        const matches = session.matchesJson as any;
        const userAMatches = matches.userAOffers?.filter((m: any) => m.isMatch).length || 0;
        const userBMatches = matches.userBOffers?.filter((m: any) => m.isMatch).length || 0;
        matchCount = userAMatches + userBMatches;
      }
      return {
        ...session,
        matchCount,
      };
    });

    res.json({ data: sessionsWithCounts });
  } catch (error) {
    next(error);
  }
});

router.get('/history/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { id },
      include: {
        initiator: {
          select: { id: true, displayName: true, shareCode: true },
        },
        joiner: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    // Verify user has access to this session
    if (session.initiatorId !== req.userId && session.joinerId !== req.userId) {
      throw new AppError('Not authorized to view this session', 403);
    }

    res.json({ data: session });
  } catch (error) {
    next(error);
  }
});

router.get('/:code/messages', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.initiatorId !== req.userId && session.joinerId !== req.userId) {
      throw new AppError('Not authorized to view messages in this session', 403);
    }

    const messages = await prisma.tradeMessage.findMany({
      where: { sessionId: session.id },
      include: {
        sender: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(limit, 100),
    });

    res.json({ data: messages });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/message', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      throw new AppError('Message content is required', 400);
    }

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
      include: {
        initiator: { select: { id: true, displayName: true, shareCode: true } },
        joiner: { select: { id: true, displayName: true, shareCode: true } },
      }
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.initiatorId !== req.userId && session.joinerId !== req.userId) {
      throw new AppError('Not authorized to send messages in this session', 403);
    }

    const trimmedContent = content.trim();
    const message = await prisma.tradeMessage.create({
      data: {
        sessionId: session.id,
        senderId: req.userId!,
        content: trimmedContent,
      },
      include: {
        sender: {
          select: { id: true, displayName: true, shareCode: true },
        },
      },
    });

    // Broadcast message via socket
    emitToTradeSession(session.sessionCode, 'trade-message', message);

    // Create a notification for the other user
    const otherUserId = session.initiatorId === req.userId ? session.joinerId : session.initiatorId;
    if (otherUserId) {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      await prisma.notification.create({
        data: {
          userId: otherUserId,
          type: NotificationType.TRADE_MATCH,
          title: `New message from ${user?.displayName}`,
          message: trimmedContent.length > 50 ? `${trimmedContent.substring(0, 47)}...` : trimmedContent,
          data: { sessionCode: session.sessionCode, type: 'message' },
        },
      });
    }

    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
});

export { router as tradeRouter };
