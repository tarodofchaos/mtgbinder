import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().optional(),
  setCode: z.string().optional(),
  rarity: z.string().optional(),
  type: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  pageSize: z.string().transform(Number).default('20'),
});

const autocompleteQuerySchema = z.object({
  q: z.string().min(2),
  limit: z.string().transform(Number).default('10'),
});

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response, next) => {
  try {
    const { q, setCode, rarity, type, page, pageSize } = req.query as unknown as {
      q?: string;
      setCode?: string;
      rarity?: string;
      type?: string;
      page: number;
      pageSize: number;
    };

    const where: Record<string, unknown> = {};

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
    }
    if (setCode) {
      where.setCode = setCode.toUpperCase();
    }
    if (rarity) {
      where.rarity = rarity.toLowerCase();
    }
    if (type) {
      where.typeLine = { contains: type, mode: 'insensitive' };
    }

    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { setCode: 'asc' }],
      }),
      prisma.card.count({ where }),
    ]);

    res.json({
      data: cards,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/autocomplete', validateQuery(autocompleteQuerySchema), async (req: Request, res: Response, next) => {
  try {
    const { q, limit } = req.query as unknown as { q: string; limit: number };

    const cards = await prisma.card.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        setCode: true,
        setName: true,
        scryfallId: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
      distinct: ['name'],
    });

    res.json({ data: cards });
  } catch (error) {
    next(error);
  }
});

router.get('/printings', async (req: Request, res: Response, next) => {
  try {
    const { name } = req.query as unknown as { name: string };

    if (!name) {
      throw new AppError('Card name is required', 400);
    }

    const printings = await prisma.card.findMany({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
      orderBy: { setName: 'asc' },
    });

    res.json({ data: printings });
  } catch (error) {
    next(error);
  }
});

router.get('/sets', async (_req: Request, res: Response, next) => {
  try {
    const sets = await prisma.card.findMany({
      select: {
        setCode: true,
        setName: true,
      },
      distinct: ['setCode'],
      orderBy: { setName: 'asc' },
    });

    res.json({ data: sets });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.id },
    });

    if (!card) {
      throw new AppError('Card not found', 404);
    }

    res.json({ data: card });
  } catch (error) {
    next(error);
  }
});

export { router as cardsRouter };
