import Papa from 'papaparse';
import { api } from './api';

// ─────────────────────────────────────────────────
// Text/URL Import Types
// ─────────────────────────────────────────────────

export interface TextImportEntry {
  quantity: number;
  cardName: string;
  setCode?: string;
  collectorNumber?: string;
  isFoil?: boolean;
  isEtched?: boolean;
  category?: string;
  resolvedCard: {
    id: string;
    name: string;
    setCode: string;
    setName: string;
    scryfallId: string | null;
    priceEur: number | null;
  } | null;
  status: 'matched' | 'not_found';
}

export interface TextImportResult {
  entries: TextImportEntry[];
  errors: string[];
  detectedFormat?: string;
  stats: {
    total: number;
    matched: number;
    notFound: number;
  };
}

export interface UrlImportResult extends TextImportResult {
  deckName?: string;
  deckAuthor?: string;
  source?: string;
}

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────

export interface ParsedCSVRow {
  name: string;
  quantity: number;
  foilQuantity: number;
  condition: string;
  language: string;
  forTrade: number;
  tradePrice: number | null;
}

export interface CSVParseResult {
  rows: ParsedCSVRow[];
  errors: CSVParseError[];
}

export interface CSVParseError {
  row: number;
  message: string;
}

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

export type DuplicateMode = 'add' | 'skip' | 'replace';

export interface ImportRow {
  name: string;
  quantity?: number;
  foilQuantity?: number;
  condition?: string;
  language?: string;
  forTrade?: number;
  tradePrice?: number | null;
  cardId?: string;
}

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

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  percentage: number;
}

// ─────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────

const MAX_ROWS = 1000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const BATCH_SIZE = 50;
const SINGLE_BATCH_THRESHOLD = 100;

const VALID_CONDITIONS = ['M', 'NM', 'LP', 'MP', 'HP', 'DMG'];
const DEFAULT_CONDITION = 'NM';
const DEFAULT_LANGUAGE = 'EN';

// ─────────────────────────────────────────────────
// CSV Parsing
// ─────────────────────────────────────────────────

/**
 * Parse a CSV file into structured row data.
 * Validates format and returns parsed rows with any errors.
 */
export function parseCollectionCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      resolve({
        rows: [],
        errors: [{ row: 0, message: `File too large. Maximum size is 5MB.` }],
      });
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      resolve({
        rows: [],
        errors: [{ row: 0, message: 'File must be a CSV file (.csv extension).' }],
      });
      return;
    }

    const rows: ParsedCSVRow[] = [];
    const errors: CSVParseError[] = [];
    let rowIndex = 0;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      step: (results, parser) => {
        rowIndex++;

        // Check max rows
        if (rowIndex > MAX_ROWS) {
          errors.push({ row: rowIndex, message: `Maximum ${MAX_ROWS} rows allowed.` });
          parser.abort();
          return;
        }

        const data = results.data;

        // Validate required field: name
        const name = data.name?.trim();
        if (!name) {
          errors.push({ row: rowIndex, message: 'Missing card name.' });
          return;
        }

        // Parse and validate quantity
        const quantity = parseNonNegativeInt(data.quantity, 1);
        if (quantity === null) {
          errors.push({ row: rowIndex, message: 'Invalid quantity (must be non-negative integer).' });
          return;
        }

        // Parse and validate foilQuantity
        const foilQuantity = parseNonNegativeInt(data.foilquantity || data['foil_quantity'], 0);
        if (foilQuantity === null) {
          errors.push({ row: rowIndex, message: 'Invalid foil quantity (must be non-negative integer).' });
          return;
        }

        // Parse and validate condition
        const conditionRaw = (data.condition || DEFAULT_CONDITION).trim().toUpperCase();
        const condition = normalizeCondition(conditionRaw);
        if (!VALID_CONDITIONS.includes(condition)) {
          errors.push({ row: rowIndex, message: `Invalid condition "${conditionRaw}". Valid: M, NM, LP, MP, HP, DMG.` });
          return;
        }

        // Parse language
        const language = (data.language || DEFAULT_LANGUAGE).trim().toUpperCase();

        // Parse and validate forTrade
        const forTrade = parseNonNegativeInt(data.fortrade || data['for_trade'], 0);
        if (forTrade === null) {
          errors.push({ row: rowIndex, message: 'Invalid forTrade value (must be non-negative integer).' });
          return;
        }

        // Validate forTrade doesn't exceed total quantity
        const totalQuantity = quantity + foilQuantity;
        if (forTrade > totalQuantity) {
          errors.push({ row: rowIndex, message: `forTrade (${forTrade}) exceeds total quantity (${totalQuantity}).` });
          return;
        }

        // Parse tradePrice
        const tradePrice = parseNonNegativeFloat(data.tradeprice || data['trade_price']);

        rows.push({
          name,
          quantity,
          foilQuantity,
          condition,
          language,
          forTrade,
          tradePrice,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
      complete: () => {
        // Validate we have a 'name' column
        if (rowIndex === 0) {
          errors.unshift({ row: 0, message: 'CSV file is empty or has no valid rows.' });
        }
        resolve({ rows, errors });
      },
    });
  });
}

