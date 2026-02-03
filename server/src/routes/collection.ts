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
  colors: z.string().optional().transform((v) => v?.split(',').filter(Boolean)),
  rarity: z.string().optional(),
  priceMin: z.string().transform(Number).optional(),
  priceMax: z.string().transform(Number).optional(),
  forTrade: z.string().transform((v) => v === 'true').optional(),
  sortBy: z.enum(['name', 'setCode', 'priceEur', 'updatedAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

router.use(authMiddleware);

router.get('/', validateQuery(listQuerySchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { page, pageSize, search, setCode, colors, rarity, priceMin, priceMax, forTrade, sortBy, sortOrder } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      setCode?: string;
      colors?: string[];
      rarity?: string;
      priceMin?: number;
      priceMax?: number;
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
    // Color filter uses AND logic: card must have ALL selected colors
    // e.g., colors=U,R matches cards with BOTH blue AND red in their color identity
    // Special filters: C = colorless (empty colors array), L = lands (typeLine contains "Land")
    if (colors && colors.length > 0) {
      const standardColors = colors.filter(c => ['W', 'U', 'B', 'R', 'G'].includes(c));
      const hasColorless = colors.includes('C');
      const hasLand = colors.includes('L');

      if (hasColorless) {
        // Colorless cards have empty colors array
        cardWhere.colors = { isEmpty: true };
      } else if (standardColors.length > 0) {
        cardWhere.colors = { hasEvery: standardColors };
      }

      if (hasLand) {
        // Lands have "Land" in their typeLine
        cardWhere.typeLine = { contains: 'Land', mode: 'insensitive' };
      }
    }
    if (rarity) {
      cardWhere.rarity = rarity;
    }
    if (priceMin !== undefined || priceMax !== undefined) {
      cardWhere.priceEur = {};
      if (priceMin !== undefined) {
        (cardWhere.priceEur as Record<string, unknown>).gte = priceMin;
      }
      if (priceMax !== undefined) {
        (cardWhere.priceEur as Record<string, unknown>).lte = priceMax;
      }
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

router.get('/sets', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    // Get all collection items for user with their cards
    const collectionItems = await prisma.collectionItem.findMany({
      where: { userId: req.userId },
      include: { card: true },
    });

    // Group by set
    const setMap = new Map<string, { setCode: string; setName: string; ownedCards: Set<string> }>();

    for (const item of collectionItems) {
      const { setCode, setName } = item.card;
      if (!setMap.has(setCode)) {
        setMap.set(setCode, { setCode, setName, ownedCards: new Set() });
      }
      setMap.get(setCode)!.ownedCards.add(item.card.name);
    }

    // Get total card counts for each set (unique card names per set)
    const setCodes = Array.from(setMap.keys());
    const setTotals = await Promise.all(
      setCodes.map(async (setCode) => {
        const count = await prisma.card.findMany({
          where: { setCode },
          distinct: ['name'],
          select: { name: true },
        });
        return { setCode, total: count.length };
      })
    );

    const totalMap = new Map(setTotals.map(st => [st.setCode, st.total]));

    // Build response
    const sets = Array.from(setMap.values()).map(set => {
      const totalCount = totalMap.get(set.setCode) || 0;
      const ownedCount = set.ownedCards.size;
      return {
        setCode: set.setCode,
        setName: set.setName,
        ownedCount,
        totalCount,
        completionPercentage: totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0,
      };
    });

    // Sort by completion percentage desc, then by set name
    sets.sort((a, b) => {
      if (b.completionPercentage !== a.completionPercentage) {
        return b.completionPercentage - a.completionPercentage;
      }
      return a.setName.localeCompare(b.setName);
    });

    res.json({ data: sets });
  } catch (error) {
    next(error);
  }
});

router.get('/sets/:setCode/completion', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { setCode } = req.params;
    const upperSetCode = setCode.toUpperCase();

    // Get user's collection items for this set
    const collectionItems = await prisma.collectionItem.findMany({
      where: {
        userId: req.userId,
        card: { setCode: upperSetCode },
      },
      include: { card: true },
    });

    // Get owned card names
    const ownedCardNames = new Set(collectionItems.map(item => item.card.name));

    // Get all unique card names in the set
    const allCardsInSet = await prisma.card.findMany({
      where: { setCode: upperSetCode },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });

    // Find missing cards
    const missingCards = allCardsInSet.filter(card => !ownedCardNames.has(card.name));

    const setName = allCardsInSet.length > 0 ? allCardsInSet[0].setName : upperSetCode;
    const totalCount = allCardsInSet.length;
    const ownedCount = ownedCardNames.size;

    res.json({
      data: {
        setCode: upperSetCode,
        setName,
        ownedCount,
        totalCount,
        completionPercentage: totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0,
        missingCards,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/export', validateQuery(listQuerySchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { search, setCode, colors, rarity, priceMin, priceMax, forTrade } = req.query as unknown as {
      search?: string;
      setCode?: string;
      colors?: string[];
      rarity?: string;
      priceMin?: number;
      priceMax?: number;
      forTrade?: boolean;
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
    // Color filter uses AND logic: card must have ALL selected colors
    // Special filters: C = colorless (empty colors array), L = lands (typeLine contains "Land")
    if (colors && colors.length > 0) {
      const standardColors = colors.filter(c => ['W', 'U', 'B', 'R', 'G'].includes(c));
      const hasColorless = colors.includes('C');
      const hasLand = colors.includes('L');

      if (hasColorless) {
        cardWhere.colors = { isEmpty: true };
      } else if (standardColors.length > 0) {
        cardWhere.colors = { hasEvery: standardColors };
      }

      if (hasLand) {
        cardWhere.typeLine = { contains: 'Land', mode: 'insensitive' };
      }
    }
    if (rarity) {
      cardWhere.rarity = rarity;
    }
    if (priceMin !== undefined || priceMax !== undefined) {
      cardWhere.priceEur = {};
      if (priceMin !== undefined) {
        (cardWhere.priceEur as Record<string, unknown>).gte = priceMin;
      }
      if (priceMax !== undefined) {
        (cardWhere.priceEur as Record<string, unknown>).lte = priceMax;
      }
    }

    if (Object.keys(cardWhere).length > 0) {
      where.card = cardWhere;
    }

    // Fetch all items matching the filters (no pagination for export)
    const items = await prisma.collectionItem.findMany({
      where,
      include: { card: true },
      orderBy: { card: { name: 'asc' } },
    });

    // Helper function to escape CSV fields
    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // If field contains comma, quote, or newline, wrap in quotes and escape existing quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Build CSV content
    const headers = [
      'name',
      'set_code',
      'quantity',
      'foil_quantity',
      'condition',
      'language',
      'for_trade',
      'trade_price',
      'scryfall_id',
    ];

    const csvRows = [headers.join(',')];

    for (const item of items) {
      const row = [
        escapeCSV(item.card.name),
        escapeCSV(item.card.setCode),
        escapeCSV(item.quantity),
        escapeCSV(item.foilQuantity),
        escapeCSV(item.condition),
        escapeCSV(item.language),
        escapeCSV(item.forTrade),
        escapeCSV(item.tradePrice),
        escapeCSV(item.card.scryfallId),
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `mtg-collection-${date}.csv`;

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export { router as collectionRouter };
