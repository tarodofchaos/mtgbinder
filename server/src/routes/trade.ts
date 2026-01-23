import { Router, Response } from 'express';
import { customAlphabet } from 'nanoid';
import { TradeSessionStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { computeTradeMatches } from '../services/match-service';

const router = Router();
const generateSessionCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 6);

router.use(authMiddleware);

router.post('/session', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
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
    const existingSession = await prisma.tradeSession.findFirst({
      where: {
        initiatorId: req.userId,
        status: { in: [TradeSessionStatus.PENDING, TradeSessionStatus.ACTIVE] },
        expiresAt: { gt: new Date() },
      },
    });

    if (existingSession) {
      res.json({ data: existingSession });
      return;
    }

    const sessionCode = generateSessionCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await prisma.tradeSession.create({
      data: {
        sessionCode,
        initiatorId: req.userId!,
        expiresAt,
      },
      include: {
        initiator: {
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

    // Cache the matches
    await prisma.tradeSession.update({
      where: { id: session.id },
      data: { matchesJson: JSON.stringify(matches) },
    });

    res.json({
      data: {
        session,
        ...matches,
      },
    });
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

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.delete('/:code', async (req: AuthenticatedRequest, res: Response, next) => {
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

    await prisma.tradeSession.delete({ where: { id: session.id } });

    res.json({ message: 'Trade session deleted' });
  } catch (error) {
    next(error);
  }
});

export { router as tradeRouter };