/**
 * Normalize condition string to short format.
 */
function normalizeCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    'MINT': 'M',
    'NEAR_MINT': 'NM',
    'NEAR MINT': 'NM',
    'NEARMINT': 'NM',
    'LIGHTLY_PLAYED': 'LP',
    'LIGHTLY PLAYED': 'LP',
    'LIGHTLYPLAYED': 'LP',
    'MODERATELY_PLAYED': 'MP',
    'MODERATELY PLAYED': 'MP',
    'MODERATELYPLAYED': 'MP',
    'HEAVILY_PLAYED': 'HP',
    'HEAVILY PLAYED': 'HP',
    'HEAVILYPLAYED': 'HP',
    'DAMAGED': 'DMG',
  };
  return conditionMap[condition] || condition;
}

/**
 * Parse a string to a non-negative integer with default.
 * Returns null if invalid.
 */
function parseNonNegativeInt(value: string | undefined, defaultValue: number): number | null {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

/**
 * Parse a string to a non-negative float.
 * Returns null if empty/invalid.
 */
function parseNonNegativeFloat(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100) / 100; // Round to 2 decimal places
}

// ─────────────────────────────────────────────────
// API Calls
// ─────────────────────────────────────────────────

/**
 * Resolve card names to their default printings (most recent set).
 */
export async function resolveCardNames(cardNames: string[]): Promise<ResolveCardsResult> {
  const response = await api.post('/import/resolve-cards', { cardNames });
  return response.data.data;
}

/**
 * Import a single batch of collection items.
 */
export async function importCollectionBatch(
  rows: ImportRow[],
  duplicateMode: DuplicateMode
): Promise<ImportResult> {
  const response = await api.post('/import/collection', { rows, duplicateMode });
  return response.data.data;
}

// ─────────────────────────────────────────────────
// Batch Processing
// ─────────────────────────────────────────────────

/**
 * Import collection items with batch processing for large imports.
 * Calls onProgress callback with progress updates for UI.
 */
