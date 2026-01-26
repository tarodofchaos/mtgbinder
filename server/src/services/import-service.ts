import { CardCondition, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface ResolvedCard {
  name: string;
  card: {
    id: string;
    name: string;
    setCode: string;
    setName: string;
    scryfallId: string | null;
    priceEur: number | null;
  };
}

export interface ResolveCardsResult {
  resolved: ResolvedCard[];
  notFound: string[];
}

export interface ImportRow {
  name: string;
  quantity?: number;
  foilQuantity?: number;
  condition?: string;
  language?: string;
  forTrade?: number;
  tradePrice?: number | null;
  cardId?: string; // Optional override from PrintingSelector
}

export type DuplicateMode = 'add' | 'skip' | 'replace';

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    cardName: string;
    error: string;
  }>;
}

/**
 * Resolve card names to their most recent printings.
 * Uses PostgreSQL DISTINCT ON to efficiently get the latest printing per name.
 */
export async function resolveCardNames(cardNames: string[]): Promise<ResolveCardsResult> {
  if (cardNames.length === 0) {
    return { resolved: [], notFound: [] };
  }

  // Normalize names for case-insensitive matching
  const normalizedNames = cardNames.map(name => name.trim().toLowerCase());
  const uniqueNames = [...new Set(normalizedNames)];

  // Use raw query to get the most recent printing per card name
  // DISTINCT ON with ORDER BY setCode DESC gives us the latest set
  const cards = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    setCode: string;
    setName: string;
    scryfallId: string | null;
    priceEur: number | null;
  }>>`
    SELECT DISTINCT ON (LOWER(name))
      id, name, "setCode", "setName", "scryfallId", "priceEur"
    FROM cards
    WHERE LOWER(name) = ANY(${uniqueNames})
    ORDER BY LOWER(name), "setCode" DESC
  `;

  // Build lookup map for resolved cards (lowercase name -> card data)
  const cardMap = new Map<string, ResolvedCard['card']>();
  for (const card of cards) {
    cardMap.set(card.name.toLowerCase(), card);
  }

  // Match original names to resolved cards
  const resolved: ResolvedCard[] = [];
  const notFound: string[] = [];

  for (const originalName of cardNames) {
    const normalizedName = originalName.trim().toLowerCase();
    const card = cardMap.get(normalizedName);

    if (card) {
      resolved.push({ name: originalName, card });
    } else {
      notFound.push(originalName);
    }
  }

  return { resolved, notFound };
}

/**
 * Parse condition string to CardCondition enum.
 * Accepts both short (NM) and Prisma enum (NM) formats.
 */
function parseCondition(condition: string | undefined): CardCondition {
  if (!condition) return CardCondition.NM;

  const normalized = condition.trim().toUpperCase();

  // Map various formats to CardCondition enum
  const conditionMap: Record<string, CardCondition> = {
    'M': CardCondition.M,
    'MINT': CardCondition.M,
    'NM': CardCondition.NM,
    'NEAR_MINT': CardCondition.NM,
    'NEAR MINT': CardCondition.NM,
    'LP': CardCondition.LP,
    'LIGHTLY_PLAYED': CardCondition.LP,
    'LIGHTLY PLAYED': CardCondition.LP,
    'MP': CardCondition.MP,
    'MODERATELY_PLAYED': CardCondition.MP,
    'MODERATELY PLAYED': CardCondition.MP,
    'HP': CardCondition.HP,
    'HEAVILY_PLAYED': CardCondition.HP,
    'HEAVILY PLAYED': CardCondition.HP,
    'DMG': CardCondition.DMG,
    'DAMAGED': CardCondition.DMG,
  };

  return conditionMap[normalized] || CardCondition.NM;
}

/**
 * Import collection items with specified duplicate handling mode.
 * Processes rows in a transaction for atomicity.
 */
export async function importCollectionItems(
  userId: string,
  rows: ImportRow[],
  duplicateMode: DuplicateMode,
  cardNameToIdMap: Map<string, string>
): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  if (rows.length === 0) {
    return result;
  }

  // Process in a transaction
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      try {
        // Get cardId - either from explicit override or from name resolution
        const cardId = row.cardId || cardNameToIdMap.get(row.name.trim().toLowerCase());

        if (!cardId) {
          result.errors.push({
            row: rowNum,
            cardName: row.name,
            error: 'Card not found in database',
          });
          result.failed++;
          continue;
        }

        // Verify card exists
        const cardExists = await tx.card.findUnique({
          where: { id: cardId },
          select: { id: true },
        });

        if (!cardExists) {
          result.errors.push({
            row: rowNum,
            cardName: row.name,
            error: 'Card ID not found',
          });
          result.failed++;
          continue;
        }

        // Parse and validate row data
        const quantity = Math.max(0, row.quantity ?? 1);
        const foilQuantity = Math.max(0, row.foilQuantity ?? 0);
        const condition = parseCondition(row.condition);
        const language = row.language?.trim().toUpperCase() || 'EN';
        const forTrade = Math.min(Math.max(0, row.forTrade ?? 0), quantity + foilQuantity);
        const tradePrice = row.tradePrice != null && row.tradePrice >= 0 ? row.tradePrice : null;

        // Check for existing item with same unique constraint
        const existing = await tx.collectionItem.findUnique({
          where: {
            userId_cardId_condition_language: {
              userId,
              cardId,
              condition,
              language,
            },
          },
        });

        if (existing) {
          // Handle duplicate based on mode
          switch (duplicateMode) {
            case 'skip':
              result.skipped++;
              break;

            case 'add':
              // Add to existing quantities
              await tx.collectionItem.update({
                where: { id: existing.id },
                data: {
                  quantity: existing.quantity + quantity,
                  foilQuantity: existing.foilQuantity + foilQuantity,
                  forTrade: existing.forTrade + forTrade,
                  // Only update tradePrice if new value is provided
                  ...(tradePrice != null && { tradePrice }),
                },
              });
              result.updated++;
              break;

            case 'replace':
              // Replace with new values
              await tx.collectionItem.update({
                where: { id: existing.id },
                data: {
                  quantity,
                  foilQuantity,
                  forTrade,
                  ...(tradePrice != null && { tradePrice }),
                },
              });
              result.updated++;
              break;
          }
        } else {
          // Create new item
          await tx.collectionItem.create({
            data: {
              userId,
              cardId,
              quantity,
              foilQuantity,
              condition,
              language,
              forTrade,
              tradePrice,
            },
          });
          result.imported++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error, row: rowNum, cardName: row.name }, 'Import row failed');
        result.errors.push({
          row: rowNum,
          cardName: row.name,
          error: errorMessage,
        });
        result.failed++;
      }
    }
  });

  logger.info(
    {
      userId,
      rowCount: rows.length,
      imported: result.imported,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    },
    'Collection import completed'
  );

  return result;
}
