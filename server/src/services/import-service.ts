import { CardCondition, PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { ParsedDecklistEntry } from '../utils/decklist-parser';

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
  setCode?: string;
  collectorNumber?: string;
}

export interface ResolveCardsResult {
  resolved: ResolvedCard[];
  notFound: string[];
}

export interface ResolvedEntry extends ParsedDecklistEntry {
  resolvedCard: ResolvedCard['card'] | null;
  status: 'matched' | 'not_found';
}

export interface ImportRow {
  name: string;
  quantity?: number;
  foilQuantity?: number;
  condition?: string;
  language?: string;
  isAlter?: boolean;
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
  
  // Add versions without "Art Series: " prefix if present to the query
  const namesToQuery = new Set<string>();
  for (const name of normalizedNames) {
    namesToQuery.add(name);
    if (name.startsWith('art series: ')) {
      namesToQuery.add(name.replace('art series: ', '').trim());
    }
  }

  const uniqueNames = [...namesToQuery];

  // Use raw query to get the most recent printing per card name
  // DISTINCT ON with ORDER BY releasedAt DESC gives us the latest printing by date
  // We include setName to help with Art Series prioritization
  const cards = await prisma.$queryRaw<Array<{
    id: string;
    name: string;
    nameEs: string | null;
    setCode: string;
    setName: string;
    scryfallId: string | null;
    priceEur: number | null;
    releasedAt: Date | null;
  }>>`
    SELECT id, name, "nameEs", "setCode", "setName", "scryfallId", "priceEur", "releasedAt"
    FROM cards
    WHERE LOWER(name) = ANY(${uniqueNames}) OR LOWER("nameEs") = ANY(${uniqueNames})
    ORDER BY LOWER(name), "releasedAt" DESC NULLS LAST, "setCode" DESC
  `;

  // Build lookup maps
  const cardMap = new Map<string, ResolvedCard['card'][]>();
  for (const card of cards) {
    const nameKey = card.name.toLowerCase();
    if (!cardMap.has(nameKey)) cardMap.set(nameKey, []);
    cardMap.get(nameKey)!.push(card);
    
    if (card.nameEs) {
      const nameEsKey = card.nameEs.toLowerCase();
      if (!cardMap.has(nameEsKey)) cardMap.set(nameEsKey, []);
      cardMap.get(nameEsKey)!.push(card);
    }
  }

  // Match original names to resolved cards
  const resolved: ResolvedCard[] = [];
  const notFound: string[] = [];