export async function importCollectionBatched(
  rows: ImportRow[],
  duplicateMode: DuplicateMode,
  onProgress?: (progress: BatchProgress) => void
): Promise<ImportResult> {
  // For small imports, do a single batch
  if (rows.length <= SINGLE_BATCH_THRESHOLD) {
    onProgress?.({ currentBatch: 1, totalBatches: 1, percentage: 100 });
    return importCollectionBatch(rows, duplicateMode);
  }

  // Split into batches
  const batches: ImportRow[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  const totalBatches = batches.length;
  const combinedResult: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  let rowOffset = 0;

  // Process batches sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const currentBatch = i + 1;
    const percentage = Math.round((currentBatch / totalBatches) * 100);

    onProgress?.({ currentBatch, totalBatches, percentage });

    try {
      const result = await importCollectionBatch(batch, duplicateMode);

      // Aggregate results
      combinedResult.imported += result.imported;
      combinedResult.updated += result.updated;
      combinedResult.skipped += result.skipped;
      combinedResult.failed += result.failed;

      // Adjust error row numbers to account for batch offset
      for (const error of result.errors) {
        combinedResult.errors.push({
          ...error,
          row: error.row + rowOffset,
        });
      }
    } catch (error) {
      // If a batch fails entirely, mark all rows as failed
      combinedResult.failed += batch.length;
      const errorMessage = error instanceof Error ? error.message : 'Batch import failed';
      for (let j = 0; j < batch.length; j++) {
        combinedResult.errors.push({
          row: rowOffset + j + 1,
          cardName: batch[j].name,
          error: errorMessage,
        });
      }
    }

    rowOffset += batch.length;
  }

  return combinedResult;
}

// ─────────────────────────────────────────────────
// Preview Preparation
// ─────────────────────────────────────────────────

export interface PreviewRow extends ParsedCSVRow {
  resolvedCard: ResolvedCard['card'] | null;
  customCardId?: string; // User override from PrintingSelector
  status: 'ready' | 'not_found' | 'error';
  errorMessage?: string;
}

/**
 * Prepare preview data by resolving card names.
 * Returns rows with their resolved card data or error status.
 */
export async function prepareImportPreview(
  parsedRows: ParsedCSVRow[]
): Promise<{ previewRows: PreviewRow[]; stats: PreviewStats }> {
  // Get unique card names
  const uniqueNames = [...new Set(parsedRows.map((row) => row.name))];

  // Resolve all card names in one API call
  const resolved = await resolveCardNames(uniqueNames);

  // Build lookup map
  const cardMap = new Map<string, ResolvedCard['card']>();
  for (const item of resolved.resolved) {
    cardMap.set(item.name.toLowerCase(), item.card);
  }

  const notFoundSet = new Set(resolved.notFound.map((n) => n.toLowerCase()));

  // Map parsed rows to preview rows
  const previewRows: PreviewRow[] = parsedRows.map((row) => {
    const normalizedName = row.name.toLowerCase();
    const resolvedCard = cardMap.get(normalizedName) || null;

    if (notFoundSet.has(normalizedName)) {
      return {
        ...row,
        resolvedCard: null,
        status: 'not_found' as const,
        errorMessage: 'Card not found in database',
      };
    }

    return {
      ...row,
      resolvedCard,
      status: 'ready' as const,
    };
  });

  // Calculate stats
  const stats: PreviewStats = {
    total: previewRows.length,
    ready: previewRows.filter((r) => r.status === 'ready').length,
    notFound: previewRows.filter((r) => r.status === 'not_found').length,
    errors: previewRows.filter((r) => r.status === 'error').length,
  };

  return { previewRows, stats };
}

export interface PreviewStats {
  total: number;
  ready: number;
  notFound: number;
  errors: number;
}

/**
 * Convert preview rows to import rows, applying any custom card selections.
 */
export function previewRowsToImportRows(previewRows: PreviewRow[]): ImportRow[] {
  return previewRows
    .filter((row) => row.status === 'ready' || row.customCardId)
    .map((row) => ({
      name: row.name,
      quantity: row.quantity,
      foilQuantity: row.foilQuantity,
      condition: row.condition,
      language: row.language,
      forTrade: row.forTrade,
      tradePrice: row.tradePrice,
      cardId: row.customCardId || row.resolvedCard?.id,
    }));
}

// ─────────────────────────────────────────────────
// Template Download
// ─────────────────────────────────────────────────

