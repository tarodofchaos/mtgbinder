import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { WishlistPriority, CardCondition } from '@prisma/client';

// Mock implementations
const mockUserFindUnique = jest.fn();
const mockCardFindUnique = jest.fn();
const mockWishlistFindMany = jest.fn();
const mockWishlistFindUnique = jest.fn();
const mockWishlistFindFirst = jest.fn();
const mockWishlistCreate = jest.fn();
const mockWishlistUpdate = jest.fn();
const mockWishlistDelete = jest.fn();
const mockWishlistCount = jest.fn();

// Mock config
jest.mock('../utils/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret-key',
    jwtExpiresIn: '1h',
  },
}));

// Mock prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    card: {
      findUnique: (...args: unknown[]) => mockCardFindUnique(...args),
    },
    wishlistItem: {
      findMany: (...args: unknown[]) => mockWishlistFindMany(...args),
      findUnique: (...args: unknown[]) => mockWishlistFindUnique(...args),
      findFirst: (...args: unknown[]) => mockWishlistFindFirst(...args),
      create: (...args: unknown[]) => mockWishlistCreate(...args),
      update: (...args: unknown[]) => mockWishlistUpdate(...args),
      delete: (...args: unknown[]) => mockWishlistDelete(...args),
      count: (...args: unknown[]) => mockWishlistCount(...args),
    },
  },
}));

// Import after mocks
import { wishlistRouter } from './wishlist';
import { errorHandler } from '../middleware/error-handler';

describe('Wishlist Routes - Integration Tests', () => {
  let app: Express;
  let authToken: string;
  const userId = 'test-user-id';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/wishlist', wishlistRouter);
    app.use(errorHandler);

    authToken = jwt.sign({ userId }, 'test-jwt-secret-key');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth middleware finds user
    mockUserFindUnique.mockResolvedValue({ id: userId });
  });

  const validCardId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  const mockCard = {
    id: validCardId,
    name: 'Force of Will',
    setCode: 'ALL',
    setName: 'Alliances',
    scryfallId: 'scry-fow',
    priceEur: 80.0,
  };

  const mockWishlistItem = {
    id: 'wish-1',
    userId,
    cardId: validCardId,
    quantity: 2,
    priority: WishlistPriority.HIGH,
    maxPrice: 100.0,
    minCondition: CardCondition.LP,
    foilOnly: false,
    card: mockCard,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('GET /wishlist', () => {
    it('should return user wishlist when authenticated', async () => {
      mockWishlistFindMany.mockResolvedValueOnce([mockWishlistItem]);
      mockWishlistCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].card.name).toBe('Force of Will');
      expect(response.body.total).toBe(1);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/wishlist')
        .expect(401);
    });

    it('should filter by priority', async () => {
      mockWishlistFindMany.mockResolvedValueOnce([mockWishlistItem]);
      mockWishlistCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ priority: 'HIGH' })
        .expect(200);

      expect(mockWishlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: WishlistPriority.HIGH,
          }),
        })
      );
    });

    it('should filter by search term', async () => {
      mockWishlistFindMany.mockResolvedValueOnce([mockWishlistItem]);
      mockWishlistCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
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

    it('should handle sorting by name', async () => {
      mockWishlistFindMany.mockResolvedValueOnce([mockWishlistItem]);
      mockWishlistCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'name', sortOrder: 'asc' })
        .expect(200);

      expect(mockWishlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ card: { name: 'asc' } }],
        })
      );
    });

    it('should handle sorting by price', async () => {
      mockWishlistFindMany.mockResolvedValueOnce([mockWishlistItem]);
      mockWishlistCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ sortBy: 'priceEur', sortOrder: 'desc' })
        .expect(200);

      expect(mockWishlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ card: { priceEur: 'desc' } }],
        })
      );
    });

    it('should handle pagination', async () => {
      mockWishlistFindMany.mockResolvedValueOnce([mockWishlistItem]);
      mockWishlistCount.mockResolvedValueOnce(100);

      const response = await request(app)
        .get('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: '2', pageSize: '10' })
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.totalPages).toBe(10);
    });
  });

  describe('POST /wishlist', () => {
    it('should add card to wishlist', async () => {
      mockCardFindUnique.mockResolvedValueOnce(mockCard);
      mockWishlistFindUnique.mockResolvedValueOnce(null); // Not in wishlist
      mockWishlistCreate.mockResolvedValueOnce(mockWishlistItem);

      const response = await request(app)
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: validCardId,
          quantity: 2,
          priority: 'HIGH',
          maxPrice: 100.0,
          minCondition: 'LP',
          foilOnly: false,
        })
        .expect(201);

      expect(response.body.data.card.name).toBe('Force of Will');
      expect(mockWishlistCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            cardId: validCardId,
            quantity: 2,
            priority: WishlistPriority.HIGH,
          }),
        })
      );
    });

    it('should reject adding non-existent card', async () => {
      const nonExistentCardId = 'c1d2e3f4-a5b6-7890-cdef-123456789abc';
      jest.clearAllMocks();
      mockUserFindUnique.mockResolvedValue({ id: userId });
      mockCardFindUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cardId: nonExistentCardId,
          quantity: 1,
        })
        .expect(404);

      expect(response.body.error).toBe('Card not found');
    });

    it('should reject invalid cardId format', async () => {
      const response = await request(app)
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId: 'not-a-uuid' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should reject invalid quantity', async () => {
      const response = await request(app)
        .post('/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ cardId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', quantity: 0 })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /wishlist/:id', () => {
    it('should update wishlist item', async () => {
      mockWishlistFindFirst.mockResolvedValueOnce(mockWishlistItem);
      mockWishlistUpdate.mockResolvedValueOnce({
        ...mockWishlistItem,
        quantity: 4,
        priority: WishlistPriority.URGENT,
      });

      const response = await request(app)
        .put('/wishlist/wish-1')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          quantity: 4,
          priority: 'URGENT',
        })
        .expect(200);

      expect(response.body.data.quantity).toBe(4);
      expect(response.body.data.priority).toBe('URGENT');
    });

    it('should reject updating non-existent item', async () => {
      mockWishlistFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/wishlist/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 2 })
        .expect(404);

      expect(response.body.error).toBe('Wishlist item not found');
    });

    it('should only update items owned by user', async () => {
      mockWishlistFindFirst.mockResolvedValueOnce(null); // findFirst with userId filter returns null

      await request(app)
        .put('/wishlist/other-users-item')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 5 })
        .expect(404);

      expect(mockWishlistFindFirst).toHaveBeenCalledWith({
        where: { id: 'other-users-item', userId },
      });
    });
  });

  describe('DELETE /wishlist/:id', () => {
    it('should delete wishlist item', async () => {
      mockWishlistFindFirst.mockResolvedValueOnce(mockWishlistItem);
      mockWishlistDelete.mockResolvedValueOnce(mockWishlistItem);

      const response = await request(app)
        .delete('/wishlist/wish-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Item removed from wishlist');
      expect(mockWishlistDelete).toHaveBeenCalledWith({
        where: { id: 'wish-1' },
      });
    });

    it('should reject deleting non-existent item', async () => {
      mockWishlistFindFirst.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/wishlist/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Wishlist item not found');
    });

    it('should only delete items owned by user', async () => {
      mockWishlistFindFirst.mockResolvedValueOnce(null);

      await request(app)
        .delete('/wishlist/other-users-item')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(mockWishlistFindFirst).toHaveBeenCalledWith({
        where: { id: 'other-users-item', userId },
      });
    });
  });
});
