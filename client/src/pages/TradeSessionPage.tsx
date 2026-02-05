import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Stack,
  Collapse,
  Snackbar,
} from '@mui/material';
import {
  Check as CheckIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getTradeMatches, completeTradeSession, deleteTradeSession, updateTradeSelection } from '../services/trade-service';
import { useAuth } from '../context/auth-context';
import { MatchList } from '../components/trading/MatchList';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { TradeChatPanel } from '../components/trading/TradeChatPanel';
import { joinTradeSessionRoom, leaveTradeSessionRoom } from '../services/socket-service';
import { useSocket } from '../hooks/useSocket';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    mb: 3,
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 2,
  },
  buttonGroup: {
    display: 'flex',
    gap: 1,
  },
  balanceBanner: {
    p: 2,
    textAlign: 'center',
    borderRadius: 2,
    mb: 3,
  },
  balanceValue: {
    fontSize: '1.75rem',
    fontWeight: 800,
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
  chatPanel: {
    height: '400px',
    mb: 3,
  },
  collapsibleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    p: 2,
    bgcolor: 'action.hover',
    borderRadius: 1,
  },
};

export function TradeSessionPage() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const socket = useSocket();

  const [mySelectedJson, setMySelectedJson] = useState<Record<string, number>>({});
  const [partnerSelectedJson, setPartnerSelectedJson] = useState<Record<string, number>>({});
  const [isMyCollectionOpen, setIsMyCollectionOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tradeMatches', code],
    queryFn: () => getTradeMatches(code!),
    enabled: !!code,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (data) {
      const isInitiator = user?.id === data.session.initiatorId;
      const serverMySelected = isInitiator ? data.userASelectedJson || {} : data.userBSelectedJson || {};
      const serverPartnerSelected = isInitiator ? data.userBSelectedJson || {} : data.userASelectedJson || {};
      
      if (Object.keys(mySelectedJson).length === 0) {
        setMySelectedJson(serverMySelected);
      }
      setPartnerSelectedJson(serverPartnerSelected);
    }
  }, [data, user?.id]);

  useEffect(() => {
    if (!socket || !code) return;

    const handleSelectionUpdated = (payload: { userId: string; selectionJson: Record<string, number> }) => {
      if (payload.userId === user?.id) {
        setMySelectedJson(payload.selectionJson);
      } else {
        setPartnerSelectedJson(payload.selectionJson);
      }
      refetch();
    };

    socket.on('trade:selection-updated', handleSelectionUpdated);
    return () => {
      socket.off('trade:selection-updated', handleSelectionUpdated);
    };
  }, [socket, code, user?.id, refetch]);

  const selectionMutation = useMutation({
    mutationFn: (json: Record<string, number>) => updateTradeSelection(code!, json),
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: t('trade.selectionSent'),
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: t('trade.selectionUpdateFailed'),
        severity: 'error',
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeTradeSession(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeSessions'] });
      navigate('/trade');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTradeSession(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeSessions'] });
      navigate('/trade');
    },
  });

  useEffect(() => {
    if (code) {
      joinTradeSessionRoom(code);
    }

    return () => {
      if (code) {
        leaveTradeSessionRoom(code);
      }
    };
  }, [code]);

  const handleToggleSelect = (cardId: string, quantity: number) => {
    setMySelectedJson((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[cardId];
      } else {
        next[cardId] = quantity;
      }
      return next;
    });
  };

  const handleSendSelection = () => {
    selectionMutation.mutate(mySelectedJson);
  };

  const tradeBalance = useMemo(() => {
    if (!data) return { myGivesValue: 0, myReceivesValue: 0, balance: 0 };

    const isInitiator = user?.id === data.session.initiatorId;
    const myOffers = isInitiator ? data.userAOffers : data.userBOffers;
    const partnerOffers = isInitiator ? data.userBOffers : data.userAOffers;

    // Value of cards PARTNER wants from ME (What I give)
    const myGivesValue = myOffers
      .filter((m) => partnerSelectedJson[m.card.id] > 0)
      .reduce((sum, m) => {
        const qty = partnerSelectedJson[m.card.id];
        return sum + (m.tradePrice ?? m.card.priceEur ?? 0) * qty;
      }, 0);

    // Value of cards I want from PARTNER (What I receive)
    const myReceivesValue = partnerOffers
      .filter((m) => mySelectedJson[m.card.id] > 0)
      .reduce((sum, m) => {
        const qty = mySelectedJson[m.card.id];
        return sum + (m.tradePrice ?? m.card.priceEur ?? 0) * qty;
      }, 0);

    // Balance = Receives - Gives
    // Positive: I receive more than I give (I OWE balance)
    // Negative: I give more than I receive (I am OWED balance)
    return {
      myGivesValue,
      myReceivesValue,
      balance: myReceivesValue - myGivesValue,
    };
  }, [data, user?.id, mySelectedJson, partnerSelectedJson]);

  if (isLoading) return <LoadingPage />;

  if (error || !data) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
          {t('trade.failedToLoad')}
        </Alert>
        <Box>
          <Button variant="contained" onClick={() => navigate('/trade')}>
            {t('trade.backToTrade')}
          </Button>
        </Box>
      </Box>
    );
  }

  const { session, userAOffers, userBOffers } = data;
  const isInitiator = user?.id === session.initiatorId;
  const partner = isInitiator ? session.joiner : session.initiator;

  const myOffers = isInitiator ? userAOffers : userBOffers;
  const theirOffers = isInitiator ? userBOffers : userAOffers;

  return (
    <Stack spacing={3} sx={styles.container}>
      {/* Balance Banner */}
      <Paper
        sx={{
          ...styles.balanceBanner,
          bgcolor: tradeBalance.balance === 0 
            ? 'action.hover' 
            : tradeBalance.balance > 0 ? 'error.light' : 'success.light',
          color: tradeBalance.balance === 0 
            ? 'text.primary' 
            : tradeBalance.balance > 0 ? 'error.contrastText' : 'success.contrastText',
        }}
      >
        <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.5 }}>
          {tradeBalance.balance === 0 
            ? t('trade.tradeBalanced')
            : tradeBalance.balance > 0 ? t('trade.youPayBalance') : t('trade.youReceiveBalance')}
        </Typography>
        <Typography sx={styles.balanceValue}>
          €{Math.abs(tradeBalance.balance).toFixed(2)}
        </Typography>
        <Stack direction="row" justifyContent="center" spacing={4} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="caption" display="block">{t('trade.youGiveValue')}</Typography>
            <Typography variant="subtitle2">€{tradeBalance.myGivesValue.toFixed(2)}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" display="block">{t('trade.youReceiveValue')}</Typography>
            <Typography variant="subtitle2">€{tradeBalance.myReceivesValue.toFixed(2)}</Typography>
          </Box>
        </Stack>
      </Paper>

      <Box sx={styles.header}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {t('trade.tradeWith', { name: partner?.displayName })}
          </Typography>
          <Typography color="text.secondary">
            {t('trade.session', { code: session.sessionCode })}
          </Typography>
        </Box>

        {isInitiator && (
          <Box sx={styles.buttonGroup}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => {
                if (confirm(t('trade.confirmComplete'))) {
                  completeMutation.mutate();
                }
              }}
            >
              {t('trade.completeSession')}
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (confirm(t('trade.confirmDelete'))) {
                  deleteMutation.mutate();
                }
              }}
            >
              {t('trade.deleteSession')}
            </Button>
          </Box>
        )}
      </Box>

      {/* Partner's Cards */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h6" fontWeight={600}>
            {t('trade.cardsTheyCanOffer')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendSelection}
            disabled={selectionMutation.isPending}
          >
            {t('trade.sendSelection')}
          </Button>
        </Stack>
        <MatchList
          matches={theirOffers}
          totalValue={theirOffers.reduce((sum, m) => sum + (m.card.priceEur ?? 0) * m.availableQuantity, 0)}
          title=""
          emptyMessage={t('trade.noMatchTheirCards')}
          isSelectable={true}
          selectedJson={mySelectedJson}
          onToggleSelect={handleToggleSelect}
        />
      </Box>

      {/* Chat Panel */}
      <Box sx={styles.chatPanel}>
        <TradeChatPanel sessionCode={code!} partnerName={partner?.displayName || 'Partner'} />
      </Box>

      {/* User's Cards */}
      <Box>
        <Box 
          sx={styles.collapsibleHeader} 
          onClick={() => setIsMyCollectionOpen(!isMyCollectionOpen)}
        >
          <Typography variant="h6" fontWeight={600}>
            {t('trade.cardsYouCanOffer')} ({myOffers.length})
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {Object.keys(partnerSelectedJson).length} cards selected by them
            </Typography>
            {isMyCollectionOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
        </Box>
        <Collapse in={isMyCollectionOpen}>
          <Box sx={{ mt: 2 }}>
            <MatchList
              matches={myOffers}
              totalValue={myOffers.reduce((sum, m) => sum + (m.card.priceEur ?? 0) * m.availableQuantity, 0)}
              title=""
              emptyMessage={t('trade.noMatchYourCards')}
              selectedJson={partnerSelectedJson}
            />
          </Box>
        </Collapse>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
