import { logger } from '../utils/logger';
import { AppError } from '../middleware/error-handler';
import { ParsedDecklistEntry, DetectedFormat } from '../utils/decklist-parser';

export interface UrlImportResult {
  entries: ParsedDecklistEntry[];
  errors: string[];
  deckName?: string;
  deckAuthor?: string;
  source: 'archidekt' | 'moxfield' | 'mtggoldfish';
}

interface UrlParser {
  name: string;
  canHandle: (url: string) => boolean;
  parse: (url: string) => Promise<UrlImportResult>;
}

// ─────────────────────────────────────────────────
// Archidekt Parser
// API: https://archidekt.com/api/decks/{id}/
// ─────────────────────────────────────────────────

interface ArchidektCard {
  quantity: number;
  card: {
    oracleCard: {
      name: string;
    };
    edition: {
      editioncode: string;
    };
    collectorNumber: string;
  };
  modifier?: string; // "Foil", etc.
  categories?: string[];
}

interface ArchidektDeck {
  name: string;
  owner?: {
    username: string;
  };
  cards: ArchidektCard[];
}

const archidektParser: UrlParser = {
  name: 'archidekt',
  canHandle: (url: string) => {
    return /archidekt\.com\/decks\/(\d+)/i.test(url);
  },
  parse: async (url: string): Promise<UrlImportResult> => {
    // Extract deck ID from URL
    const match = url.match(/archidekt\.com\/decks\/(\d+)/i);
    if (!match) {
      throw new AppError('Invalid Archidekt URL', 400);
    }

    const deckId = match[1];
    const apiUrl = `https://archidekt.com/api/decks/${deckId}/`;

    logger.info({ deckId, apiUrl }, 'Fetching Archidekt deck');

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MTGBinder/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('Deck not found on Archidekt', 404);
      }
      throw new AppError(`Failed to fetch from Archidekt: ${response.status}`, response.status);
    }

    const deck = await response.json() as ArchidektDeck;

    const entries: ParsedDecklistEntry[] = [];
    const errors: string[] = [];

    for (const card of deck.cards) {
      try {
        const entry: ParsedDecklistEntry = {
          quantity: card.quantity,
          cardName: card.card.oracleCard.name,
          setCode: card.card.edition?.editioncode?.toUpperCase(),
          collectorNumber: card.card.collectorNumber,
          isFoil: card.modifier?.toLowerCase() === 'foil',
          category: card.categories?.[0]?.toLowerCase() || 'main',
        };
        entries.push(entry);
      } catch (e) {
        errors.push(`Failed to parse card: ${JSON.stringify(card)}`);
      }
    }

    return {
      entries,
      errors,
      deckName: deck.name,
      deckAuthor: deck.owner?.username,
      source: 'archidekt',
    };
  },
};

// ─────────────────────────────────────────────────
// Moxfield Parser
// API: https://api2.moxfield.com/v2/decks/all/{id}
// ─────────────────────────────────────────────────

interface MoxfieldCard {
  quantity: number;
  boardType: string;
  finish: string; // "nonFoil", "foil", "etched"
  card: {
    name: string;
    set: string;
    cn: string; // collector number
  };
}

interface MoxfieldDeck {
  name: string;
  publicId: string;
  createdByUser?: {
    userName: string;
  };
  mainboard?: Record<string, MoxfieldCard>;
  sideboard?: Record<string, MoxfieldCard>;
  commanders?: Record<string, MoxfieldCard>;
  companions?: Record<string, MoxfieldCard>;
  maybeboard?: Record<string, MoxfieldCard>;
}

