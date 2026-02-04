export interface ParsedDecklistEntry {
  quantity: number;
  cardName: string;
  setCode?: string;
  collectorNumber?: string;
  isFoil?: boolean;
  isEtched?: boolean;
  category?: string; // 'main', 'sideboard', 'commander', 'companion', etc.
}

export type DetectedFormat = 'manabox' | 'moxfield' | 'archidekt' | 'arena' | 'generic';

export interface ParsedDecklist {
  entries: ParsedDecklistEntry[];
  errors: string[];
  detectedFormat: DetectedFormat;
}

/**
 * Parses a decklist string into structured entries
 * Supports formats from:
 * - ManaBox: "4 Tarmogoyf" or "3 Verdant Catacombs (MH2) 260"
 * - Moxfield: "1 Card Name (SET) 123 *F*" (foil) or "*E*" (etched)
 * - Archidekt: "1x Card Name (set) 123 [Category]"
 * - Arena/MTGO: "4 Lightning Bolt (SET) 123"
 * - Generic: "4 Lightning Bolt", "4x Card", "Card x4"
 */
export function parseDecklist(decklistText: string): ParsedDecklist {
  const entries: ParsedDecklistEntry[] = [];
  const errors: string[] = [];
  const lines = decklistText.split('\n');

  // Detect format first
  const detectedFormat = detectFormat(lines);

  let currentCategory = 'main';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Check for category/section markers
    const categoryMarker = parseCategoryMarker(line);
    if (categoryMarker) {
      currentCategory = categoryMarker;
      continue;
    }

    // Try to parse the line
    const parsed = parseDecklistLine(line, detectedFormat, currentCategory);

    if (parsed) {
      entries.push(parsed);
    } else {
      // Only log as error if line has content but couldn't be parsed
      errors.push(`Line ${lineNumber}: Could not parse "${line}"`);
    }
  }

  return { entries, errors, detectedFormat };
}

/**
 * Detect the format of the decklist based on line patterns
 */
function detectFormat(lines: string[]): DetectedFormat {
  let hasXQuantity = false; // 1x Card (Archidekt)
  let hasFoilMarker = false; // *F* or *E* (Moxfield)
  let hasBracketTag = false; // [Category] (Archidekt)
  let hasCollectorNum = false; // (SET) 123
  let lineCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isCategoryMarker(trimmed)) continue;

    lineCount++;
    if (lineCount > 20) break; // Sample first 20 lines

    // Check for 1x pattern (Archidekt)
    if (/^\d+x\s+/i.test(trimmed)) {
      hasXQuantity = true;
    }

    // Check for foil markers (Moxfield)
    if (/\*[FE]\*\s*$/i.test(trimmed)) {
      hasFoilMarker = true;
    }

    // Check for bracket tags (Archidekt)
    if (/\[.+\]\s*$/.test(trimmed)) {
      hasBracketTag = true;
    }

    // Check for collector number after set code
    if (/\([A-Z0-9]{2,5}\)\s+\d+/.test(trimmed)) {
      hasCollectorNum = true;
    }
  }

  // Determine format based on patterns
  if (hasFoilMarker) {
    return 'moxfield';
  }
  if (hasXQuantity && hasBracketTag) {
    return 'archidekt';
  }
  if (hasXQuantity) {
    return 'archidekt';
  }
  if (hasCollectorNum && !hasFoilMarker && !hasBracketTag) {
    return 'manabox';
  }
  if (hasCollectorNum) {
    return 'arena';
  }

  return 'generic';
}

/**
 * Check if a line is a category/section marker
 */
function isCategoryMarker(line: string): boolean {
  const normalized = line.toLowerCase();
  return (
    /^(sideboard|sb|mainboard|main|deck|commander|companion|maybeboard|considering):?\s*$/i.test(line) ||
    /^\/\/\s*(sideboard|mainboard|main|deck|commander|companion)/i.test(line)
  );
}

/**
 * Parse category/section markers
 * Returns the category name or null if not a marker
 */
function parseCategoryMarker(line: string): string | null {
  const normalized = line.toLowerCase().trim();

  // Standard markers: "Sideboard:" or "SB:"
  if (/^(sideboard|sb):?\s*$/i.test(normalized)) {
    return 'sideboard';
  }
  if (/^(mainboard|main|deck):?\s*$/i.test(normalized)) {
    return 'main';
  }
  if (/^commander:?\s*$/i.test(normalized)) {
    return 'commander';
  }
  if (/^companion:?\s*$/i.test(normalized)) {
    return 'companion';
  }
  if (/^(maybeboard|considering):?\s*$/i.test(normalized)) {
    return 'maybeboard';
  }

  // Arena-style markers: "Deck" or "Sideboard" on their own line
  if (normalized === 'deck') {
    return 'main';
  }
  if (normalized === 'sideboard') {
    return 'sideboard';
  }

  // Comment-style markers: "// Sideboard"
  const commentMatch = normalized.match(/^\/\/\s*(sideboard|mainboard|main|deck|commander|companion)/i);
  if (commentMatch) {
    const category = commentMatch[1].toLowerCase();
    if (category === 'mainboard' || category === 'main' || category === 'deck') {
      return 'main';
    }
    return category;
  }

  return null;
}

