export interface ParsedDecklistEntry {
  quantity: number;
  cardName: string;
  setCode?: string;
}

export interface ParsedDecklist {
  entries: ParsedDecklistEntry[];
  errors: string[];
}

/**
 * Parses a decklist string into structured entries
 * Supports formats:
 * - "4 Lightning Bolt"
 * - "4x Card Name"
 * - "Card Name x4"
 * - "4 Lightning Bolt (M10)"
 *
 * Ignores:
 * - Empty lines
 * - Sideboard markers ("Sideboard:", "SB:")
 * - Lines without quantities
 */
export function parseDecklist(decklistText: string): ParsedDecklist {
  const entries: ParsedDecklistEntry[] = [];
  const errors: string[] = [];
  const lines = decklistText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    // Skip empty lines
    if (!line) {
      continue;
    }

    // Skip sideboard markers (case insensitive)
    if (/^(sideboard|sb):?$/i.test(line)) {
      continue;
    }

    // Try to parse the line
    const parsed = parseDecklistLine(line);

    if (parsed) {
      entries.push(parsed);
    } else {
      // Only log as error if line has content but couldn't be parsed
      errors.push(`Line ${lineNumber}: Could not parse "${line}"`);
    }
  }

  return { entries, errors };
}

/**
 * Parse a single decklist line
 * Returns null if the line cannot be parsed
 */
function parseDecklistLine(line: string): ParsedDecklistEntry | null {
  // Pattern 1: "4 Lightning Bolt" or "4 Lightning Bolt (M10)"
  // Pattern 2: "4x Lightning Bolt" or "4x Lightning Bolt (M10)"
  const prefixMatch = line.match(/^(\d+)x?\s+(.+)$/i);

  if (prefixMatch) {
    const quantity = parseInt(prefixMatch[1], 10);
    const cardPart = prefixMatch[2].trim();
    return extractCardNameAndSet(cardPart, quantity);
  }

  // Pattern 3: "Lightning Bolt x4" or "Lightning Bolt (M10) x4"
  const suffixMatch = line.match(/^(.+?)\s+x(\d+)$/i);

  if (suffixMatch) {
    const quantity = parseInt(suffixMatch[2], 10);
    const cardPart = suffixMatch[1].trim();
    return extractCardNameAndSet(cardPart, quantity);
  }

  // Could not parse
  return null;
}

/**
 * Extract card name and optional set code from a card part
 * Handles: "Lightning Bolt (M10)" -> { cardName: "Lightning Bolt", setCode: "M10" }
 * Handles: "Lightning Bolt" -> { cardName: "Lightning Bolt" }
 */
function extractCardNameAndSet(cardPart: string, quantity: number): ParsedDecklistEntry {
  // Check for set code in parentheses at the end
  const setMatch = cardPart.match(/^(.+?)\s*\(([A-Z0-9]+)\)$/i);

  if (setMatch) {
    return {
      quantity,
      cardName: setMatch[1].trim(),
      setCode: setMatch[2].toUpperCase(),
    };
  }

  return {
    quantity,
    cardName: cardPart.trim(),
  };
}
