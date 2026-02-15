import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { TradeSessionStatus, CardCondition } from '@prisma/client';

// Mock implementations
const mockUserFindUnique = jest.fn();
const mockSessionFindUnique = jest.fn();
const mockSessionFindFirst = jest.fn();
const mockSessionFindMany = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionUpdate = jest.fn();
const mockSessionUpdateMany = jest.fn();
const mockSessionDelete = jest.fn();

// Mock config
jest.mock('../utils/config', () => ({
  config: {
    jwtSecret: 'test-jwt-secret-key',
    jwtExpiresIn: '1h',
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  customAlphabet: () => () => 'ABC123',
}));

// Mock match-service
jest.mock('../services/match-service', () => ({
  computeTradeMatches: jest.fn().mockResolvedValue({
    userAOffers: [
      {
        cardId: 'card-1',
        cardName: 'Lightning Bolt',
        setCode: 'M21',
        setName: 'Core Set 2021',
        scryfallId: 'scry-1',
        rarity: 'common',
        manaCost: '{R}',
        manaValue: 1,
        typeLine: 'Instant',
        oracleText: 'Deal 3 damage',
        collectorNumber: '199',
        imageUri: null,
        priceUsd: 1.0,
        priceUsdFoil: 3.0,
        offererUserId: 'initiator-id',
        receiverUserId: 'joiner-id',
        availableQuantity: 2,
        condition: CardCondition.NM,
        isFoil: false,
        priority: null,
        priceEur: 0.8,
        tradePrice: null,
        isMatch: true,
      },
    ],
    userBOffers: [],
    userATotalValue: 1.6,
    userBTotalValue: 0,
  }),
}));

// Mock prisma
jest.mock('../utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    tradeSession: {
      findUnique: (...args: unknown[]) => mockSessionFindUnique(...args),
      findFirst: (...args: unknown[]) => mockSessionFindFirst(...args),
      findMany: (...args: unknown[]) => mockSessionFindMany(...args),
      create: (...args: unknown[]) => mockSessionCreate(...args),
      update: (...args: unknown[]) => mockSessionUpdate(...args),
      updateMany: (...args: unknown[]) => mockSessionUpdateMany(...args),
      delete: (...args: unknown[]) => mockSessionDelete(...args),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Import after mocks
import { tradeRouter } from './trade';
import { errorHandler } from '../middleware/error-handler';

describe('Trade Routes - Integration Tests', () => {
  let app: Express;
  let initiatorToken: string;
  let joinerToken: string;
  const initiatorId = 'initiator-id';
  const joinerId = 'joiner-id';

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/trade', tradeRouter);
    app.use(errorHandler);

    initiatorToken = jwt.sign({ userId: initiatorId }, 'test-jwt-secret-key');
    joinerToken = jwt.sign({ userId: joinerId }, 'test-jwt-secret-key');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: auth middleware finds users
    mockUserFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      return Promise.resolve({ id: where.id });
    });
    mockSessionUpdateMany.mockResolvedValue({ count: 0 });
  });

  const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 1000);

  const mockInitiator = {
    id: initiatorId,
    displayName: 'Initiator',
    shareCode: 'INIT1234',
  };

  const mockJoiner = {
    id: joinerId,
    displayName: 'Joiner',
    shareCode: 'JOIN5678',
  };

  const mockSession = {
    id: 'session-1',
    sessionCode: 'ABC123',
    initiatorId,
    joinerId: null,
    status: TradeSessionStatus.PENDING,
    expiresAt: futureDate,
    matchesJson: null,
    createdAt: new Date(),
    initiator: mockInitiator,
    joiner: null,
  };

  const mockActiveSession = {
    ...mockSession,
    joinerId,
    status: TradeSessionStatus.ACTIVE,
    joiner: mockJoiner,
  };

  describe('POST /trade/session', () => {
    it('should create a new trade session', async () => {
      mockSessionFindFirst.mockResolvedValueOnce(null); // No existing session
      mockSessionCreate.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post('/trade/session')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(201);

      expect(response.body.data.sessionCode).toBe('ABC123');
      expect(response.body.data.initiator.displayName).toBe('Initiator');
    });

    it('should return existing active session instead of creating new one', async () => {
      mockSessionFindFirst.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post('/trade/session')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(response.body.data.sessionCode).toBe('ABC123');
      expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('should clean up expired sessions before creating', async () => {
      mockSessionFindFirst.mockResolvedValueOnce(null);
      mockSessionCreate.mockResolvedValueOnce(mockSession);

      await request(app)
        .post('/trade/session')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(201);

      expect(mockSessionUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            initiatorId,
            status: TradeSessionStatus.PENDING,
          }),
          data: { status: TradeSessionStatus.EXPIRED },
        })
      );
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/trade/session')
        .expect(401);
    });
  });

  describe('GET /trade/session', () => {
    it('should return user sessions as initiator', async () => {
      mockSessionFindMany.mockResolvedValueOnce([mockSession]);

      const response = await request(app)
        .get('/trade/session')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sessionCode).toBe('ABC123');
    });

    it('should return user sessions as joiner', async () => {
      mockSessionFindMany.mockResolvedValueOnce([mockActiveSession]);

      const response = await request(app)
        .get('/trade/session')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });

    it('should only return non-expired sessions', async () => {
      mockSessionFindMany.mockResolvedValueOnce([]);

      await request(app)
        .get('/trade/session')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(mockSessionFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: { gt: expect.any(Date) },
          }),
        })
      );
    });
  });

  describe('POST /trade/:code/join', () => {
    it('should allow user to join a session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockSession);
      mockSessionUpdate.mockResolvedValueOnce(mockActiveSession);

      const response = await request(app)
        .post('/trade/ABC123/join')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('ACTIVE');
      expect(response.body.data.joiner.displayName).toBe('Joiner');
    });

    it('should handle case-insensitive session codes', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockSession);
      mockSessionUpdate.mockResolvedValueOnce(mockActiveSession);

      await request(app)
        .post('/trade/abc123/join') // lowercase
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(200);

      expect(mockSessionFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sessionCode: 'ABC123' },
        })
      );
    });

    it('should reject joining non-existent session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/trade/INVALID/join')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(404);

      expect(response.body.error).toBe('Trade session not found');
    });

    it('should reject joining expired session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce({
        ...mockSession,
        expiresAt: pastDate,
      });
      mockSessionUpdate.mockResolvedValueOnce({});

      const response = await request(app)
        .post('/trade/ABC123/join')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(400);

      expect(response.body.error).toBe('Trade session has expired');
    });

    it('should reject initiator joining their own session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .post('/trade/ABC123/join')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(400);

      expect(response.body.error).toBe('Cannot join your own trade session');
    });

    it('should reject joining session that already has a different partner', async () => {
      mockSessionFindUnique.mockResolvedValueOnce({
        ...mockActiveSession,
        joinerId: 'other-user-id',
      });

      const thirdUserToken = jwt.sign({ userId: 'third-user' }, 'test-jwt-secret-key');
      mockUserFindUnique.mockResolvedValueOnce({ id: 'third-user' });

      const response = await request(app)
        .post('/trade/ABC123/join')
        .set('Authorization', `Bearer ${thirdUserToken}`)
        .expect(400);

      expect(response.body.error).toBe('Trade session already has a partner');
    });

    it('should reject joining completed session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce({
        ...mockSession,
        status: TradeSessionStatus.COMPLETED,
      });

      const response = await request(app)
        .post('/trade/ABC123/join')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(400);

      expect(response.body.error).toBe('Trade session has already been completed');
    });
  });

  describe('GET /trade/:code/matches', () => {
    it('should return trade matches for active session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockActiveSession);
      mockSessionUpdate.mockResolvedValueOnce(mockActiveSession);

      const response = await request(app)
        .get('/trade/ABC123/matches')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.userAOffers).toHaveLength(1);
      expect(response.body.data.userAOffers[0].card.name).toBe('Lightning Bolt');
      expect(response.body.data.userATotalValue).toBe(1.6);
    });

    it('should reject viewing matches for non-existent session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/trade/INVALID/matches')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(404);

      expect(response.body.error).toBe('Trade session not found');
    });

    it('should reject unauthorized user viewing matches', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockActiveSession);

      const otherUserToken = jwt.sign({ userId: 'other-user' }, 'test-jwt-secret-key');
      mockUserFindUnique.mockResolvedValueOnce({ id: 'other-user' });

      const response = await request(app)
        .get('/trade/ABC123/matches')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.error).toBe('Not authorized to view this session');
    });

    it('should reject viewing matches before joiner joins', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockSession); // No joiner

      const response = await request(app)
        .get('/trade/ABC123/matches')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(400);

      expect(response.body.error).toBe('Waiting for another user to join');
    });

    it('should cache matches in session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockActiveSession);
      mockSessionUpdate.mockResolvedValueOnce(mockActiveSession);

      await request(app)
        .get('/trade/ABC123/matches')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(mockSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { matchesJson: expect.any(String) },
        })
      );
    });
  });

  describe('POST /trade/:code/complete', () => {
    it('should complete session when initiator requests', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockActiveSession);
      mockSessionUpdate.mockResolvedValueOnce({
        ...mockActiveSession,
        status: TradeSessionStatus.COMPLETED,
      });

      const response = await request(app)
        .post('/trade/ABC123/complete')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(response.body.data.status).toBe('COMPLETED');
    });

    it('should reject completing non-existent session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/trade/INVALID/complete')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(404);

      expect(response.body.error).toBe('Trade session not found');
    });

    it('should reject non-initiator completing session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockActiveSession);

      const response = await request(app)
        .post('/trade/ABC123/complete')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(403);

      expect(response.body.error).toBe('Only the session initiator can complete the session');
    });
  });

  describe('DELETE /trade/:code', () => {
    it('should delete session when initiator requests', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockSession);
      mockSessionDelete.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .delete('/trade/ABC123')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(200);

      expect(response.body.message).toBe('Trade session deleted');
      expect(mockSessionDelete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should reject deleting non-existent session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/trade/INVALID')
        .set('Authorization', `Bearer ${initiatorToken}`)
        .expect(404);

      expect(response.body.error).toBe('Trade session not found');
    });

    it('should reject non-initiator deleting session', async () => {
      mockSessionFindUnique.mockResolvedValueOnce(mockSession);

      const response = await request(app)
        .delete('/trade/ABC123')
        .set('Authorization', `Bearer ${joinerToken}`)
        .expect(403);

      expect(response.body.error).toBe('Only the session initiator can delete the session');
    });
  });
});
