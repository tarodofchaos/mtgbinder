import { CardCondition } from '@prisma/client';
import express, { Express } from 'express';
import request from 'supertest';

// Create mock functions
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

// Mock the auth middleware to bypass authentication
jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.userId = 'test-user-id';
    next();
  },
  AuthenticatedRequest: {},
}));

// Mock prisma module
jest.mock('../utils/prisma', () => ({
  prisma: {
    collectionItem: {
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    },
    card: {
      findUnique: jest.fn(),
    },
  },
}));

// Import the router after mocking
import { collectionRouter } from './collection';

describe('Collection Routes - Filter Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/collection', collectionRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCollectionItems = [
    {
      id: 'item-1',
      userId: 'test-user-id',
      cardId: 'card-1',
      quantity: 4,
      foilQuantity: 0,
      condition: CardCondition.NM,
      language: 'EN',
      forTrade: 2,
      tradePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      card: {
        id: 'card-1',
        name: 'Lightning Bolt',
        setCode: 'M21',
        setName: 'Core Set 2021',
        scryfallId: 'scry-1',
        colors: ['R'],
        rarity: 'common',
        priceEur: 0.5,
        priceEurFoil: 2.0,
        releaseDate: '2021-07-23',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'item-2',
      userId: 'test-user-id',
      cardId: 'card-2',
      quantity: 2,
      foilQuantity: 1,
      condition: CardCondition.NM,
      language: 'EN',
      forTrade: 0,
      tradePrice: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      card: {
        id: 'card-2',
        name: 'Sol Ring',
        setCode: 'CMR',
        setName: 'Commander Legends',
        scryfallId: 'scry-2',
        colors: [],
        rarity: 'uncommon',
        priceEur: 1.2,
        priceEurFoil: 5.0,
        releaseDate: '2020-11-20',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'item-3',
      userId: 'test-user-id',
      cardId: 'card-3',
      quantity: 1,
      foilQuantity: 0,
      condition: CardCondition.LP,
      language: 'EN',
      forTrade: 1,
      tradePrice: 15.0,
      createdAt: new Date(),
      updatedAt: new Date(),
      card: {
        id: 'card-3',
        name: 'Tarmogoyf',
        setCode: 'MH2',
        setName: 'Modern Horizons 2',
        scryfallId: 'scry-3',
        colors: ['G'],
        rarity: 'mythic',
        priceEur: 20.0,
        priceEurFoil: 45.0,
        releaseDate: '2021-06-18',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  describe('GET /collection - Filter Tests', () => {
    it('should return all collection items without filters', async () => {
      mockFindMany.mockResolvedValue(mockCollectionItems);
      mockCount.mockResolvedValue(3);

      const response = await request(app)
        .get('/collection')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.total).toBe(3);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });

    it('should filter by search term (card name)', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[0]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ search: 'Lightning' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              name: { contains: 'Lightning', mode: 'insensitive' },
            }),
          }),
        })
      );
    });

    it('should filter by set code', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[0]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ setCode: 'm21' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              setCode: 'M21',
            }),
          }),
        })
      );
    });

    it('should filter by single color', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[0]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ colors: 'R' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              colors: { hasEvery: ['R'] },
            }),
          }),
        })
      );
    });

    it('should filter by multiple colors (AND logic)', async () => {
      const multiColorCard = {
        ...mockCollectionItems[0],
        card: { ...mockCollectionItems[0].card, colors: ['U', 'R'] },
      };
      mockFindMany.mockResolvedValue([multiColorCard]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ colors: 'U,R' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              colors: { hasEvery: ['U', 'R'] },
            }),
          }),
        })
      );
    });

    it('should filter by rarity', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[2]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ rarity: 'mythic' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              rarity: 'mythic',
            }),
          }),
        })
      );
    });

    it('should filter by minimum price', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[2]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ priceMin: '10' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              priceEur: expect.objectContaining({
                gte: 10,
              }),
            }),
          }),
        })
      );
    });

    it('should filter by maximum price', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[0], mockCollectionItems[1]]);
      mockCount.mockResolvedValue(2);

      const response = await request(app)
        .get('/collection')
        .query({ priceMax: '2' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              priceEur: expect.objectContaining({
                lte: 2,
              }),
            }),
          }),
        })
      );
    });

    it('should filter by price range (min and max)', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[1]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ priceMin: '1', priceMax: '5' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              priceEur: expect.objectContaining({
                gte: 1,
                lte: 5,
              }),
            }),
          }),
        })
      );
    });

    it('should filter by forTrade flag', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[0], mockCollectionItems[2]]);
      mockCount.mockResolvedValue(2);

      const response = await request(app)
        .get('/collection')
        .query({ forTrade: 'true' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            forTrade: { gt: 0 },
          }),
        })
      );
    });

    it('should combine multiple filters with AND logic', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[0]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({
          colors: 'R',
          rarity: 'common',
          priceMax: '1',
          forTrade: 'true',
        })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'test-user-id',
            forTrade: { gt: 0 },
            card: expect.objectContaining({
              colors: { hasEvery: ['R'] },
              rarity: 'common',
              priceEur: expect.objectContaining({
                lte: 1,
              }),
            }),
          }),
        })
      );
    });

    it('should handle pagination with filters', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[1]]);
      mockCount.mockResolvedValue(10);

      const response = await request(app)
        .get('/collection')
        .query({ page: '2', pageSize: '1', colors: 'R' })
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.pageSize).toBe(1);
      expect(response.body.totalPages).toBe(10);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1, // (page 2 - 1) * pageSize 1
          take: 1,
        })
      );
    });

    it('should handle empty results gracefully', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const response = await request(app)
        .get('/collection')
        .query({ colors: 'W,U,B,R,G' })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
      expect(response.body.totalPages).toBe(0);
    });

    it('should ignore empty color filter strings', async () => {
      mockFindMany.mockResolvedValue(mockCollectionItems);
      mockCount.mockResolvedValue(3);

      const response = await request(app)
        .get('/collection')
        .query({ colors: '' })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      // Should not have colors filter in where clause
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'test-user-id' },
        })
      );
    });

    it('should apply correct sorting with filters', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[2], mockCollectionItems[1], mockCollectionItems[0]]);
      mockCount.mockResolvedValue(3);

      const response = await request(app)
        .get('/collection')
        .query({ colors: 'R', sortBy: 'priceEur', sortOrder: 'desc' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ card: { priceEur: 'desc' } }],
        })
      );
    });
  });

  describe('GET /collection - Edge Cases', () => {
    it('should handle invalid page numbers gracefully', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const response = await request(app)
        .get('/collection')
        .query({ page: '0' })
        .expect(200);

      // Page 0 should be treated as page 0 after transformation (edge case)
      expect(response.body.page).toBeDefined();
    });

    it('should handle decimal price values', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const response = await request(app)
        .get('/collection')
        .query({ priceMin: '0.50', priceMax: '99.99' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              priceEur: expect.objectContaining({
                gte: 0.50,
                lte: 99.99,
              }),
            }),
          }),
        })
      );
    });

    it('should handle colorless cards (empty colors array)', async () => {
      mockFindMany.mockResolvedValue([mockCollectionItems[1]]);
      mockCount.mockResolvedValue(1);

      const response = await request(app)
        .get('/collection')
        .query({ search: 'Sol Ring' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].card.colors).toEqual([]);
    });
  });

  describe('GET /collection - Query Validation', () => {
    it('should validate and transform query parameters', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      // Test that string page/pageSize gets transformed to numbers
      const response = await request(app)
        .get('/collection')
        .query({ page: '3', pageSize: '20' })
        .expect(200);

      expect(response.body.page).toBe(3);
      expect(response.body.pageSize).toBe(20);
    });

    it('should use default values for missing pagination params', async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      const response = await request(app)
        .get('/collection')
        .expect(200);

      // Default page is 1, pageSize is 50
      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(50);
    });
  });
});