const CSV_TEMPLATE = `name,quantity,foilQuantity,condition,language,forTrade,tradePrice
Lightning Bolt,4,0,NM,EN,2,0.50
Black Lotus,1,1,LP,EN,0,
Sol Ring,10,2,M,EN,5,1.20`;

/**
 * Download a sample CSV template file.
 */
export function downloadCSVTemplate(): void {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'collection-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────
// Wishlist CSV Parsing
// ─────────────────────────────────────────────────

export interface ParsedWishlistCSVRow {
  name: string;
  quantity: number;
  priority: string;
  maxPrice: number | null;
  minCondition: string | null;
  foilOnly: boolean;
}

const VALID_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const DEFAULT_PRIORITY = 'NORMAL';

/**
 * Parse a wishlist CSV file into structured row data.
 * Validates format and returns parsed rows with any errors.
 */
export function parseWishlistCSV(file: File): Promise<{ rows: ParsedWishlistCSVRow[]; errors: CSVParseError[] }> {
  return new Promise((resolve, reject) => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      resolve({
        rows: [],
        errors: [{ row: 0, message: `File too large. Maximum size is 5MB.` }],
      });
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      resolve({
        rows: [],
        errors: [{ row: 0, message: 'File must be a CSV file (.csv extension).' }],
      });
      return;
    }

    const rows: ParsedWishlistCSVRow[] = [];
    const errors: CSVParseError[] = [];
    let rowIndex = 0;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      step: (results, parser) => {
        rowIndex++;

        // Check max rows
        if (rowIndex > MAX_ROWS) {
          errors.push({ row: rowIndex, message: `Maximum ${MAX_ROWS} rows allowed.` });
          parser.abort();
          return;
        }

        const data = results.data;

        // Validate required field: name
        const name = data.name?.trim();
        if (!name) {
          errors.push({ row: rowIndex, message: 'Missing card name.' });
          return;
        }

        // Parse and validate quantity
        const quantity = parseNonNegativeInt(data.quantity, 1);
        if (quantity === null) {
          errors.push({ row: rowIndex, message: 'Invalid quantity (must be positive integer).' });
          return;
        }
        if (quantity < 1) {
          errors.push({ row: rowIndex, message: 'Quantity must be at least 1.' });
          return;
        }

        // Parse and validate priority
        const priorityRaw = (data.priority || DEFAULT_PRIORITY).trim().toUpperCase();
        if (!VALID_PRIORITIES.includes(priorityRaw)) {
          errors.push({ row: rowIndex, message: `Invalid priority "${priorityRaw}". Valid: LOW, NORMAL, HIGH, URGENT.` });
          return;
        }

        // Parse maxPrice
        const maxPriceRaw = data.maxprice || data['max_price'];
        const maxPrice = parseNonNegativeFloat(maxPriceRaw);

        // Parse and validate minCondition
        const minConditionRaw = data.mincondition || data['min_condition'];
        let minCondition: string | null = null;
        if (minConditionRaw) {
          const normalized = normalizeCondition(minConditionRaw.trim().toUpperCase());
          if (!VALID_CONDITIONS.includes(normalized)) {
            errors.push({ row: rowIndex, message: `Invalid minCondition "${minConditionRaw}". Valid: M, NM, LP, MP, HP, DMG.` });
            return;
          }
          minCondition = normalized;
        }

        // Parse foilOnly
        const foilOnlyRaw = data.foilonly || data['foil_only'];
        const foilOnly = parseBooleanField(foilOnlyRaw);

        rows.push({
          name,
          quantity,
          priority: priorityRaw,
          maxPrice,
          minCondition,
          foilOnly,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
      complete: () => {
        // Validate we have a 'name' column
        if (rowIndex === 0) {
          errors.unshift({ row: 0, message: 'CSV file is empty or has no valid rows.' });
        }
        resolve({ rows, errors });
      },
    });
  });
}

/**
 * Parse a boolean field from CSV.
 */
