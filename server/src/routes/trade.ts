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
      if (withUserId) {
        // Still notify receiver even if session exists
        const initiator = await prisma.user.findUnique({ where: { id: req.userId } });
        const notification = await prisma.notification.create({
          data: {
            userId: withUserId,
            type: NotificationType.TRADE_REQUEST,
            title: 'notifications.tradeRequestTitle',
            message: 'notifications.tradeRequestMessage',
            data: {
              sessionCode: existingSession.sessionCode,
              userName: initiator?.displayName,
              type: 'request',
            },
          },
        });
        emitToUser(withUserId, 'notification', notification);
      }
      res.json({ data: existingSession });
      return;
    }

    const sessionCode = generateSessionCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const data: any = {
      sessionCode,
      initiatorId: req.userId!,
      expiresAt,
      status: TradeSessionStatus.PENDING,
    };

    if (withUserId) {
      data.joinerId = withUserId;
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

    if (withUserId) {
      // Notify receiver
      const initiator = await prisma.user.findUnique({ where: { id: req.userId } });
      const notification = await prisma.notification.create({
        data: {
          userId: withUserId,
          type: NotificationType.TRADE_REQUEST,
          title: 'notifications.tradeRequestTitle',
          message: 'notifications.tradeRequestMessage',
          data: {
            sessionCode: session.sessionCode,
            userName: initiator?.displayName,
            type: 'request',
          },
        },
      });
      emitToUser(withUserId, 'notification', notification);
    }

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
        title: 'notifications.userJoinedTitle',
        message: 'notifications.userJoinedMessage',
        data: {
          sessionCode: session.sessionCode,
          userName: joiner?.displayName,
          type: 'join',
        },
      },
    });

    emitToUser(session.initiatorId, 'notification', notification);

    // Notify initiator and others in the room via socket
    emitToTradeSession(session.sessionCode, 'trade:user-joined', {
      user: updatedSession.joiner,
    });

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/accept-request', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.joinerId !== req.userId) {
      throw new AppError('Only the requested partner can accept the trade request', 403);
    }

    if (session.status !== TradeSessionStatus.PENDING) {
      throw new AppError('Trade session is not pending', 400);
    }

    const updatedSession = await prisma.tradeSession.update({
      where: { id: session.id },
      data: { status: TradeSessionStatus.ACTIVE },
      include: {
        initiator: { select: { id: true, displayName: true, shareCode: true } },
        joiner: { select: { id: true, displayName: true, shareCode: true } },
      },
    });

    // Notify initiator
    const joiner = await prisma.user.findUnique({ where: { id: req.userId } });
    const notification = await prisma.notification.create({
      data: {
        userId: session.initiatorId,
        type: NotificationType.TRADE_MATCH,
        title: 'notifications.tradeRequestAcceptedTitle',
        message: 'notifications.tradeRequestAcceptedMessage',
        data: {
          sessionCode: session.sessionCode,
          userName: joiner?.displayName,
          type: 'accept',
        },
      },
    });
    emitToUser(session.initiatorId, 'notification', notification);

    // Notify initiator via socket if they are already on the page
    emitToTradeSession(session.sessionCode, 'trade:request-accepted', {
      user: updatedSession.joiner,
    });

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/reject-request', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    if (session.joinerId !== req.userId) {
      throw new AppError('Only the requested partner can reject the trade request', 403);
    }

    await prisma.tradeSession.delete({ where: { id: session.id } });

    // Notify initiator
    const rejecter = await prisma.user.findUnique({ where: { id: req.userId } });
    const notification = await prisma.notification.create({
      data: {
        userId: session.initiatorId,
        type: NotificationType.TRADE_MATCH,
        title: 'notifications.tradeRequestRejectedTitle',
        message: 'notifications.tradeRequestRejectedMessage',
        data: {
          userName: rejecter?.displayName,
          type: 'reject',
        },
      },
    });
    emitToUser(session.initiatorId, 'notification', notification);

    // Notify via socket if they are on the page
    emitToTradeSession(session.sessionCode, 'trade:request-rejected', {
      userId: req.userId,
    });

    res.json({ message: 'Trade request rejected' });
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

    // If it is completed, use the cached matches instead of computed ones to preserve history
    if (session.status === TradeSessionStatus.COMPLETED && session.matchesJson) {
      const cachedMatches = session.matchesJson as any;
      res.json({
        data: {
          session,
          ...cachedMatches,
          userASelectedJson: session.userASelectedJson || {},
          userBSelectedJson: session.userBSelectedJson || {},
        },
      });
      return;
    }

    const matches = await computeTradeMatches(session.initiatorId, session.joinerId);

    // Transform matches to include nested card object as expected by shared TradeMatch interface
    const transformMatch = (match: any) => ({
      collectionItemId: match.collectionItemId,
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
    const { selectionJson } = req.body; // Map of { collectionItemId: quantity }

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

    const updateData: any = {
      // Reset acceptance when selection changes
      userAAccepted: false,
      userBAccepted: false,
    };
    
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
      userAAccepted: false,
      userBAccepted: false,
    });

    res.json({ data: updatedSession });
  } catch (error) {
    next(error);
  }
});