const moxfieldParser: UrlParser = {
  name: 'moxfield',
  canHandle: (url: string) => {
    return /moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/i.test(url);
  },
  parse: async (url: string): Promise<UrlImportResult> => {
    // Extract deck ID from URL
    const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/i);
    if (!match) {
      throw new AppError('Invalid Moxfield URL', 400);
    }

    const deckId = match[1];
    const apiUrl = `https://api2.moxfield.com/v2/decks/all/${deckId}`;

    logger.info({ deckId, apiUrl }, 'Fetching Moxfield deck');

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MTGBinder/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('Deck not found on Moxfield', 404);
      }
      throw new AppError(`Failed to fetch from Moxfield: ${response.status}`, response.status);
    }

    const deck = await response.json() as MoxfieldDeck;

    const entries: ParsedDecklistEntry[] = [];
    const errors: string[] = [];

    const processCards = (cards: Record<string, MoxfieldCard> | undefined, category: string) => {
      if (!cards) return;

      for (const [, cardData] of Object.entries(cards)) {
        try {
          const entry: ParsedDecklistEntry = {
            quantity: cardData.quantity,
            cardName: cardData.card.name,
            setCode: cardData.card.set?.toUpperCase(),
            collectorNumber: cardData.card.cn,
            isFoil: cardData.finish === 'foil',
            isEtched: cardData.finish === 'etched',
            category,
          };
          entries.push(entry);
        } catch (e) {
          errors.push(`Failed to parse card from Moxfield`);
        }
      }
    };

    processCards(deck.commanders, 'commander');
    processCards(deck.companions, 'companion');
    processCards(deck.mainboard, 'main');
    processCards(deck.sideboard, 'sideboard');
    processCards(deck.maybeboard, 'maybeboard');

    return {
      entries,
      errors,
      deckName: deck.name,
      deckAuthor: deck.createdByUser?.userName,
      source: 'moxfield',
    };
  },
};

// ─────────────────────────────────────────────────
// MTGGoldfish Parser
// Download: https://www.mtggoldfish.com/deck/download/{id}
// ─────────────────────────────────────────────────

const mtggoldfishParser: UrlParser = {
  name: 'mtggoldfish',
  canHandle: (url: string) => {
    return /mtggoldfish\.com\/deck\/(\d+)/i.test(url);
  },
  parse: async (url: string): Promise<UrlImportResult> => {
    // Extract deck ID from URL
    const match = url.match(/mtggoldfish\.com\/deck\/(\d+)/i);
    if (!match) {
      throw new AppError('Invalid MTGGoldfish URL', 400);
    }

    const deckId = match[1];
    const downloadUrl = `https://www.mtggoldfish.com/deck/download/${deckId}`;

    logger.info({ deckId, downloadUrl }, 'Fetching MTGGoldfish deck');

    const response = await fetch(downloadUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'MTGBinder/1.0',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('Deck not found on MTGGoldfish', 404);
      }
      throw new AppError(`Failed to fetch from MTGGoldfish: ${response.status}`, response.status);
    }

    const text = await response.text();
    const lines = text.split('\n');

    const entries: ParsedDecklistEntry[] = [];
    const errors: string[] = [];
    let currentCategory = 'main';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        // Empty line often separates main from sideboard in MTGGoldfish
        if (entries.length > 0 && currentCategory === 'main') {
          currentCategory = 'sideboard';
        }
        continue;
      }

      // MTGGoldfish format: "4 Lightning Bolt"
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (match) {
        entries.push({
          quantity: parseInt(match[1], 10),
          cardName: match[2].trim(),
          category: currentCategory,
        });
      } else {
        errors.push(`Line ${i + 1}: Could not parse "${line}"`);
      }
    }

    return {
      entries,
      errors,
      source: 'mtggoldfish',
    };
  },
};

// ─────────────────────────────────────────────────
// Main Import Function
// ─────────────────────────────────────────────────

const parsers: UrlParser[] = [
  archidektParser,
  moxfieldParser,
  mtggoldfishParser,
];

/**
 * Import a deck from a supported URL
 */
export async function importFromUrl(url: string): Promise<UrlImportResult> {
  // Normalize URL
  const normalizedUrl = url.trim();

  // Find a parser that can handle this URL
  const parser = parsers.find((p) => p.canHandle(normalizedUrl));

  if (!parser) {
    throw new AppError(
      'Unsupported URL. Supported sites: Archidekt, Moxfield, MTGGoldfish',
      400
    );
  }

  logger.info({ url: normalizedUrl, parser: parser.name }, 'Importing from URL');

  try {
    return await parser.parse(normalizedUrl);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error({ error, url: normalizedUrl }, 'URL import failed');
    throw new AppError('Failed to import from URL. Please check the URL and try again.', 500);
  }
}

/**
 * Check if a URL is supported for import
 */
export function isUrlSupported(url: string): boolean {
  return parsers.some((p) => p.canHandle(url.trim()));
}

/**
 * Get the source name for a URL
 */
export function getUrlSource(url: string): string | null {
  const parser = parsers.find((p) => p.canHandle(url.trim()));
  return parser?.name || null;
}