function parseBooleanField(value: string | undefined): boolean {
  if (!value || value.trim() === '') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

// ─────────────────────────────────────────────────
// Wishlist Preview Preparation
// ─────────────────────────────────────────────────

export interface WishlistPreviewRow extends ParsedWishlistCSVRow {
  resolvedCard: ResolvedCard['card'] | null;
  customCardId?: string; // User override from PrintingSelector
  inCollection: boolean; // Whether user owns this card
  status: 'ready' | 'not_found' | 'error';
  errorMessage?: string;
}

/**
 * Prepare wishlist preview data by resolving card names and checking collection.
 */
export async function prepareWishlistImportPreview(
  parsedRows: ParsedWishlistCSVRow[]
): Promise<{ previewRows: WishlistPreviewRow[]; stats: PreviewStats }> {
  // Get unique card names
  const uniqueNames = [...new Set(parsedRows.map((row) => row.name))];

  // Resolve all card names in one API call
  const resolved = await resolveCardNames(uniqueNames);

  // Build lookup map
  const cardMap = new Map<string, ResolvedCard['card']>();
  for (const item of resolved.resolved) {
    cardMap.set(item.name.toLowerCase(), item.card);
  }

  const notFoundSet = new Set(resolved.notFound.map((n) => n.toLowerCase()));

  // Get user's collection to check ownership
  const collectionResponse = await api.get('/collection', { params: { pageSize: 10000 } });
  const collectionCardIds = new Set(
    collectionResponse.data.data.map((item: any) => item.cardId)
  );

  // Map parsed rows to preview rows
  const previewRows: WishlistPreviewRow[] = parsedRows.map((row) => {
    const normalizedName = row.name.toLowerCase();
    const resolvedCard = cardMap.get(normalizedName) || null;
    const inCollection = resolvedCard ? collectionCardIds.has(resolvedCard.id) : false;

    if (notFoundSet.has(normalizedName)) {
      return {
        ...row,
        resolvedCard: null,
        inCollection: false,
        status: 'not_found' as const,
        errorMessage: 'Card not found in database',
      };
    }

    return {
      ...row,
      resolvedCard,
      inCollection,
      status: 'ready' as const,
    };
  });

  // Calculate stats
  const stats: PreviewStats = {
    total: previewRows.length,
    ready: previewRows.filter((r) => r.status === 'ready').length,
    notFound: previewRows.filter((r) => r.status === 'not_found').length,
    errors: previewRows.filter((r) => r.status === 'error').length,
  };

  return { previewRows, stats };
}

/**
 * Convert wishlist preview rows to import rows.
 */
export function wishlistPreviewRowsToImportRows(previewRows: WishlistPreviewRow[]): any[] {
  return previewRows
    .filter((row) => row.status === 'ready' || row.customCardId)
    .map((row) => ({
      name: row.name,
      quantity: row.quantity,
      priority: row.priority,
      tradePrice: row.maxPrice, // Using tradePrice field for maxPrice
      condition: row.minCondition,
      foilOnly: row.foilOnly,
      cardId: row.customCardId || row.resolvedCard?.id,
    }));
}

/**
 * Import a single batch of wishlist items.
 */
export async function importWishlistBatch(
  rows: any[],
  duplicateMode: 'skip' | 'update'
): Promise<ImportResult> {
  const response = await api.post('/import/wishlist', { rows, duplicateMode });
  return response.data.data;
}

/**
 * Import wishlist items with batch processing for large imports.
 */
export async function importWishlistBatched(
  rows: any[],
  duplicateMode: 'skip' | 'update',
  onProgress?: (progress: BatchProgress) => void
): Promise<ImportResult> {
  // For small imports, do a single batch
  if (rows.length <= SINGLE_BATCH_THRESHOLD) {
    onProgress?.({ currentBatch: 1, totalBatches: 1, percentage: 100 });
    return importWishlistBatch(rows, duplicateMode);
  }

  // Split into batches
  const batches: any[][] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  const totalBatches = batches.length;
  const combinedResult: ImportResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  let rowOffset = 0;

  // Process batches sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const currentBatch = i + 1;
    const percentage = Math.round((currentBatch / totalBatches) * 100);

    onProgress?.({ currentBatch, totalBatches, percentage });

    try {
      const result = await importWishlistBatch(batch, duplicateMode);

      // Aggregate results
      combinedResult.imported += result.imported;
      combinedResult.updated += result.updated;
      combinedResult.skipped += result.skipped;
      combinedResult.failed += result.failed;

      // Adjust error row numbers to account for batch offset
      for (const error of result.errors) {
        combinedResult.errors.push({
          ...error,
          row: error.row + rowOffset,
        });
      }
    } catch (error) {
      // If a batch fails entirely, mark all rows as failed
      combinedResult.failed += batch.length;
      const errorMessage = error instanceof Error ? error.message : 'Batch import failed';
      for (let j = 0; j < batch.length; j++) {
        combinedResult.errors.push({
          row: rowOffset + j + 1,
          cardName: batch[j].name,
          error: errorMessage,
        });
      }
    }

    rowOffset += batch.length;
  }

  return combinedResult;
}

