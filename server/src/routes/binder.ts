import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

const router = Router();

const listQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('50'),
  search: z.string().optional(),
  setCode: z.string().optional(),
  forTrade: z.string().transform((v) => v === 'true').optional(),
});

// Public binder view - no auth required
router.get('/:shareCode', validateQuery(listQuerySchema), async (req: Request, res: Response, next) => {
  try {
    const { shareCode } = req.params;
    const { page, pageSize, search, setCode, forTrade } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      setCode?: string;
      forTrade?: boolean;
    };

    const user = await prisma.user.findUnique({
      where: { shareCode: shareCode.toUpperCase() },
      select: { id: true, displayName: true, shareCode: true },
    });

    if (!user) {
      throw new AppError('Binder not found', 404);
    }

    const where: Record<string, unknown> = { userId: user.id };

    if (forTrade) {
      where.forTrade = { gt: 0 };
    }

    const cardWhere: Record<string, unknown> = {};
    if (search) {
      // Search both English and Spanish names
      cardWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameEs: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (setCode) {
      cardWhere.setCode = { startsWith: setCode.toUpperCase(), mode: 'insensitive' };
    }

    if (Object.keys(cardWhere).length > 0) {
      where.card = cardWhere;
    }

    const [items, total] = await Promise.all([
      prisma.collectionItem.findMany({
        where,
        include: { card: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { card: { name: 'asc' } },
      }),
      prisma.collectionItem.count({ where }),
    ]);

    res.json({
      data: {
        user,
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Public wishlist view
router.get('/:shareCode/wishlist', validateQuery(listQuerySchema), async (req: Request, res: Response, next) => {
  try {
    const { shareCode } = req.params;
    const { page, pageSize, search } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
    };

    const user = await prisma.user.findUnique({
      where: { shareCode: shareCode.toUpperCase() },
      select: { id: true, displayName: true, shareCode: true },
    });

    if (!user) {
      throw new AppError('Binder not found', 404);
    }

    const where: Record<string, unknown> = { userId: user.id };

    if (search) {
      // Search both English and Spanish names
      where.card = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameEs: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.wishlistItem.findMany({
        where,
        include: { card: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ priority: 'desc' }, { card: { name: 'asc' } }],
      }),
      prisma.wishlistItem.count({ where }),
    ]);

    res.json({
      data: {
        user,
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as binderRouter };
