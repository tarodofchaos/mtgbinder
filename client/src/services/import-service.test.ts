import { describe, it, expect } from 'vitest';
import {
  parseCollectionCSV,
  previewRowsToImportRows,
  PreviewRow,
} from './import-service';

// Mock papaparse - we'll test with real parsing but mock the File API
const createMockFile = (content: string, name = 'test.csv'): File => {
  const blob = new Blob([content], { type: 'text/csv' });
  return new File([blob], name, { type: 'text/csv' });
};

describe('import-service', () => {
  describe('parseCollectionCSV', () => {
    it('should parse a valid CSV with all columns', async () => {
      const csv = `name,quantity,foilQuantity,condition,language,forTrade,tradePrice
Lightning Bolt,4,1,NM,EN,2,0.50
Sol Ring,10,0,LP,EN,5,1.20`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(2);

      expect(result.rows[0]).toEqual({
        name: 'Lightning Bolt',
        quantity: 4,
        foilQuantity: 1,
        condition: 'NM',
        language: 'EN',
        forTrade: 2,
        tradePrice: 0.5,
      });

      expect(result.rows[1]).toEqual({
        name: 'Sol Ring',
        quantity: 10,
        foilQuantity: 0,
        condition: 'LP',
        language: 'EN',
        forTrade: 5,
        tradePrice: 1.2,
      });
    });

    it('should use default values for optional columns', async () => {
      const csv = `name
Lightning Bolt
Sol Ring`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(2);

      expect(result.rows[0]).toEqual({
        name: 'Lightning Bolt',
        quantity: 1, // default
        foilQuantity: 0, // default
        condition: 'NM', // default
        language: 'EN', // default
        forTrade: 0, // default
        tradePrice: null, // default
      });
    });

    it('should handle case-insensitive headers', async () => {
      const csv = `NAME,QUANTITY,FOILQUANTITY,CONDITION
Lightning Bolt,4,1,LP`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].name).toBe('Lightning Bolt');
      expect(result.rows[0].quantity).toBe(4);
      expect(result.rows[0].foilQuantity).toBe(1);
      expect(result.rows[0].condition).toBe('LP');
    });

    it('should normalize long condition names', async () => {
      const csv = `name,condition
Card1,NEAR_MINT
Card2,Lightly Played
Card3,DAMAGED`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].condition).toBe('NM');
      expect(result.rows[1].condition).toBe('LP');
      expect(result.rows[2].condition).toBe('DMG');
    });

    it('should report error for missing card name', async () => {
      const csv = `name,quantity
Lightning Bolt,4
,2
Sol Ring,1`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.rows).toHaveLength(2); // Only valid rows
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].message).toContain('Missing card name');
    });

    it('should report error for invalid quantity', async () => {
      const csv = `name,quantity
Lightning Bolt,four
Sol Ring,-1`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toContain('Invalid quantity');
      expect(result.errors[1].message).toContain('Invalid quantity');
    });

    it('should report error for invalid condition', async () => {
      const csv = `name,condition
Lightning Bolt,EXCELLENT`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Invalid condition');
    });

    it('should report error when forTrade exceeds total quantity', async () => {
      const csv = `name,quantity,foilQuantity,forTrade
Lightning Bolt,2,1,5`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('forTrade');
      expect(result.errors[0].message).toContain('exceeds');
    });

    it('should skip empty rows', async () => {
      const csv = `name,quantity
Lightning Bolt,4

Sol Ring,2

`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(2);
    });

    it('should reject non-CSV files', async () => {
      const file = createMockFile('some content', 'test.txt');
      const result = await parseCollectionCSV(file);

      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('CSV');
    });

    it('should reject files larger than 5MB', async () => {
      // Create a file object with size > 5MB
      const largeContent = 'a'.repeat(6 * 1024 * 1024);
      const file = createMockFile(largeContent);

      const result = await parseCollectionCSV(file);

      expect(result.rows).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('5MB');
    });

    it('should handle underscore-separated column names', async () => {
      const csv = `name,foil_quantity,for_trade,trade_price
Lightning Bolt,2,1,0.50`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].foilQuantity).toBe(2);
      expect(result.rows[0].forTrade).toBe(1);
      expect(result.rows[0].tradePrice).toBe(0.5);
    });

    it('should round tradePrice to 2 decimal places', async () => {
      const csv = `name,tradePrice
Lightning Bolt,1.999`;

      const file = createMockFile(csv);
      const result = await parseCollectionCSV(file);

      expect(result.errors).toHaveLength(0);
      expect(result.rows[0].tradePrice).toBe(2);
    });
  });

  describe('previewRowsToImportRows', () => {
    it('should filter out not_found rows without custom selection', () => {
      const previewRows: PreviewRow[] = [
        {
          name: 'Found Card',
          quantity: 1,
          foilQuantity: 0,
          condition: 'NM',
          language: 'EN',
          forTrade: 0,
          tradePrice: null,
          resolvedCard: {
            id: 'card-1',
            name: 'Found Card',
            setCode: 'M21',
            setName: 'Core 2021',
            scryfallId: 'scry-1',
            priceEur: 1.0,
          },
          status: 'ready',
        },
        {
          name: 'Not Found Card',
          quantity: 1,
          foilQuantity: 0,
          condition: 'NM',
          language: 'EN',
          forTrade: 0,
          tradePrice: null,
          resolvedCard: null,
          status: 'not_found',
        },
      ];

      const importRows = previewRowsToImportRows(previewRows);

      expect(importRows).toHaveLength(1);
      expect(importRows[0].name).toBe('Found Card');
    });

    it('should include not_found rows with custom cardId', () => {
      const previewRows: PreviewRow[] = [
        {
          name: 'Custom Selection',
          quantity: 2,
          foilQuantity: 0,
          condition: 'LP',
          language: 'EN',
          forTrade: 1,
          tradePrice: 0.5,
          resolvedCard: null,
          customCardId: 'custom-card-id',
          status: 'not_found',
        },
      ];

      const importRows = previewRowsToImportRows(previewRows);

      expect(importRows).toHaveLength(1);
      expect(importRows[0].cardId).toBe('custom-card-id');
      expect(importRows[0].quantity).toBe(2);
    });

    it('should prefer customCardId over resolvedCard.id', () => {
      const previewRows: PreviewRow[] = [
        {
          name: 'Card',
          quantity: 1,
          foilQuantity: 0,
          condition: 'NM',
          language: 'EN',
          forTrade: 0,
          tradePrice: null,
          resolvedCard: {
            id: 'resolved-id',
            name: 'Card',
            setCode: 'M21',
            setName: 'Core 2021',
            scryfallId: 'scry-1',
            priceEur: 1.0,
          },
          customCardId: 'custom-override-id',
          status: 'ready',
        },
      ];

      const importRows = previewRowsToImportRows(previewRows);

      expect(importRows[0].cardId).toBe('custom-override-id');
    });

    it('should preserve all row data in import rows', () => {
      const previewRows: PreviewRow[] = [
        {
          name: 'Test Card',
          quantity: 5,
          foilQuantity: 2,
          condition: 'LP',
          language: 'DE',
          forTrade: 3,
          tradePrice: 1.5,
          resolvedCard: {
            id: 'card-id',
            name: 'Test Card',
            setCode: 'TST',
            setName: 'Test Set',
            scryfallId: 'scry-1',
            priceEur: 2.0,
          },
          status: 'ready',
        },
      ];

      const importRows = previewRowsToImportRows(previewRows);

      expect(importRows[0]).toEqual({
        name: 'Test Card',
        quantity: 5,
        foilQuantity: 2,
        condition: 'LP',
        language: 'DE',
        forTrade: 3,
        tradePrice: 1.5,
        cardId: 'card-id',
      });
    });
  });
});
