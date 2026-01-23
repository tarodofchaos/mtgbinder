import { Router, Response } from 'express';
import { z } from 'zod';
import { CardCondition, WishlistPriority } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { validate, validateQuery } from '../middleware/validate';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

const addItemSchema = z.object({
  cardId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).default(1),
  priority: z.nativeEnum(WishlistPriority).default(WishlistPriority.NORMAL),
  maxPrice: z.coerce.number().positive().nullable().optional(),
  minCondition: z.nativeEnum(CardCondition).nullable().optional(),
  foilOnly: z.coerce.boolean().default(false),
});

const updateItemSchema = z.object({
  cardId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  priority: z.nativeEnum(WishlistPriority).optional(),
  maxPrice: z.coerce.number().positive().nullable().optional(),
  minCondition: z.nativeEnum(CardCondition).nullable().optional(),
  foilOnly: z.coerce.boolean().optional(),
});

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('50'),
  search: z.string().optional(),
  priority: z.nativeEnum(WishlistPriority).optional(),
  sortBy: z.enum(['name', 'priority', 'priceEur', 'updatedAt']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const priorityOrder = {
  [WishlistPriority.URGENT]: 4,
  [WishlistPriority.HIGH]: 3,
  [WishlistPriority.NORMAL]: 2,
  [WishlistPriority.LOW]: 1,
};

router.use(authMiddleware);

router.get('/', validateQuery(listQuerySchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { page, pageSize, search, priority, sortBy, sortOrder } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      priority?: WishlistPriority;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    };

    const where: Record<string, unknown> = { userId: req.userId };

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.card = { name: { contains: search, mode: 'insensitive' } };
    }

    const orderBy: Record<string, unknown>[] = [];
    if (sortBy === 'name' || sortBy === 'priceEur') {
      orderBy.push({ card: { [sortBy]: sortOrder } });
    } else {
      orderBy.push({ [sortBy]: sortOrder });
    }

    const [items, total] = await Promise.all([
      prisma.wishlistItem.findMany({
        where,
        include: { card: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy,
      }),
      prisma.wishlistItem.count({ where }),
    ]);

    // Sort by priority custom order if that's the sort field
    if (sortBy === 'priority') {
      items.sort((a, b) => {
        const diff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return sortOrder === 'desc' ? diff : -diff;
      });
    }

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

router.post('/', validate(addItemSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { cardId, quantity, priority, maxPrice, minCondition, foilOnly } = req.body;

    const card = await prisma.card.findUnique({ where: { id: cardId } });
    if (!card) {
      throw new AppError('Card not found', 404);
    }

    const existingItem = await prisma.wishlistItem.findUnique({
      where: {
        userId_cardId: {
          userId: req.userId!,
          cardId,
        },
      },
    });

    if (existingItem) {
      throw new AppError('Card already in wishlist', 400);
    }

    const item = await prisma.wishlistItem.create({
      data: {
        userId: req.userId!,
        cardId,
        quantity,
        priority,
        maxPrice,
        minCondition,
        foilOnly,
      },
      include: { card: true },
    });

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', validate(updateItemSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingItem = await prisma.wishlistItem.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingItem) {
      throw new AppError('Wishlist item not found', 404);
    }

    // Validate new card exists if cardId is being changed
    if (updates.cardId) {
      const card = await prisma.card.findUnique({ where: { id: updates.cardId } });
      if (!card) {
        throw new AppError('Card not found', 404);
      }
    }

    const item = await prisma.wishlistItem.update({
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

    const existingItem = await prisma.wishlistItem.findFirst({
      where: { id, userId: req.userId },
    });

    if (!existingItem) {
      throw new AppError('Wishlist item not found', 404);
    }

    await prisma.wishlistItem.delete({ where: { id } });

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    next(error);
  }
});

export { router as wishlistRouter };