// ─────────────────────────────────────────────────
// Wishlist CSV Template
// ─────────────────────────────────────────────────

const WISHLIST_CSV_TEMPLATE = `name,quantity,priority,maxPrice,minCondition,foilOnly
Lightning Bolt,4,HIGH,2.00,NM,false
Force of Will,1,URGENT,80.00,LP,false
Mana Crypt,1,HIGH,150.00,NM,true`;

/**
 * Download a sample wishlist CSV template file.
 */
export function downloadWishlistCSVTemplate(): void {
  const blob = new Blob([WISHLIST_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'wishlist-import-template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────
// Text/URL Import API
// ─────────────────────────────────────────────────

/**
 * Parse plain text decklist and return preview.
 */
export async function parseTextImport(
  text: string,
  targetType: 'collection' | 'wishlist'
): Promise<TextImportResult> {
  const response = await api.post('/import/parse-text', { text, targetType });
  return response.data.data;
}

/**
 * Fetch and parse deck from URL.
 */
export async function importFromUrl(
  url: string,
  targetType: 'collection' | 'wishlist'
): Promise<UrlImportResult> {
  const response = await api.post('/import/from-url', { url, targetType });
  return response.data.data;
}

/**
 * Convert text import entries to CSV-style preview rows for collection import.
 */
export function textEntriesToPreviewRows(entries: TextImportEntry[]): PreviewRow[] {
  return entries.map((entry): PreviewRow => {
    // Handle foil: if entry.isFoil, put quantity in foilQuantity
    const quantity = entry.isFoil ? 0 : entry.quantity;
    const foilQuantity = entry.isFoil ? entry.quantity : 0;

    return {
      name: entry.cardName,
      quantity,
      foilQuantity,
      condition: 'NM',
      language: 'EN',
      forTrade: 0,
      tradePrice: null,
      resolvedCard: entry.resolvedCard,
      status: entry.status === 'matched' ? 'ready' : 'not_found',
      errorMessage: entry.status === 'not_found' ? 'Card not found in database' : undefined,
    };
  });
}

/**
 * Convert text import entries to wishlist preview rows.
 */
export function textEntriesToWishlistRows(entries: TextImportEntry[]): WishlistPreviewRow[] {
  return entries.map((entry): WishlistPreviewRow => ({
    name: entry.cardName,
    quantity: entry.quantity,
    priority: 'NORMAL',
    maxPrice: null,
    minCondition: null,
    foilOnly: entry.isFoil || false,
    resolvedCard: entry.resolvedCard,
    inCollection: false, // Will be updated by caller if needed
    status: entry.status === 'matched' ? 'ready' : 'not_found',
    errorMessage: entry.status === 'not_found' ? 'Card not found in database' : undefined,
  }));
}