router.post('/:code/accept', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { code } = req.params;
    const { accepted } = req.body;

    const session = await prisma.tradeSession.findUnique({
      where: { sessionCode: code.toUpperCase() },
    });

    if (!session) {
      throw new AppError('Trade session not found', 404);
    }

    const isInitiator = req.userId === session.initiatorId;
    const isJoiner = req.userId === session.joinerId;

    if (!isInitiator && !isJoiner) {
      throw new AppError('Not authorized to accept in this session', 403);
    }

    const updateData: any = {};
    if (isInitiator) {
      updateData.userAAccepted = !!accepted;
    } else {
      updateData.userBAccepted = !!accepted;
    }

    const updatedSession = await prisma.tradeSession.update({
      where: { id: session.id },
      data: updateData,
    });

    // Notify other user via socket
    emitToTradeSession(session.sessionCode, 'trade:acceptance-updated', {
      userId: req.userId,
      accepted: !!accepted,
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

    if (!session.userAAccepted || !session.userBAccepted) {
      throw new AppError('Both users must accept the trade before completion', 400);
    }

    if (!session.joinerId) {
      throw new AppError('Trade session has no partner', 400);
    }

    // Capture the final state of the trade for history
    const captureTradedCards = async (offererId: string, receiverId: string, selectedJson: any) => {
      const tradedCards: any[] = [];
      let totalValue = 0;

      if (!selectedJson || typeof selectedJson !== 'object') return { tradedCards, totalValue };

      for (const [collectionItemId, qty] of Object.entries(selectedJson)) {
        if (collectionItemId === 'undefined' || collectionItemId === 'null') continue;
        const quantity = qty as number;
        if (quantity <= 0) continue;

        const item = await prisma.collectionItem.findUnique({
          where: { id: collectionItemId },
          include: { card: true }
        });

        if (item) {
          const price = item.tradePrice ?? item.card.priceEur ?? 0;
          totalValue += price * quantity;
          tradedCards.push({
            collectionItemId,
            card: {
              id: item.card.id,
              name: item.card.name,
              setCode: item.card.setCode,
              setName: item.card.setName,
              scryfallId: item.card.scryfallId,
              rarity: item.card.rarity,
              manaCost: item.card.manaCost,
              manaValue: item.card.manaValue,
              typeLine: item.card.typeLine,
              oracleText: item.card.oracleText,
              collectorNumber: item.card.collectorNumber,
              imageUri: item.card.imageUri,
              priceEur: item.card.priceEur,
              priceEurFoil: item.card.priceEurFoil,
              priceUsd: item.card.priceUsd,
              priceUsdFoil: item.card.priceUsdFoil,
            },
            offererUserId: offererId,
            receiverUserId: receiverId,
            availableQuantity: quantity, // In history, availableQuantity means TRADED quantity
            condition: item.condition,
            language: item.language,
            isAlter: item.isAlter,
            photoUrl: item.photoUrl,
            isFoil: item.foilQuantity > 0,
            priority: null,
            priceEur: item.card.priceEur,
            tradePrice: item.tradePrice,
            isMatch: true, // They were traded, so they are matches
          });
        }
      }
      return { tradedCards, totalValue };
    };

    const userAHistory = await captureTradedCards(session.initiatorId, session.joinerId!, session.userBSelectedJson);
    const userBHistory = await captureTradedCards(session.joinerId!, session.initiatorId, session.userASelectedJson);

    const finalMatchesJson = {
      userAOffers: userAHistory.tradedCards, // What User A gave
      userBOffers: userBHistory.tradedCards, // What User B gave
      userATotalValue: userAHistory.totalValue,
      userBTotalValue: userBHistory.totalValue,
    };

    // Move cards between collections in a transaction
    await prisma.$transaction(async (tx) => {
      const subtractItems = async (fromId: string, selectedJson: any, tx: any) => {
        if (!selectedJson || typeof selectedJson !== 'object') return;
        
        for (const [collectionItemId, qty] of Object.entries(selectedJson)) {
          if (collectionItemId === 'undefined' || collectionItemId === 'null') continue;
          
          const quantity = qty as number;
          if (quantity <= 0) continue;

          const item = await tx.collectionItem.findUnique({
            where: { id: collectionItemId }
          });

          if (!item || item.userId !== fromId || item.quantity < quantity) {
            throw new AppError(`Invalid collection item or insufficient quantity for item ${collectionItemId}`, 400);
          }

          // Subtract from sender
          if (item.quantity === quantity) {
            await tx.collectionItem.delete({ where: { id: collectionItemId } });
          } else {
            await tx.collectionItem.update({
              where: { id: collectionItemId },
              data: {
                quantity: item.quantity - quantity,
                forTrade: Math.max(0, item.forTrade - quantity),
                foilQuantity: Math.max(0, item.foilQuantity - quantity) 
              }
            });
          }
        }
      };

      const moveItems = async (fromId: string, toId: string, selectedJson: any) => {
        if (!selectedJson || typeof selectedJson !== 'object') return;
        
        for (const [collectionItemId, qty] of Object.entries(selectedJson)) {
          // Skip invalid keys that might have slipped from the frontend
          if (collectionItemId === 'undefined' || collectionItemId === 'null') continue;
          
          const quantity = qty as number;
          if (quantity <= 0) continue;

          const item = await tx.collectionItem.findUnique({
            where: { id: collectionItemId }
          });

          if (!item || item.userId !== fromId || item.quantity < quantity) {
            throw new AppError(`Invalid collection item or insufficient quantity for item ${collectionItemId}`, 400);
          }

          // Subtract from sender
          if (item.quantity === quantity) {
            await tx.collectionItem.delete({ where: { id: collectionItemId } });
          } else {
            await tx.collectionItem.update({
              where: { id: collectionItemId },
              data: {
                quantity: item.quantity - quantity,
                forTrade: Math.max(0, item.forTrade - quantity),
                // If it was foil, we assume we are moving foil first if needed? 
                // This is a bit simplified as the trade doesn't specify foil qty.
                foilQuantity: Math.max(0, item.foilQuantity - quantity) 
              }
            });
          }

          // Add to receiver
          const existing = await tx.collectionItem.findUnique({
            where: {
              userId_cardId_condition_language_isAlter: {
                userId: toId,
                cardId: item.cardId,
                condition: item.condition,
                language: item.language,
                isAlter: item.isAlter
              }
            }
          });

          if (existing) {
            await tx.collectionItem.update({
              where: { id: existing.id },
              data: { 
                quantity: existing.quantity + quantity,
                foilQuantity: existing.foilQuantity + (item.foilQuantity > 0 ? Math.min(quantity, item.foilQuantity) : 0)
              }
            });
          } else {
            await tx.collectionItem.create({
              data: {
                userId: toId,
                cardId: item.cardId,
                quantity: quantity,
                condition: item.condition,
                language: item.language,
                isAlter: item.isAlter,
                photoUrl: item.photoUrl,
                foilQuantity: item.foilQuantity > 0 ? Math.min(quantity, item.foilQuantity) : 0
              }
            });
          }
        }
      };

      // User A receives cards from User B (userASelectedJson)
      const userA = await tx.user.findUnique({ where: { id: session.initiatorId } });
      if (userA?.autoAddBoughtCards) {
        await moveItems(session.joinerId!, session.initiatorId, session.userASelectedJson);
      } else {
        // Just subtract from sender if autoAdd is false
        await subtractItems(session.joinerId!, session.userASelectedJson, tx);
      }
      
      // User B receives cards from User A (userBSelectedJson)
      const userB = await tx.user.findUnique({ where: { id: session.joinerId! } });
      if (userB?.autoAddBoughtCards) {
        await moveItems(session.initiatorId, session.joinerId!, session.userBSelectedJson);
      } else {
        // Just subtract from sender if autoAdd is false
        await subtractItems(session.initiatorId, session.userBSelectedJson, tx);
      }

      // Mark session as completed
      await tx.tradeSession.update({
        where: { id: session.id },
        data: { 
          status: TradeSessionStatus.COMPLETED,
          matchesJson: finalMatchesJson as any
        },
      });
    });

    const updatedSession = await prisma.tradeSession.findUnique({
      where: { id: session.id },
    });

    // Notify joiner
    if (session.joinerId) {
      const notification = await prisma.notification.create({
        data: {
          userId: session.joinerId,
          type: NotificationType.TRADE_MATCH,
          title: 'notifications.tradeCompletedTitle',
          message: 'notifications.tradeCompletedMessage',
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
      const notification = await prisma.notification.create({
        data: {
          userId: otherUserId,
          type: NotificationType.TRADE_MATCH,
          title: 'notifications.newMessageTitle',
          message: trimmedContent.length > 50 ? `${trimmedContent.substring(0, 47)}...` : trimmedContent,
          data: { 
            sessionCode: session.sessionCode, 
            userName: user?.displayName,
            type: 'message' 
          },
        },
      });
      
      emitToUser(otherUserId, 'notification', notification);
    }

    res.status(201).json({ data: message });
  } catch (error) {
    next(error);
  }
});

export { router as tradeRouter };