  for (const originalName of cardNames) {
    const normalizedName = originalName.trim().toLowerCase();
    const isArtSeriesRequest = normalizedName.startsWith('art series: ');
    const searchName = isArtSeriesRequest 
      ? normalizedName.replace('art series: ', '').trim()
      : normalizedName;

    const candidates = cardMap.get(searchName) || cardMap.get(normalizedName);

    if (candidates && candidates.length > 0) {
      let selectedMeet: ResolvedCard['card'];

      if (isArtSeriesRequest) {
        // Prioritize sets with "Art Series" in the name
        const artSeriesMatch = candidates.find(c => 
          c.setName.toLowerCase().includes('art series')
        );
        selectedMeet = artSeriesMatch || candidates[0];
      } else {
        selectedMeet = candidates[0];
      }

      resolved.push({ name: originalName, card: selectedMeet });
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
        const isAlter = !!row.isAlter;
        const forTrade = Math.min(Math.max(0, row.forTrade ?? 0), quantity + foilQuantity);
        const tradePrice = row.tradePrice != null && row.tradePrice >= 0 ? row.tradePrice : null;

        // Check for existing item with same unique constraint
        const existing = await tx.collectionItem.findUnique({
          where: {
            userId_cardId_condition_language_isAlter: {
              userId,
              cardId,
              condition,
              language,
              isAlter,
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
              isAlter,
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

/**
 * Parse priority string to WishlistPriority enum.
 */
function parsePriority(priority: string | undefined): 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' {
  if (!priority) return 'NORMAL';

  const normalized = priority.trim().toUpperCase();

  const priorityMap: Record<string, 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'> = {
    'LOW': 'LOW',
    'NORMAL': 'NORMAL',
    'HIGH': 'HIGH',
    'URGENT': 'URGENT',
  };

  return priorityMap[normalized] || 'NORMAL';
}

/**
 * Import wishlist items with specified duplicate handling mode.
 * Processes rows in a transaction for atomicity.
 */
export async function importWishlistItems(
  userId: string,
  rows: ImportRow[],
  duplicateMode: 'skip' | 'update',
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
        const quantity = Math.max(1, row.quantity ?? 1);
        const priority = parsePriority((row as any).priority);
        const maxPrice = row.tradePrice != null && row.tradePrice >= 0 ? row.tradePrice : null;
        const minCondition = row.condition ? parseCondition(row.condition) : null;
        const foilOnly = (row as any).foilOnly ?? false;

        // Check for existing item
        const existing = await tx.wishlistItem.findUnique({
          where: {
            userId_cardId: {
              userId,
              cardId,
            },
          },
        });

        if (existing) {
          // Handle duplicate based on mode
          switch (duplicateMode) {
            case 'skip':
              result.skipped++;
              break;

            case 'update':
              // Update with new values
              await tx.wishlistItem.update({
                where: { id: existing.id },
                data: {
                  quantity,
                  priority,
                  maxPrice,
                  minCondition,
                  foilOnly,
                },
              });
              result.updated++;
              break;
          }
        } else {
          // Create new item
          await tx.wishlistItem.create({
            data: {
              userId,
              cardId,
              quantity,
              priority,
              maxPrice,
              minCondition,
              foilOnly,
            },
          });
          result.imported++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ error, row: rowNum, cardName: row.name }, 'Wishlist import row failed');
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
    'Wishlist import completed'
  );

  return result;
}

/**
 * Resolve decklist entries to cards, preferring specific printings when setCode/collectorNumber provided.
 * Falls back to name-only matching when specific printing not found.
 */
export async function resolveEntriesWithPrintings(
  entries: ParsedDecklistEntry[]
): Promise<ResolvedEntry[]> {
  if (entries.length === 0) {
    return [];
  }

  // Separate entries: those with specific printing info vs name-only
  const withPrinting: ParsedDecklistEntry[] = [];
  const nameOnly: ParsedDecklistEntry[] = [];

  for (const entry of entries) {
    if (entry.setCode && entry.collectorNumber) {
      withPrinting.push(entry);
    } else {
      nameOnly.push(entry);
    }
  }

  // Results map: entry index -> resolved card
  const results: Map<number, ResolvedCard['card'] | null> = new Map();

  // Resolve entries with specific printing (setCode + collectorNumber)
  if (withPrinting.length > 0) {
    // Build query conditions for specific printings
    const printingConditions = withPrinting.map((entry) => ({
      setCode: entry.setCode!.toUpperCase(),
      collectorNumber: entry.collectorNumber!,
    }));

    // Query for specific printings
    const specificCards = await prisma.card.findMany({
      where: {
        OR: printingConditions.map((cond) => ({
          setCode: { equals: cond.setCode, mode: 'insensitive' as const },
          collectorNumber: { equals: cond.collectorNumber, mode: 'insensitive' as const },
        })),
      },
      select: {
        id: true,
        name: true,
        setCode: true,
        setName: true,
        scryfallId: true,
        priceEur: true,
        collectorNumber: true,
      },
    });

    // Build lookup map: "SETCODE|COLLECTORNUMBER" -> card
    const printingMap = new Map<string, ResolvedCard['card']>();
    for (const card of specificCards) {
      const key = `${card.setCode.toUpperCase()}|${card.collectorNumber.toLowerCase()}`;
      printingMap.set(key, card);
    }

    // Match entries to specific printings
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.setCode && entry.collectorNumber) {
        const key = `${entry.setCode.toUpperCase()}|${entry.collectorNumber.toLowerCase()}`;
        const card = printingMap.get(key);
        if (card) {
          results.set(i, card);
        } else {
          // Specific printing not found - fall back to name-only
          nameOnly.push(entry);
        }
      }
    }
  }

  // Resolve name-only entries and fallbacks
  if (nameOnly.length > 0) {
    const names = nameOnly.map((e) => e.cardName);
    const { resolved } = await resolveCardNames(names);

    // Build name -> card lookup
    const nameMap = new Map<string, ResolvedCard['card']>();
    for (const item of resolved) {
      nameMap.set(item.name.toLowerCase(), item.card);
    }

    // Match entries to resolved cards by name
    for (let i = 0; i < entries.length; i++) {
      if (results.has(i)) continue; // Already resolved by specific printing

      const entry = entries[i];
      const card = nameMap.get(entry.cardName.toLowerCase());
      results.set(i, card || null);
    }
  }

  // Build final results
  return entries.map((entry, i): ResolvedEntry => {
    const resolvedCard = results.get(i) || null;
    return {
      ...entry,
      resolvedCard,
      status: resolvedCard ? 'matched' : 'not_found',
    };
  });
}

/**
 * Export parseCondition for use in other services
 */
export { parseCondition };
