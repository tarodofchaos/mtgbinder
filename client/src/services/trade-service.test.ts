import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTradeHistory, getTradeHistoryDetail } from './trade-service';
import { api } from './api';
import type { TradeSession } from '@mtg-binder/shared';

// Mock the api module
vi.mock('./api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Trade History Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTradeHistory', () => {
    it('should fetch trade history without filters', async () => {
      const mockSessions: TradeSession[] = [
        {
          id: '1',
          sessionCode: 'ABC123',
          initiatorId: 'user1',
          joinerId: 'user2',
          status: 'COMPLETED' as any,
          expiresAt: new Date('2026-02-10'),
          createdAt: new Date('2026-02-03'),
          matchCount: 5,
        },
      ];

      vi.mocked(api.get).mockResolvedValue({
        data: { data: mockSessions },
      });

      const result = await getTradeHistory();

      expect(api.get).toHaveBeenCalledWith('/trade/history', { params: undefined });
      expect(result).toEqual(mockSessions);
    });

    it('should fetch trade history with date filters', async () => {
      const mockSessions: TradeSession[] = [];
      vi.mocked(api.get).mockResolvedValue({
        data: { data: mockSessions },
      });

      await getTradeHistory({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        sort: 'asc',
      });

      expect(api.get).toHaveBeenCalledWith('/trade/history', {
        params: {
          startDate: '2026-01-01',
          endDate: '2026-01-31',
          sort: 'asc',
        },
      });
    });

    it('should default to desc sort when not specified', async () => {
      const mockSessions: TradeSession[] = [
        {
          id: '1',
          sessionCode: 'ABC123',
          initiatorId: 'user1',
          joinerId: 'user2',
          status: 'COMPLETED' as any,
          expiresAt: new Date('2026-02-10'),
          createdAt: new Date('2026-02-03'),
          matchCount: 5,
        },
        {
          id: '2',
          sessionCode: 'XYZ789',
          initiatorId: 'user1',
          joinerId: 'user3',
          status: 'COMPLETED' as any,
          expiresAt: new Date('2026-02-09'),
          createdAt: new Date('2026-02-02'),
          matchCount: 3,
        },
      ];

      vi.mocked(api.get).mockResolvedValue({
        data: { data: mockSessions },
      });

      const result = await getTradeHistory();

      expect(result).toEqual(mockSessions);
      expect(result[0].createdAt > result[1].createdAt).toBe(true);
    });

    it('should handle API errors', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await expect(getTradeHistory()).rejects.toThrow('Network error');
    });
  });

  describe('getTradeHistoryDetail', () => {
    it('should fetch session details by ID', async () => {
      const mockSession: TradeSession = {
        id: '1',
        sessionCode: 'ABC123',
        initiatorId: 'user1',
        joinerId: 'user2',
        status: 'COMPLETED' as any,
        expiresAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-03'),
        initiator: {
          id: 'user1',
          displayName: 'User One',
          shareCode: 'SHARE1',
          avatarId: 'avatar-1',
        },
        joiner: {
          id: 'user2',
          displayName: 'User Two',
          shareCode: 'SHARE2',
          avatarId: 'avatar-2',
        },
        matchCount: 5,
      };

      vi.mocked(api.get).mockResolvedValue({
        data: { data: mockSession },
      });

      const result = await getTradeHistoryDetail('1');

      expect(api.get).toHaveBeenCalledWith('/trade/history/1');
      expect(result).toEqual(mockSession);
    });

    it('should handle not found error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Trade session not found'));

      await expect(getTradeHistoryDetail('invalid-id')).rejects.toThrow(
        'Trade session not found'
      );
    });

    it('should handle unauthorized access', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Not authorized to view this session'));

      await expect(getTradeHistoryDetail('1')).rejects.toThrow(
        'Not authorized to view this session'
      );
    });
  });
});
