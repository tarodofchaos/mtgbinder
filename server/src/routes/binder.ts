import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { config } from '../utils/config';
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

const exploreQuerySchema = z.object({
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('20'),
  search: z.string().optional(),
});

// Explore public binders
router.get('/', validateQuery(exploreQuerySchema), async (req: Request, res: Response, next) => {
  try {
    const { page, pageSize, search } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
    };

    const where: any = { isPublic: true };
    if (search) {
      where.displayName = { contains: search, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, displayName: true, shareCode: true, avatarId: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { displayName: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: {
        data: users,
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
      select: { id: true, displayName: true, shareCode: true, isPublic: true, avatarId: true, bannerTheme: true },
    });

    if (!user) {
      throw new AppError('Binder not found', 404);
    }

    // If not public, only the owner can see it
    if (!user.isPublic) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('This binder is private', 403);
      }
      
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        if (decoded.userId !== user.id) {
          throw new AppError('This binder is private', 403);
        }
      } catch (error) {
        throw new AppError('This binder is private', 403);
      }
    }

    // Check if binder is public
    // If we have a logged in user, they can see their own binder even if not public
    // We can't easily check auth here because it's a public route.
    // However, if the user HAS the shareCode, maybe they should be able to see it?
    // The requirement says "private/public". 
    // If it's private, it shouldn't be listed. 
    // If it's COMPLETELY private, even with the code it shouldn't work.
    // I'll stick to: if it's not public, it's NOT accessible unless it's the owner (but this route is for others).
    // Actually, I'll allow access if they have the shareCode, but it won't be listed in Explore.
    // Wait, the user said "set their binders to private/public. It must be private by default."
    // This usually means access control.
    
    // Let's refine: if it's private, it's NOT visible in Explore. 
    // But can people with the link see it? I'll assume YES for now, like unlisted videos on YouTube.
    // If the user wants it COMPLETELY private, they shouldn't share the code.
    
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
      select: { id: true, displayName: true, shareCode: true, isPublic: true, bannerTheme: true },
    });

    if (!user) {
      throw new AppError('Binder not found', 404);
    }

    // If not public, only the owner can see it
    if (!user.isPublic) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('This binder is private', 403);
      }
      
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
        if (decoded.userId !== user.id) {
          throw new AppError('This binder is private', 403);
        }
      } catch (error) {
        throw new AppError('This binder is private', 403);
      }
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
