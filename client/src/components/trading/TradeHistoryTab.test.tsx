import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TradeHistoryTab } from './TradeHistoryTab';
import * as tradeService from '../../services/trade-service';
import * as authContext from '../../context/auth-context';
import type { TradeSession } from '@mtg-binder/shared';

// Mock services
vi.mock('../../services/trade-service', () => ({
  getTradeHistory: vi.fn(),
  getTradeHistoryDetail: vi.fn(),
}));

// Mock auth context
vi.mock('../../context/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock the detail component to avoid nested complexity
vi.mock('./TradeHistoryDetail', () => ({
  TradeHistoryDetail: ({ sessionId, onClose }: any) => (
    <div data-testid="history-detail-modal">
      <span>Session ID: {sessionId}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('TradeHistoryTab', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(authContext.useAuth).mockReturnValue({
      user: {
        id: 'user1',
        email: 'test@example.com',
        displayName: 'Test User',
        shareCode: 'SHARE1',
        createdAt: new Date(),
      },
      token: 'mock-token',
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false,
    });

    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TradeHistoryTab />
      </QueryClientProvider>
    );
  };

  it('should render empty state when no history exists', async () => {
    vi.mocked(tradeService.getTradeHistory).mockResolvedValue([]);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No Trade History')).toBeInTheDocument();
    });

    expect(screen.getByText('Your completed trade sessions will appear here.')).toBeInTheDocument();
  });

  it('should render trade sessions list', async () => {
    const mockSessions: TradeSession[] = [
      {
        id: '1',
        sessionCode: 'ABC123',
        initiatorId: 'user1',
        joinerId: 'user2',
        status: 'COMPLETED' as any,
        expiresAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-03T10:30:00'),
        joiner: {
          id: 'user2',
          displayName: 'Partner User',
          shareCode: 'SHARE2',
        },
        matchCount: 5,
      },
    ];

    vi.mocked(tradeService.getTradeHistory).mockResolvedValue(mockSessions);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Partner User')).toBeInTheDocument();
    });

    expect(screen.getByText('5 matches')).toBeInTheDocument();
    expect(screen.getByText(/Code: ABC123/)).toBeInTheDocument();
  });

  it('should show partner name for user as joiner', async () => {
    const mockSessions: TradeSession[] = [
      {
        id: '1',
        sessionCode: 'ABC123',
        initiatorId: 'user2',
        joinerId: 'user1', // Current user is joiner
        status: 'COMPLETED' as any,
        expiresAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-03T10:30:00'),
        initiator: {
          id: 'user2',
          displayName: 'Initiator User',
          shareCode: 'SHARE2',
        },
        matchCount: 3,
      },
    ];

    vi.mocked(tradeService.getTradeHistory).mockResolvedValue(mockSessions);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Initiator User')).toBeInTheDocument();
    });

    expect(screen.getByText('3 matches')).toBeInTheDocument();
  });

  it('should render filter controls', async () => {
    vi.mocked(tradeService.getTradeHistory).mockResolvedValue([]);

    renderComponent();

    // Wait for initial load to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    // Verify filter paper exists with controls
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('should open detail modal when session card is clicked', async () => {
    const mockSessions: TradeSession[] = [
      {
        id: '1',
        sessionCode: 'ABC123',
        initiatorId: 'user1',
        joinerId: 'user2',
        status: 'COMPLETED' as any,
        expiresAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-03T10:30:00'),
        joiner: {
          id: 'user2',
          displayName: 'Partner User',
          shareCode: 'SHARE2',
        },
        matchCount: 5,
      },
    ];

    vi.mocked(tradeService.getTradeHistory).mockResolvedValue(mockSessions);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Partner User')).toBeInTheDocument();
    });

    const sessionCard = screen.getByText('Partner User').closest('button');
    await userEvent.click(sessionCard!);

    await waitFor(() => {
      expect(screen.getByTestId('history-detail-modal')).toBeInTheDocument();
    });

    expect(screen.getByText('Session ID: 1')).toBeInTheDocument();
  });

  it('should close detail modal', async () => {
    const mockSessions: TradeSession[] = [
      {
        id: '1',
        sessionCode: 'ABC123',
        initiatorId: 'user1',
        joinerId: 'user2',
        status: 'COMPLETED' as any,
        expiresAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-03T10:30:00'),
        joiner: {
          id: 'user2',
          displayName: 'Partner User',
          shareCode: 'SHARE2',
        },
        matchCount: 5,
      },
    ];

    vi.mocked(tradeService.getTradeHistory).mockResolvedValue(mockSessions);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Partner User')).toBeInTheDocument();
    });

    const sessionCard = screen.getByText('Partner User').closest('button');
    await userEvent.click(sessionCard!);

    await waitFor(() => {
      expect(screen.getByTestId('history-detail-modal')).toBeInTheDocument();
    });

    const closeButton = screen.getByText('Close');
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('history-detail-modal')).not.toBeInTheDocument();
    });
  });

  it('should show loading spinner while fetching data', async () => {
    vi.mocked(tradeService.getTradeHistory).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
    );

    renderComponent();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should format date correctly', async () => {
    const mockSessions: TradeSession[] = [
      {
        id: '1',
        sessionCode: 'ABC123',
        initiatorId: 'user1',
        joinerId: 'user2',
        status: 'COMPLETED' as any,
        expiresAt: new Date('2026-02-10'),
        createdAt: new Date('2026-02-03T14:30:00'),
        joiner: {
          id: 'user2',
          displayName: 'Partner User',
          shareCode: 'SHARE2',
        },
        matchCount: 5,
      },
    ];

    vi.mocked(tradeService.getTradeHistory).mockResolvedValue(mockSessions);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Partner User')).toBeInTheDocument();
    });

    // Date should be formatted like "Feb 3, 2026, 02:30 PM"
    expect(screen.getByText(/Feb 3, 2026/)).toBeInTheDocument();
  });
});