/**
 * Parse a single decklist line
 * Returns null if the line cannot be parsed
 */
function parseDecklistLine(
  line: string,
  format: DetectedFormat,
  currentCategory: string
): ParsedDecklistEntry | null {
  // Extract foil/etched markers first (Moxfield style)
  let isFoil = false;
  let isEtched = false;
  let workingLine = line;

  const foilMatch = workingLine.match(/\s*\*([FE])\*\s*$/i);
  if (foilMatch) {
    if (foilMatch[1].toUpperCase() === 'F') {
      isFoil = true;
    } else if (foilMatch[1].toUpperCase() === 'E') {
      isEtched = true;
    }
    workingLine = workingLine.replace(/\s*\*[FE]\*\s*$/i, '').trim();
  }

  // Extract category tag (Archidekt style: [Category])
  let category = currentCategory;
  const categoryMatch = workingLine.match(/\s*\[([^\]]+)\]\s*$/);
  if (categoryMatch) {
    category = categoryMatch[1].toLowerCase();
    workingLine = workingLine.replace(/\s*\[[^\]]+\]\s*$/, '').trim();
  }

  // Try different parsing patterns

  // Pattern 1: "4 Card Name" or "4 Card Name (SET)" or "4 Card Name (SET) 123"
  const prefixMatch = workingLine.match(/^(\d+)\s+(.+)$/);
  if (prefixMatch) {
    const quantity = parseInt(prefixMatch[1], 10);
    const cardPart = prefixMatch[2].trim();
    const result = extractCardDetails(cardPart, quantity);
    return { ...result, isFoil, isEtched, category };
  }

  // Pattern 2: "4x Card Name" (Archidekt style)
  const prefixXMatch = workingLine.match(/^(\d+)x\s+(.+)$/i);
  if (prefixXMatch) {
    const quantity = parseInt(prefixXMatch[1], 10);
    const cardPart = prefixXMatch[2].trim();
    const result = extractCardDetails(cardPart, quantity);
    return { ...result, isFoil, isEtched, category };
  }

  // Pattern 3: "Card Name x4" (suffix quantity)
  const suffixMatch = workingLine.match(/^(.+?)\s+x(\d+)$/i);
  if (suffixMatch) {
    const quantity = parseInt(suffixMatch[2], 10);
    const cardPart = suffixMatch[1].trim();
    const result = extractCardDetails(cardPart, quantity);
    return { ...result, isFoil, isEtched, category };
  }

  // Could not parse
  return null;
}

/**
 * Extract card name, set code, and collector number from a card part
 * Handles:
 * - "Lightning Bolt" -> { cardName: "Lightning Bolt" }
 * - "Lightning Bolt (M10)" -> { cardName: "Lightning Bolt", setCode: "M10" }
 * - "Lightning Bolt (M10) 123" -> { cardName: "Lightning Bolt", setCode: "M10", collectorNumber: "123" }
 * - "Lightning Bolt (MH2) 260★" -> handles special collector numbers
 */
function extractCardDetails(cardPart: string, quantity: number): ParsedDecklistEntry {
  // Pattern: Card Name (SET) CollectorNumber (collector number may have special chars)
  const fullMatch = cardPart.match(/^(.+?)\s*\(([A-Z0-9]{2,5})\)\s*(\S+)\s*$/i);
  if (fullMatch) {
    return {
      quantity,
      cardName: fullMatch[1].trim(),
      setCode: fullMatch[2].toUpperCase(),
      collectorNumber: fullMatch[3].trim(),
    };
  }

  // Pattern: Card Name (SET) - no collector number
  const setMatch = cardPart.match(/^(.+?)\s*\(([A-Z0-9]{2,5})\)\s*$/i);
  if (setMatch) {
    return {
      quantity,
      cardName: setMatch[1].trim(),
      setCode: setMatch[2].toUpperCase(),
    };
  }

  // Just card name
  return {
    quantity,
    cardName: cardPart.trim(),
  };
}

/**
 * Parse text specifically for collection import (handles foil quantities)
 * Returns entries with foil/non-foil properly separated
 */
export interface CollectionImportEntry {
  cardName: string;
  quantity: number;
  foilQuantity: number;
  setCode?: string;
  collectorNumber?: string;
  condition?: string;
  language?: string;
}

export function parseDecklistForCollection(decklistText: string): {
  entries: CollectionImportEntry[];
  errors: string[];
  detectedFormat: DetectedFormat;
} {
  const { entries, errors, detectedFormat } = parseDecklist(decklistText);

  // Convert to collection format, handling foil markers
  const collectionEntries: CollectionImportEntry[] = entries.map((entry) => {
    if (entry.isFoil) {
      return {
        cardName: entry.cardName,
        quantity: 0,
        foilQuantity: entry.quantity,
        setCode: entry.setCode,
        collectorNumber: entry.collectorNumber,
      };
    }
    return {
      cardName: entry.cardName,
      quantity: entry.quantity,
      foilQuantity: 0,
      setCode: entry.setCode,
      collectorNumber: entry.collectorNumber,
    };
  });

  return { entries: collectionEntries, errors, detectedFormat };
}
