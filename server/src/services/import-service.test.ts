import { CardCondition } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { resolveCardNames, importCollectionItems, resolveEntriesWithPrintings } from './import-service';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    card: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    collectionItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('import-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveCardNames', () => {
    it('should return empty results for empty input', async () => {
      const result = await resolveCardNames([]);
      expect(result).toEqual({ resolved: [], notFound: [] });
      expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('should resolve card names to their most recent printings', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Lightning Bolt',
          setCode: 'M21',
          setName: 'Core Set 2021',
          scryfallId: 'scry-1',
          priceEur: 0.5,
        },
        {
          id: 'card-2',
          name: 'Sol Ring',
          setCode: 'CMR',
          setName: 'Commander Legends',
          scryfallId: 'scry-2',
          priceEur: 1.2,
        },
      ];

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(mockCards);

      const result = await resolveCardNames(['Lightning Bolt', 'Sol Ring']);

      expect(result.resolved).toHaveLength(2);
      expect(result.resolved[0].name).toBe('Lightning Bolt');
      expect(result.resolved[0].card.id).toBe('card-1');
      expect(result.resolved[1].name).toBe('Sol Ring');
      expect(result.resolved[1].card.id).toBe('card-2');
      expect(result.notFound).toHaveLength(0);
    });

    it('should resolve Spanish card names', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Lightning Bolt',
          nameEs: 'Rayo',
          setCode: 'M21',
          setName: 'Core Set 2021',
          scryfallId: 'scry-1',
          priceEur: 0.5,
        },
      ];

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(mockCards);

      const result = await resolveCardNames(['Rayo']);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].name).toBe('Rayo');
      expect(result.resolved[0].card.name).toBe('Lightning Bolt');
      expect(result.resolved[0].card.id).toBe('card-1');
      expect(result.notFound).toHaveLength(0);
    });

    it('should handle case-insensitive matching', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Lightning Bolt',
          setCode: 'M21',
          setName: 'Core Set 2021',
          scryfallId: 'scry-1',
          priceEur: 0.5,
        },
      ];

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(mockCards);

      const result = await resolveCardNames(['LIGHTNING BOLT', 'lightning bolt']);

      // Should return both original names matched to the same card
      expect(result.resolved).toHaveLength(2);
      expect(result.resolved[0].name).toBe('LIGHTNING BOLT');
      expect(result.resolved[1].name).toBe('lightning bolt');
      expect(result.notFound).toHaveLength(0);
    });

    it('should report cards not found in database', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Lightning Bolt',
          setCode: 'M21',
          setName: 'Core Set 2021',
          scryfallId: 'scry-1',
          priceEur: 0.5,
        },
      ];

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(mockCards);

      const result = await resolveCardNames(['Lightning Bolt', 'Fake Card Name']);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].name).toBe('Lightning Bolt');
      expect(result.notFound).toEqual(['Fake Card Name']);
    });

    it('should handle Art Series: prefix by stripping it and prioritizing Art Series sets', async () => {
      const mockCards = [
        {
          id: 'card-regular',
          name: 'Diversion Specialist',
          setCode: 'DSK',
          setName: 'Duskmourn',
          scryfallId: 'scry-reg',
          priceEur: 0.5,
        },
        {
          id: 'card-art',
          name: 'Diversion Specialist',
          setCode: 'ADSK',
          setName: 'Duskmourn Art Series',
          scryfallId: 'scry-art',
          priceEur: 0.2,
        },
      ];

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(mockCards);

      const result = await resolveCardNames(['Art Series: Diversion Specialist']);

      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].name).toBe('Art Series: Diversion Specialist');
      expect(result.resolved[0].card.id).toBe('card-art');
      expect(result.resolved[0].card.setName).toBe('Duskmourn Art Series');
      expect(result.notFound).toHaveLength(0);
    });

    it('should deduplicate card names before querying', async () => {
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      await resolveCardNames(['Card A', 'Card A', 'card a']);

      // The query should be called with deduplicated lowercase names
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
    });
  });

  describe('importCollectionItems', () => {
    const mockUserId = 'user-123';
    const mockCardId = 'card-456';

    // Helper to setup transaction mock
    const setupTransactionMock = () => {
      const mockTx = {
        card: {
          findUnique: jest.fn(),
        },
        collectionItem: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
      };

      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      return mockTx;
    };

    it('should create new collection items when none exist', async () => {
      const mockTx = setupTransactionMock();
      mockTx.card.findUnique.mockResolvedValue({ id: mockCardId });
      mockTx.collectionItem.findUnique.mockResolvedValue(null);
      mockTx.collectionItem.create.mockResolvedValue({ id: 'item-1' });

      const cardNameToIdMap = new Map([['lightning bolt', mockCardId]]);

      const result = await importCollectionItems(
        mockUserId,
        [{ name: 'Lightning Bolt', quantity: 4, condition: 'NM' }],
        'add',
        cardNameToIdMap
      );

      expect(result.imported).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(mockTx.collectionItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          cardId: mockCardId,
          quantity: 4,
          condition: CardCondition.NM,
        }),
      });
    });

    describe('duplicate mode: add', () => {
      it('should add quantities to existing items', async () => {
        const mockTx = setupTransactionMock();
        mockTx.card.findUnique.mockResolvedValue({ id: mockCardId });
        mockTx.collectionItem.findUnique.mockResolvedValue({
          id: 'existing-item',
          quantity: 2,
          foilQuantity: 1,
          forTrade: 0,
        });
        mockTx.collectionItem.update.mockResolvedValue({ id: 'existing-item' });

        const cardNameToIdMap = new Map([['lightning bolt', mockCardId]]);

        const result = await importCollectionItems(
          mockUserId,
          [{ name: 'Lightning Bolt', quantity: 4, foilQuantity: 2, forTrade: 1 }],
          'add',
          cardNameToIdMap
        );

        expect(result.imported).toBe(0);
        expect(result.updated).toBe(1);
        expect(mockTx.collectionItem.update).toHaveBeenCalledWith({
          where: { id: 'existing-item' },
          data: expect.objectContaining({
            quantity: 6, // 2 + 4
            foilQuantity: 3, // 1 + 2
            forTrade: 1, // 0 + 1
          }),
        });
      });
    });

    describe('duplicate mode: skip', () => {
      it('should skip existing items without updating', async () => {
        const mockTx = setupTransactionMock();
        mockTx.card.findUnique.mockResolvedValue({ id: mockCardId });
        mockTx.collectionItem.findUnique.mockResolvedValue({
          id: 'existing-item',
          quantity: 2,
        });

        const cardNameToIdMap = new Map([['lightning bolt', mockCardId]]);

        const result = await importCollectionItems(
          mockUserId,
          [{ name: 'Lightning Bolt', quantity: 4 }],
          'skip',
          cardNameToIdMap
        );

        expect(result.imported).toBe(0);
        expect(result.updated).toBe(0);
        expect(result.skipped).toBe(1);
        expect(mockTx.collectionItem.update).not.toHaveBeenCalled();
        expect(mockTx.collectionItem.create).not.toHaveBeenCalled();
      });
    });

    describe('duplicate mode: replace', () => {
      it('should replace existing item quantities', async () => {
        const mockTx = setupTransactionMock();
        mockTx.card.findUnique.mockResolvedValue({ id: mockCardId });
        mockTx.collectionItem.findUnique.mockResolvedValue({
          id: 'existing-item',
          quantity: 10,
          foilQuantity: 5,
        });
        mockTx.collectionItem.update.mockResolvedValue({ id: 'existing-item' });

        const cardNameToIdMap = new Map([['lightning bolt', mockCardId]]);

        const result = await importCollectionItems(
          mockUserId,
          [{ name: 'Lightning Bolt', quantity: 2, foilQuantity: 0 }],
          'replace',
          cardNameToIdMap
        );

        expect(result.imported).toBe(0);
        expect(result.updated).toBe(1);
        expect(mockTx.collectionItem.update).toHaveBeenCalledWith({
          where: { id: 'existing-item' },
          data: expect.objectContaining({
            quantity: 2,
            foilQuantity: 0,
          }),
        });
      });
    });

    it('should report errors for cards not found', async () => {
      const mockTx = setupTransactionMock();

      const result = await importCollectionItems(
        mockUserId,
        [{ name: 'Unknown Card' }],
        'add',
        new Map() // Empty map - card not resolved
      );

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].cardName).toBe('Unknown Card');
      expect(result.errors[0].error).toContain('not found');
    });

    it('should use explicit cardId override when provided', async () => {
      const mockTx = setupTransactionMock();
      const overrideCardId = 'override-card-id';
      mockTx.card.findUnique.mockResolvedValue({ id: overrideCardId });
      mockTx.collectionItem.findUnique.mockResolvedValue(null);
      mockTx.collectionItem.create.mockResolvedValue({ id: 'item-1' });

      const cardNameToIdMap = new Map([['lightning bolt', mockCardId]]);

      const result = await importCollectionItems(
        mockUserId,
        [{ name: 'Lightning Bolt', cardId: overrideCardId }],
        'add',
        cardNameToIdMap
      );

      expect(result.imported).toBe(1);
      expect(mockTx.collectionItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cardId: overrideCardId, // Should use override, not map value
        }),
      });
    });

    it('should parse various condition formats', async () => {
      const mockTx = setupTransactionMock();
      mockTx.card.findUnique.mockResolvedValue({ id: mockCardId });
      mockTx.collectionItem.findUnique.mockResolvedValue(null);
      mockTx.collectionItem.create.mockResolvedValue({ id: 'item-1' });

      const cardNameToIdMap = new Map([['card', mockCardId]]);

      // Test various condition formats
      await importCollectionItems(mockUserId, [{ name: 'Card', condition: 'NEAR_MINT' }], 'add', cardNameToIdMap);
      await importCollectionItems(mockUserId, [{ name: 'Card', condition: 'lp' }], 'add', cardNameToIdMap);
      await importCollectionItems(mockUserId, [{ name: 'Card', condition: 'DAMAGED' }], 'add', cardNameToIdMap);

      const calls = mockTx.collectionItem.create.mock.calls;
      expect(calls[0][0].data.condition).toBe(CardCondition.NM);
      expect(calls[1][0].data.condition).toBe(CardCondition.LP);
      expect(calls[2][0].data.condition).toBe(CardCondition.DMG);
    });
  });

  describe('resolveEntriesWithPrintings', () => {
    it('should resolve entries with Spanish names', async () => {
      const mockCards = [
        {
          id: 'card-1',
          name: 'Lightning Bolt',
          nameEs: 'Rayo',
          setCode: 'M21',
          setName: 'Core Set 2021',
          scryfallId: 'scry-1',
          priceEur: 0.5,
        },
      ];

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue(mockCards);

      const entries = [
        { quantity: 4, cardName: 'Rayo' }
      ];

      const result = await resolveEntriesWithPrintings(entries as any);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('matched');
      expect(result[0].resolvedCard?.name).toBe('Lightning Bolt');
      expect(result[0].cardName).toBe('Rayo');
    });
  });
});
