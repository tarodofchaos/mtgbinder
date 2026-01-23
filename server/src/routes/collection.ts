import { Router, Response } from 'express';
import { z } from 'zod';
import { CardCondition } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { validate, validateQuery } from '../middleware/validate';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

const addItemSchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  foilQuantity: z.coerce.number().int().min(0).default(0),
  condition: z.nativeEnum(CardCondition).default(CardCondition.NM),
  language: z.string().default('EN'),
  forTrade: z.coerce.number().int().min(0).default(0),
  tradePrice: z.coerce.number().min(0).nullable().optional(),
});

const updateItemSchema = z.object({
  cardId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  foilQuantity: z.coerce.number().int().min(0).optional(),
  condition: z.nativeEnum(CardCondition).optional(),
  language: z.string().optional(),
  forTrade: z.coerce.number().int().min(0).optional(),
  tradePrice: z.coerce.number().min(0).nullable().optional(),
});

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('50'),
  search: z.string().optional(),
  setCode: z.string().optional(),
  forTrade: z.string().transform((v) => v === 'true').optional(),
  sortBy: z.enum(['name', 'setCode', 'priceEur', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

router.use(authMiddleware);

router.get('/', validateQuery(listQuerySchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { page, pageSize, search, setCode, forTrade, sortBy, sortOrder } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      setCode?: string;
      forTrade?: boolean;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };

    const where: Record<string, unknown> = { userId: req.userId };

    if (forTrade) {
      where.forTrade = { gt: 0 };
    }

    const cardWhere: Record<string, unknown> = {};
    if (search) {
      cardWhere.name = { contains: search, mode: 'insensitive' };
    }
    if (setCode) {
      cardWhere.setCode = setCode.toUpperCase();
    }

    if (Object.keys(cardWhere).length > 0) {
      where.card = cardWhere;
    }

    const orderBy: Record<string, unknown>[] = [];
    if (sortBy === 'name' || sortBy === 'setCode' || sortBy === 'priceEur') {
      orderBy.push({ card: { [sortBy]: sortOrder } });
    } else {
      orderBy.push({ [sortBy]: sortOrder });
    }

    const [items, total] = await Promise.all([
      prisma.collectionItem.findMany({
        where,
        include: { card: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.collectionItem.count({ where }),
    ]);

    res.json({
      data: items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const items = await prisma.collectionItem.findMany({
      where: { userId: req.userId },
      include: { card: true },
    });

    const stats = {
      totalCards: 0,
      uniqueCards: items.length,
      totalValue: 0,
      totalValueFoil: 0,
      forTradeCount: 0,
    };

    for (const item of items) {
      stats.totalCards += item.quantity + item.foilQuantity;
      stats.forTradeCount += item.forTrade;

      if (item.card.priceEur) {
        stats.totalValue += item.quantity * item.card.priceEur;
      }
      if (item.card.priceEurFoil) {
        stats.totalValueFoil += item.foilQuantity * item.card.priceEurFoil;
      }
    }

    stats.totalValue = Math.round(stats.totalValue * 100) / 100;
    stats.totalValueFoil = Math.round(stats.totalValueFoil * 100) / 100;

    res.json({ data: stats });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(addItemSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { cardId, quantity, foilQuantity, condition, language, forTrade, tradePrice } = req.body;

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    if (forTrade > quantity + foilQuantity) {
      throw new AppError('For trade quantity cannot exceed total quantity', 400);
    }

    const existingItem = await prisma.collectionItem.findUnique({
      where: {
        userId_cardId_condition_language: {
          userId: req.userId!,
          cardId,
          condition,
          language,
        },
      },
    });

    let item;
    if (existingItem) {
      item = await prisma.collectionItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          foilQuantity: existingItem.foilQuantity + foilQuantity,
          forTrade: existingItem.forTrade + forTrade,
        },
        include: { card: true },
      });
    } else {
      item = await prisma.collectionItem.create({
        data: {
          userId: req.userId!,
          cardId,
          quantity,
          foilQuantity,
          condition,
          language,
          forTrade,
          tradePrice: tradePrice ?? null,
        },
        include: { card: true },
      });
    }

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(updateItemSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingItem = await prisma.collectionItem.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingItem) {
      throw new AppError('Collection item not found', 404);
    }

    // Validate new card exists if cardId is being changed
    if (updates.cardId) {
      const card = await prisma.card.findUnique({ where: { id: updates.cardId } });
      if (!card) {
        throw new AppError('Card not found', 404);
      }
    }

    const newQuantity = updates.quantity ?? existingItem.quantity;
    const newFoilQuantity = updates.foilQuantity ?? existingItem.foilQuantity;
    const newForTrade = updates.forTrade ?? existingItem.forTrade;

    if (newForTrade > newQuantity + newFoilQuantity) {
      throw new AppError('For trade quantity cannot exceed total quantity', 400);
    }

    const item = await prisma.collectionItem.update({
      where: { id },
      data: updates,
      include: { card: true },
    });

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;

    const existingItem = await prisma.collectionItem.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingItem) {
      throw new AppError('Collection item not found', 404);
    }

    await prisma.collectionItem.delete({ where: { id } });

    res.json({ message: 'Item removed from collection' });
  } catch (error) {
    next(error);
  }
});

export { router as collectionRouter };
