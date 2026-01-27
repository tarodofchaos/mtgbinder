import express, { Express } from 'express';
import request from 'supertest';

// Mock implementations
const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockCount = jest.fn();

// Mock prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    card: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
  },
}));

// Import after mocks
import { cardsRouter } from './cards';
import { errorHandler } from '../middleware/error-handler';

describe('Cards Routes - Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/cards', cardsRouter);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCards = [
    {
      id: 'card-1',
      name: 'Lightning Bolt',
      setCode: 'M21',
      setName: 'Core Set 2021',
      scryfallId: 'scry-1',
      rarity: 'common',
      typeLine: 'Instant',
      priceEur: 0.5,
    },
    {
      id: 'card-2',
      name: 'Lightning Helix',
      setCode: 'RAV',
      setName: 'Ravnica: City of Guilds',
      scryfallId: 'scry-2',
      rarity: 'uncommon',
      typeLine: 'Instant',
      priceEur: 1.0,
    },
    {
      id: 'card-3',
      name: 'Sol Ring',
      setCode: 'CMR',
      setName: 'Commander Legends',
      scryfallId: 'scry-3',
      rarity: 'uncommon',
      typeLine: 'Artifact',
      priceEur: 1.2,
    },
  ];

  describe('GET /cards/search', () => {
    it('should return cards matching search query', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[0], mockCards[1]]);
      mockCount.mockResolvedValueOnce(2);

      const response = await request(app)
        .get('/cards/search')
        .query({ q: 'Lightning' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Lightning', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should return all cards when no query provided', async () => {
      mockFindMany.mockResolvedValueOnce(mockCards);
      mockCount.mockResolvedValueOnce(3);

      const response = await request(app)
        .get('/cards/search')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
    });

    it('should filter by set code', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[0]]);
      mockCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/cards/search')
        .query({ setCode: 'm21' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            setCode: 'M21',
          }),
        })
      );
    });

    it('should filter by rarity', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[0]]);
      mockCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/cards/search')
        .query({ rarity: 'Common' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            rarity: 'common',
          }),
        })
      );
    });

    it('should filter by type', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[2]]);
      mockCount.mockResolvedValueOnce(1);

      const response = await request(app)
        .get('/cards/search')
        .query({ type: 'Artifact' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            typeLine: { contains: 'Artifact', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should handle pagination', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[2]]);
      mockCount.mockResolvedValueOnce(100);

      const response = await request(app)
        .get('/cards/search')
        .query({ page: '5', pageSize: '10' })
        .expect(200);

      expect(response.body.page).toBe(5);
      expect(response.body.pageSize).toBe(10);
      expect(response.body.totalPages).toBe(10);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40,
          take: 10,
        })
      );
    });

    it('should use default pagination values', async () => {
      mockFindMany.mockResolvedValueOnce(mockCards);
      mockCount.mockResolvedValueOnce(3);

      const response = await request(app)
        .get('/cards/search')
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(20);
    });

    it('should combine multiple filters', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[0]]);
      mockCount.mockResolvedValueOnce(1);

      await request(app)
        .get('/cards/search')
        .query({ q: 'Bolt', setCode: 'M21', rarity: 'common' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'Bolt', mode: 'insensitive' },
            setCode: 'M21',
            rarity: 'common',
          }),
        })
      );
    });

    it('should order results by name and set code', async () => {
      mockFindMany.mockResolvedValueOnce(mockCards);
      mockCount.mockResolvedValueOnce(3);

      await request(app)
        .get('/cards/search')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }, { setCode: 'asc' }],
        })
      );
    });
  });

  describe('GET /cards/autocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: 'card-1', name: 'Lightning Bolt', setCode: 'M21', setName: 'Core Set 2021', scryfallId: 'scry-1' },
        { id: 'card-2', name: 'Lightning Helix', setCode: 'RAV', setName: 'Ravnica', scryfallId: 'scry-2' },
      ]);

      const response = await request(app)
        .get('/cards/autocomplete')
        .query({ q: 'Light' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('Lightning Bolt');
    });

    it('should reject queries shorter than 2 characters', async () => {
      const response = await request(app)
        .get('/cards/autocomplete')
        .query({ q: 'L' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should limit results to specified limit', async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: 'card-1', name: 'Card 1', setCode: 'SET', setName: 'Set', scryfallId: 'scry-1' },
        { id: 'card-2', name: 'Card 2', setCode: 'SET', setName: 'Set', scryfallId: 'scry-2' },
        { id: 'card-3', name: 'Card 3', setCode: 'SET', setName: 'Set', scryfallId: 'scry-3' },
      ]);

      await request(app)
        .get('/cards/autocomplete')
        .query({ q: 'Card', limit: '3' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 3,
        })
      );
    });

    it('should use default limit of 10', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/cards/autocomplete')
        .query({ q: 'Test' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should return distinct card names', async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: 'card-1', name: 'Lightning Bolt', setCode: 'M21', setName: 'Core 2021', scryfallId: 'scry-1' },
      ]);

      await request(app)
        .get('/cards/autocomplete')
        .query({ q: 'Lightning' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['name'],
        })
      );
    });

    it('should select only necessary fields', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/cards/autocomplete')
        .query({ q: 'Test' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            name: true,
            setCode: true,
            setName: true,
            scryfallId: true,
          },
        })
      );
    });
  });

  describe('GET /cards/printings', () => {
    it('should return all printings of a card', async () => {
      const printings = [
        { ...mockCards[0], setCode: 'M21' },
        { ...mockCards[0], id: 'card-1b', setCode: 'STA' },
        { ...mockCards[0], id: 'card-1c', setCode: 'LEA' },
      ];
      mockFindMany.mockResolvedValueOnce(printings);

      const response = await request(app)
        .get('/cards/printings')
        .query({ name: 'Lightning Bolt' })
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { equals: 'Lightning Bolt', mode: 'insensitive' },
          },
        })
      );
    });

    it('should return 400 when name is not provided', async () => {
      const response = await request(app)
        .get('/cards/printings')
        .expect(400);

      expect(response.body.error).toBe('Card name is required');
    });

    it('should order printings by set name', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/cards/printings')
        .query({ name: 'Sol Ring' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { setName: 'asc' },
        })
      );
    });

    it('should handle case-insensitive card name matching', async () => {
      mockFindMany.mockResolvedValueOnce([mockCards[0]]);

      await request(app)
        .get('/cards/printings')
        .query({ name: 'LIGHTNING BOLT' })
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: { equals: 'LIGHTNING BOLT', mode: 'insensitive' },
          },
        })
      );
    });
  });

  describe('GET /cards/sets', () => {
    it('should return all unique sets', async () => {
      const sets = [
        { setCode: 'CMR', setName: 'Commander Legends' },
        { setCode: 'M21', setName: 'Core Set 2021' },
        { setCode: 'RAV', setName: 'Ravnica: City of Guilds' },
      ];
      mockFindMany.mockResolvedValueOnce(sets);

      const response = await request(app)
        .get('/cards/sets')
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0].setCode).toBeDefined();
      expect(response.body.data[0].setName).toBeDefined();
    });

    it('should return distinct set codes', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/cards/sets')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          distinct: ['setCode'],
        })
      );
    });

    it('should order sets by name', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/cards/sets')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { setName: 'asc' },
        })
      );
    });

    it('should only select setCode and setName', async () => {
      mockFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/cards/sets')
        .expect(200);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            setCode: true,
            setName: true,
          },
        })
      );
    });
  });

  describe('GET /cards/:id', () => {
    it('should return card by ID', async () => {
      mockFindUnique.mockResolvedValueOnce(mockCards[0]);

      const response = await request(app)
        .get('/cards/card-1')
        .expect(200);

      expect(response.body.data).toEqual(mockCards[0]);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 'card-1' },
      });
    });

    it('should return 404 for non-existent card', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/cards/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('Card not found');
    });
  });
});
