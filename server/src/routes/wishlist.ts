import { Router, Response } from 'express';
import { z } from 'zod';
import { CardCondition, WishlistPriority } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { validate, validateQuery } from '../middleware/validate';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { parseDecklist } from '../utils/decklist-parser';

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

const importDecklistSchema = z.object({
  decklistText: z.string().min(1),
  priority: z.nativeEnum(WishlistPriority).default(WishlistPriority.NORMAL),
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
      // Search both English and Spanish names
      where.card = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { nameEs: { contains: search, mode: 'insensitive' } },
        ],
      };
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

router.post('/import-decklist', validate(importDecklistSchema), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { decklistText, priority } = req.body;

    // Parse the decklist
    const parsed = parseDecklist(decklistText);

    if (parsed.entries.length === 0) {
      throw new AppError('No valid cards found in decklist', 400);
    }

    // Search for each card in the database
    const cardSearchResults = await Promise.all(
      parsed.entries.map(async (entry) => {
        // Try to find exact match by name
        const cardQuery: Record<string, unknown> = {
          name: { equals: entry.cardName, mode: 'insensitive' },
        };

        // If set code provided, prefer that printing
        if (entry.setCode) {
          cardQuery.setCode = entry.setCode.toUpperCase();
        }

        const cards = await prisma.card.findMany({
          where: cardQuery,
          orderBy: entry.setCode ? undefined : { setName: 'desc' }, // Get most recent printing if no set specified
          take: 1,
        });

        return {
          entry,
          card: cards[0] || null,
        };
      })
    );

    // Get user's current collection to check what they already own
    const collectionItems = await prisma.collectionItem.findMany({
      where: { userId: req.userId },
      include: { card: true },
    });

    // Build a map of card name -> owned quantity
    const ownedQuantityMap = new Map<string, number>();
    for (const item of collectionItems) {
      const cardName = item.card.name.toLowerCase();
      const currentOwned = ownedQuantityMap.get(cardName) || 0;
      ownedQuantityMap.set(cardName, currentOwned + item.quantity + item.foilQuantity);
    }

    // Get user's current wishlist to avoid duplicates
    const existingWishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: req.userId },
      select: { cardId: true },
    });
    const existingCardIds = new Set(existingWishlistItems.map(item => item.cardId));

    // Prepare preview data
    const preview = cardSearchResults.map(({ entry, card }) => {
      const ownedQuantity = card ? ownedQuantityMap.get(card.name.toLowerCase()) || 0 : 0;
      const alreadyInWishlist = card ? existingCardIds.has(card.id) : false;

      return {
        cardName: entry.cardName,
        setCode: entry.setCode,
        quantity: entry.quantity,
        ownedQuantity,
        matchedCard: card ? {
          id: card.id,
          name: card.name,
          setCode: card.setCode,
          setName: card.setName,
          scryfallId: card.scryfallId,
          priceEur: card.priceEur,
        } : null,
        alreadyInWishlist,
      };
    });

    res.json({
      data: {
        preview,
        priority,
        parseErrors: parsed.errors,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/import-decklist/confirm', validate(z.object({
  cards: z.array(z.object({
    cardId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })),
  priority: z.nativeEnum(WishlistPriority).default(WishlistPriority.NORMAL),
})), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { cards, priority } = req.body;

    if (cards.length === 0) {
      throw new AppError('No cards to import', 400);
    }

    // Validate all card IDs exist
    const cardIds = cards.map((c: { cardId: string; quantity: number }) => c.cardId);
    const foundCards = await prisma.card.findMany({
      where: { id: { in: cardIds } },
      select: { id: true },
    });

    if (foundCards.length !== cards.length) {
      throw new AppError('Some cards were not found', 400);
    }

    // Get existing wishlist items to avoid duplicates
    const existingItems = await prisma.wishlistItem.findMany({
      where: {
        userId: req.userId,
        cardId: { in: cardIds },
      },
      select: { cardId: true, quantity: true, id: true },
    });

    const existingMap = new Map(existingItems.map(item => [item.cardId, item]));

    // Bulk create new items and update existing ones
    const toCreate = [];
    const toUpdate = [];

    for (const card of cards) {
      const existing = existingMap.get(card.cardId);
      if (existing) {
        // Update quantity for existing items
        toUpdate.push(
          prisma.wishlistItem.update({
            where: { id: existing.id },
            data: { quantity: existing.quantity + card.quantity },
          })
        );
      } else {
        // Create new wishlist item
        toCreate.push({
          userId: req.userId!,
          cardId: card.cardId,
          quantity: card.quantity,
          priority,
          foilOnly: false,
          maxPrice: null,
          minCondition: null,
        });
      }
    }

    // Execute bulk operations
    const [created] = await Promise.all([
      toCreate.length > 0 ? prisma.wishlistItem.createMany({ data: toCreate }) : { count: 0 },
      ...toUpdate,
    ]);

    res.json({
      data: {
        imported: created.count,
        updated: toUpdate.length,
        total: cards.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as wishlistRouter };
