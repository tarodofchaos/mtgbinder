import express, { Express } from 'express';
import request from 'supertest';

// Mock implementations
const mockUserFindUnique = jest.fn();
const mockCollectionFindMany = jest.fn();
const mockCollectionCount = jest.fn();
const mockWishlistFindMany = jest.fn();
const mockWishlistCount = jest.fn();

// Mock prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    collectionItem: {
      findMany: (...args: unknown[]) => mockCollectionFindMany(...args),
      count: (...args: unknown[]) => mockCollectionCount(...args),
    },
    wishlistItem: {
      findMany: (...args: unknown[]) => mockWishlistFindMany(...args),
      count: (...args: unknown[]) => mockWishlistCount(...args),
    },
  },
}));

// Import after mocks
import { binderRouter } from './binder';
import { errorHandler } from '../middleware/error-handler';

describe('Binder Routes - Public Binder Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/binder', binderRouter);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockUser = {
    id: 'user-123',
    displayName: 'Test User',
    shareCode: 'ABC12345',
  };

  const mockCollectionItems = [
    {
      id: 'item-1',
      userId: 'user-123',
      cardId: 'card-1',
      quantity: 4,
      foilQuantity: 0,
      condition: 'NM',
      forTrade: 2,
      card: {
        id: 'card-1',
        name: 'Lightning Bolt',
        setCode: 'M21',
        setName: 'Core Set 2021',
        scryfallId: 'scry-1',
        priceEur: 0.5,
      },
    },
    {
      id: 'item-2',
      userId: 'user-123',
      cardId: 'card-2',
      quantity: 2,
      foilQuantity: 1,
      condition: 'NM',
      forTrade: 0,
      card: {
        id: 'card-2',
        name: 'Sol Ring',
        setCode: 'CMR',
        setName: 'Commander Legends',
        scryfallId: 'scry-2',
        priceEur: 1.2,
      },
    },
  ];

  const mockWishlistItems = [
    {
      id: 'wish-1',
      userId: 'user-123',
      cardId: 'card-3',
      quantity: 1,
      priority: 'HIGH',
      card: {
        id: 'card-3',
        name: 'Force of Will',
        setCode: 'ALL',
        priceEur: 80.0,
      },
    },
  ];

  describe('GET /binder/:shareCode', () => {
    it('should return public binder for valid share code', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce(mockCollectionItems);
      mockCollectionCount.mockResolvedValueOnce(2);

      const response = await request(app)
        .get('/binder/ABC12345')
        .expect(200);

      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.items).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(50);
    });

    it('should handle case-insensitive share codes', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce(mockCollectionItems);
      mockCollectionCount.mockResolvedValueOnce(2);

      await request(app)
        .get('/binder/abc12345') // lowercase
        .expect(200);

      expect(mockUserFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { shareCode: 'ABC12345' }, // uppercase
        })
      );
    });

    it('should return 404 for non-existent share code', async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/binder/INVALID1')
        .expect(404);

      expect(response.body.error).toBe('Binder not found');
    });

    it('should filter by search term', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce([mockCollectionItems[0]]);
      mockCollectionCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/binder/ABC12345')
        .query({ search: 'Lightning' })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(mockCollectionFindMany).toHaveBeenCalledWith(
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
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce([mockCollectionItems[0]]);
      mockCollectionCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/binder/ABC12345')
        .query({ setCode: 'm21' })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(mockCollectionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: expect.objectContaining({
              setCode: 'M21',
            }),
          }),
        })
      );
    });

    it('should filter by forTrade flag', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce([mockCollectionItems[0]]);
      mockCollectionCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/binder/ABC12345')
        .query({ forTrade: 'true' })
        .expect(200);

      expect(response.body.data.items).toHaveLength(1);
      expect(mockCollectionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            forTrade: { gt: 0 },
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce([mockCollectionItems[1]]);
      mockCollectionCount.mockResolvedValueOnce(100);

      const response = await request(app)
        .get('/binder/ABC12345')
        .query({ page: '2', pageSize: '10' })
        .expect(200);

      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.totalPages).toBe(10);
      expect(mockCollectionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * pageSize 10
          take: 10,
        })
      );
    });

    it('should return empty results gracefully', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce([]);
      mockCollectionCount.mockResolvedValueOnce(0);

      const response = await request(app)
        .get('/binder/ABC12345')
        .expect(200);

      expect(response.body.data.items).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
      expect(response.body.data.totalPages).toBe(0);
    });

    it('should combine multiple filters', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockCollectionFindMany.mockResolvedValueOnce([mockCollectionItems[0]]);
      mockCollectionCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/binder/ABC12345')
        .query({ search: 'Bolt', setCode: 'M21', forTrade: 'true' })
        .expect(200);

      expect(mockCollectionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            forTrade: { gt: 0 },
            card: expect.objectContaining({
              name: { contains: 'Bolt', mode: 'insensitive' },
              setCode: 'M21',
            }),
          }),
        })
      );
    });
  });

  describe('GET /binder/:shareCode/wishlist', () => {
    it('should return public wishlist for valid share code', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockWishlistFindMany.mockResolvedValueOnce(mockWishlistItems);
      mockWishlistCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/binder/ABC12345/wishlist')
        .expect(200);

      expect(response.body.data.user).toEqual(mockUser);
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].card.name).toBe('Force of Will');
    });

    it('should return 404 for non-existent share code', async () => {
      mockUserFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/binder/INVALID1/wishlist')
        .expect(404);

      expect(response.body.error).toBe('Binder not found');
    });

    it('should filter wishlist by search term', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockWishlistFindMany.mockResolvedValueOnce(mockWishlistItems);
      mockWishlistCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/binder/ABC12345/wishlist')
        .query({ search: 'Force' })
        .expect(200);

      expect(mockWishlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            card: { name: { contains: 'Force', mode: 'insensitive' } },
          }),
        })
      );
    });

    it('should handle wishlist pagination', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockWishlistFindMany.mockResolvedValueOnce(mockWishlistItems);
      mockWishlistCount.mockResolvedValueOnce(50);

      const response = await request(app)
        .get('/binder/ABC12345/wishlist')
        .query({ page: '3', pageSize: '10' })
        .expect(200);

      expect(response.body.data.page).toBe(3);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.totalPages).toBe(5);
    });

    it('should order wishlist by priority then name', async () => {
      mockUserFindUnique.mockResolvedValueOnce(mockUser);
      mockWishlistFindMany.mockResolvedValueOnce(mockWishlistItems);
      mockWishlistCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/binder/ABC12345/wishlist')
        .expect(200);

      expect(mockWishlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: 'desc' }, { card: { name: 'asc' } }],
        })
      );
    });
  });
});
