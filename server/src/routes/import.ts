import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import {
  resolveCardNames,
  importCollectionItems,
  ImportRow,
  DuplicateMode,
} from '../services/import-service';

const router = Router();

// Require authentication for all import routes
router.use(authMiddleware);

// Schema for resolve-cards endpoint
const resolveCardsSchema = z.object({
  cardNames: z.array(z.string().min(1)).min(1).max(1000),
});

// Schema for import endpoint
const importRowSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(0).optional(),
  foilQuantity: z.coerce.number().int().min(0).optional(),
  condition: z.string().optional(),
  language: z.string().optional(),
  forTrade: z.coerce.number().int().min(0).optional(),
  tradePrice: z.coerce.number().min(0).nullable().optional(),
  cardId: z.string().uuid().optional(), // Optional override from PrintingSelector
});

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(1000),
  duplicateMode: z.enum(['add', 'skip', 'replace']),
});

/**
 * POST /api/import/resolve-cards
 * Resolve card names to their default printings (most recent set).
 * Returns resolved cards and names that weren't found.
 */
router.post(
  '/resolve-cards',
  validate(resolveCardsSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { cardNames } = req.body;

      const result = await resolveCardNames(cardNames);

      res.json({
        data: {
          resolved: result.resolved,
          notFound: result.notFound,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/import/collection
 * Bulk import collection items.
 * Supports three duplicate modes: add, skip, replace.
 */
router.post(
  '/collection',
  validate(importSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { rows, duplicateMode } = req.body as {
        rows: ImportRow[];
        duplicateMode: DuplicateMode;
      };

      // Build a map of card names that need resolution (those without explicit cardId)
      const namesToResolve = rows
        .filter((row) => !row.cardId)
        .map((row) => row.name);

      // Resolve card names to IDs
      const uniqueNamesToResolve = [...new Set(namesToResolve)];
      const resolved = await resolveCardNames(uniqueNamesToResolve);

      // Build name->id lookup map
      const cardNameToIdMap = new Map<string, string>();
      for (const item of resolved.resolved) {
        cardNameToIdMap.set(item.name.trim().toLowerCase(), item.card.id);
      }

      // Perform the import
      const result = await importCollectionItems(
        req.userId!,
        rows,
        duplicateMode,
        cardNameToIdMap
      );

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

// Schema for wishlist import endpoint
const wishlistImportRowSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().int().min(1).optional(),
  priority: z.string().optional(),
  maxPrice: z.coerce.number().min(0).nullable().optional(),
  minCondition: z.string().optional(),
  foilOnly: z.coerce.boolean().optional(),
  cardId: z.string().uuid().optional(), // Optional override from PrintingSelector
});

const wishlistImportSchema = z.object({
  rows: z.array(wishlistImportRowSchema).min(1).max(1000),
  duplicateMode: z.enum(['skip', 'update']),
});

/**
 * POST /api/import/wishlist
 * Bulk import wishlist items.
 * Supports two duplicate modes: skip, update.
 */
router.post(
  '/wishlist',
  validate(wishlistImportSchema),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { rows, duplicateMode } = req.body as {
        rows: ImportRow[];
        duplicateMode: 'skip' | 'update';
      };

      // Build a map of card names that need resolution (those without explicit cardId)
      const namesToResolve = rows
        .filter((row) => !row.cardId)
        .map((row) => row.name);

      // Resolve card names to IDs
      const uniqueNamesToResolve = [...new Set(namesToResolve)];
      const resolved = await resolveCardNames(uniqueNamesToResolve);

      // Build name->id lookup map
      const cardNameToIdMap = new Map<string, string>();
      for (const item of resolved.resolved) {
        cardNameToIdMap.set(item.name.trim().toLowerCase(), item.card.id);
      }

      // Import the wishlist
      const { importWishlistItems } = await import('../services/import-service');
      const result = await importWishlistItems(
        req.userId!,
        rows,
        duplicateMode,
        cardNameToIdMap
      );

      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  }
);

export { router as importRouter };
