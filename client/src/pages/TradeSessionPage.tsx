import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Stack,
  Collapse,
  Snackbar,
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  Check as CheckIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  getTradeMatches, 
  completeTradeSession, 
  deleteTradeSession, 
  updateTradeSelection,
  acceptTrade 
} from '../services/trade-service';
import { getWishlist, removeFromWishlist } from '../services/wishlist-service';
import { useAuth } from '../context/auth-context';
import { MatchList } from '../components/trading/MatchList';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { TradeChatPanel } from '../components/trading/TradeChatPanel';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { joinTradeSessionRoom, leaveTradeSessionRoom } from '../services/socket-service';
import { useSocket } from '../hooks/useSocket';
import { getScryfallImageUrl } from '@mtg-binder/shared';

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
    flexWrap: 'wrap',
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
  briefingList: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    mt: 1,
  }
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

  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmWishlistRemoveOpen, setConfirmWishlistRemoveOpen] = useState(false);
  const [matchedWishlistItems, setMatchedWishlistItems] = useState<{ id: string; name: string }[]>([]);
  
  // Track if initial data has been loaded to avoid overriding state with server data repeatedly
  const initialLoadDone = useRef(false);
  const selectionUpdateTimer = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tradeMatches', code],
    queryFn: () => getTradeMatches(code!),
    enabled: !!code,
    refetchInterval: 30000,
  });

  const { data: wishlist } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => getWishlist({ pageSize: 1000 }),
    enabled: !!user,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Check for session completion or errors
  useEffect(() => {
    if (data && data.session.status === 'COMPLETED') {
      navigate('/trade', { 
        replace: true,
        state: { 
          message: t('trade.sessionAlreadyCompleted', 'This trade session has been completed.'),
          severity: 'info'
        } 
      });
    }
  }, [data, navigate, t]);

  useEffect(() => {
    if (error) {
      navigate('/trade', { 
        replace: true,
        state: { 
          message: t('trade.sessionNotFoundOrOver', 'Trade session not found or already finished.'),
          severity: 'warning'
        } 
      });
    }
  }, [error, navigate, t]);

  useEffect(() => {
    if (data) {
      const isInitiator = user?.id === data.session.initiatorId;
      const serverMySelected = isInitiator ? data.userASelectedJson || {} : data.userBSelectedJson || {};
      const serverPartnerSelected = isInitiator ? data.userBSelectedJson || {} : data.userASelectedJson || {};
      
      if (!initialLoadDone.current) {
        setMySelectedJson(serverMySelected);
        initialLoadDone.current = true;
      }
      setPartnerSelectedJson(serverPartnerSelected);
    }
  }, [data, user?.id]);

  useEffect(() => {
    if (!socket || !code) return;

    const handleSelectionUpdated = (payload: { 
      userId: string; 
      selectionJson: Record<string, number>;
      userAAccepted: boolean;
      userBAccepted: boolean;
    }) => {
      if (payload.userId === user?.id) {
        setMySelectedJson(payload.selectionJson);
      } else {
        setPartnerSelectedJson(payload.selectionJson);
      }
      refetch();
    };

    const handleAcceptanceUpdated = (_payload: { userId: string; accepted: boolean }) => {
      refetch();
    };

    const handleUserJoined = () => {
      refetch();
    };

    socket.on('trade:selection-updated', handleSelectionUpdated);
    socket.on('trade:acceptance-updated', handleAcceptanceUpdated);
    socket.on('trade:user-joined', handleUserJoined);

    return () => {
      socket.off('trade:selection-updated', handleSelectionUpdated);
      socket.off('trade:acceptance-updated', handleAcceptanceUpdated);
      socket.off('trade:user-joined', handleUserJoined);
    };
  }, [socket, code, user?.id, refetch]);

  const selectionMutation = useMutation({
    mutationFn: (json: Record<string, number>) => updateTradeSelection(code!, json),
    onSuccess: () => {
      // Quiet success for dynamic updates
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: t('trade.selectionUpdateFailed'),
        severity: 'error',
      });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (accepted: boolean) => acceptTrade(code!, accepted),
    onSuccess: () => {
      refetch();
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => completeTradeSession(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeSessions'] });
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      
      // Check for wishlist matches
      if (wishlist?.data && tradeBalance.myReceives.length > 0) {
        const matches = wishlist.data
          .filter(wishItem => 
            tradeBalance.myReceives.some(receive => 
              receive.card.name.toLowerCase() === wishItem.card?.name.toLowerCase()
            )
          )
          .map(item => ({ id: item.id, name: item.card?.name || '' }));

        if (matches.length > 0) {
          setMatchedWishlistItems(matches);
          setConfirmWishlistRemoveOpen(true);
          return;
        }
      }

      navigate('/trade', {
        state: {
          message: t('trade.completedSuccess', 'Trade completed successfully! Cards have been moved to your collection.'),
          severity: 'success'
        }
      });
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || t('common.error'),
        severity: 'error',
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTradeSession(code!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeSessions'] });
      navigate('/trade');
    },
  });

  const removeWishlistMutation = useMutation({
    mutationFn: async (items: { id: string; name: string }[]) => {
      await Promise.all(items.map(item => removeFromWishlist(item.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      navigate('/trade', {
        state: {
          message: t('trade.completedSuccess', 'Trade completed successfully! Cards have been moved to your collection.'),
          severity: 'success'
        }
      });
    },
  });

  useEffect(() => {
    if (code && socket) {
      joinTradeSessionRoom(code);
    }

    return () => {
      if (code && socket) {
        leaveTradeSessionRoom(code);
      }
    };
  }, [code, socket]);

  // Debounced selection update
  const syncSelection = (json: Record<string, number>) => {
    if (selectionUpdateTimer.current) {
      clearTimeout(selectionUpdateTimer.current);
    }
    selectionUpdateTimer.current = setTimeout(() => {
      selectionMutation.mutate(json);
    }, 1000);
  };

  const handleToggleSelect = (collectionItemId: string, quantity: number) => {
    if (!collectionItemId || collectionItemId === 'undefined') return;

    setMySelectedJson((prev) => {
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[collectionItemId];
      } else {
        next[collectionItemId] = quantity;
      }
      syncSelection(next);
      return next;
    });
  };

  const tradeBalance = useMemo(() => {
    if (!data) return { myGivesValue: 0, myReceivesValue: 0, balance: 0, myGives: [], myReceives: [] };

    const isInitiator = user?.id === data.session.initiatorId;
    const myOffers = isInitiator ? data.userAOffers : data.userBOffers;
    const partnerOffers = isInitiator ? data.userBOffers : data.userAOffers;

    // Items PARTNER wants from ME (What I give)
    const myGives = myOffers
      .filter((m) => partnerSelectedJson[m.collectionItemId] > 0)
      .map(m => ({
        ...m,
        quantity: partnerSelectedJson[m.collectionItemId]
      }));

    const myGivesValue = myGives.reduce((sum, m) => {
      return sum + (m.tradePrice ?? m.card.priceEur ?? 0) * m.quantity;
    }, 0);

    // Items I want from PARTNER (What I receive)
    const myReceives = partnerOffers
      .filter((m) => mySelectedJson[m.collectionItemId] > 0)
      .map(m => ({
        ...m,
        quantity: mySelectedJson[m.collectionItemId]
      }));

    const myReceivesValue = myReceives.reduce((sum, m) => {
      return sum + (m.tradePrice ?? m.card.priceEur ?? 0) * m.quantity;
    }, 0);

    return {
      myGives,
      myReceives,
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
  const myAccepted = isInitiator ? session.userAAccepted : session.userBAccepted;
  const partnerAccepted = isInitiator ? session.userBAccepted : session.userAAccepted;

  const myOffers = isInitiator ? userAOffers : userBOffers;
  const theirOffers = isInitiator ? userBOffers : userAOffers;

  const handleAccept = () => {
    acceptMutation.mutate(!myAccepted);
  };

  const canComplete = isInitiator && session.userAAccepted && session.userBAccepted;

  const Briefing = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {t('trade.summaryBriefing', 'Trade Summary')}
      </Typography>
      
      <Typography variant="body2" color="error.main" fontWeight="bold">
        {t('trade.youGive', 'You give')}:
      </Typography>
      <List dense sx={styles.briefingList}>
        {tradeBalance.myGives.map((m: any) => (
          <ListItem key={m.collectionItemId}>
            <Avatar 
              src={getScryfallImageUrl(m.card.scryfallId, 'small') || undefined} 
              variant="rounded" 
              sx={{ width: 32, height: 44, mr: 1 }}
            />
            <ListItemText 
              primary={`${m.quantity}x ${m.card.name}`} 
              secondary={`${m.condition} - €${((m.tradePrice ?? m.card.priceEur ?? 0) * m.quantity).toFixed(2)}`} 
            />
          </ListItem>
        ))}
        {tradeBalance.myGives.length === 0 && (
          <ListItem><ListItemText primary={t('common.none')} /></ListItem>
        )}
      </List>

      <Typography variant="body2" color="success.main" fontWeight="bold" sx={{ mt: 2 }}>
        {t('trade.youReceive', 'You receive')}:
      </Typography>
      <List dense sx={styles.briefingList}>
        {tradeBalance.myReceives.map((m: any) => (
          <ListItem key={m.collectionItemId}>
            <Avatar 
              src={getScryfallImageUrl(m.card.scryfallId, 'small') || undefined} 
              variant="rounded" 
              sx={{ width: 32, height: 44, mr: 1 }}
            />
            <ListItemText 
              primary={`${m.quantity}x ${m.card.name}`} 
              secondary={`${m.condition} - €${((m.tradePrice ?? m.card.priceEur ?? 0) * m.quantity).toFixed(2)}`} 
            />
          </ListItem>
        ))}
        {tradeBalance.myReceives.length === 0 && (
          <ListItem><ListItemText primary={t('common.none')} /></ListItem>
        )}
      </List>

      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('trade.balance', 'Balance')}:</Typography>
        <Typography variant="h6" color={tradeBalance.balance >= 0 ? 'success.main' : 'error.main'}>
          {tradeBalance.balance >= 0 ? '+' : ''}€{tradeBalance.balance.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Stack spacing={3} sx={styles.container}>
      {/* Balance Banner */}
      <Paper
        id="trade-session-balance"
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
            {partner ? t('trade.tradeWith', { name: partner.displayName }) : t('trade.waitingForPartner')}
          </Typography>
          <Typography color="text.secondary">
            {t('trade.session', { code: session.sessionCode })}
          </Typography>
        </Box>

        <Box sx={styles.buttonGroup}>
          <Button
            id="trade-session-accept"
            variant={myAccepted ? "contained" : "outlined"}
            color={myAccepted ? "success" : "primary"}
            startIcon={myAccepted ? <CheckIcon /> : undefined}
            onClick={handleAccept}
            disabled={!partner || acceptMutation.isPending}
          >
            {myAccepted ? t('trade.accepted', 'Accepted') : t('trade.acceptTrade', 'Accept Trade')}
          </Button>

          {isInitiator && (
            <>
              <Button
                id="trade-session-complete"
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={() => setConfirmCompleteOpen(true)}
                disabled={!canComplete}
              >
                {t('trade.completeSession')}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                {t('trade.deleteSession')}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {partner && (
        <Alert 
          severity={partnerAccepted ? "success" : "info"} 
          icon={partnerAccepted ? <CheckIcon /> : undefined}
        >
          {partnerAccepted 
            ? t('trade.partnerAccepted', { name: partner.displayName }) 
            : t('trade.partnerThinking', { name: partner.displayName })}
        </Alert>
      )}

      {/* Partner's Cards */}
      <Box id="trade-session-partner-offers">
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
          {t('trade.cardsTheyCanOffer')}
        </Typography>
        <MatchList
          matches={theirOffers}
          totalValue={theirOffers.reduce((sum, m) => sum + (m.card.priceEur ?? 0) * m.availableQuantity, 0)}
          title=""
          emptyMessage={t('trade.noMatchTheirCards')}
          isSelectable={!!partner}
          selectedJson={mySelectedJson}
          onToggleSelect={handleToggleSelect}
        />
      </Box>

      {/* Chat Panel */}
      <Box id="trade-session-chat" sx={styles.chatPanel}>
        <TradeChatPanel sessionCode={code!} partnerName={partner?.displayName || 'Partner'} />
      </Box>

      {/* User's Cards */}
      <Box id="trade-session-my-offers">
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

      <ConfirmationModal
        isOpen={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        onConfirm={() => {
          completeMutation.mutate();
          setConfirmCompleteOpen(false);
        }}
        title={t('trade.completeSession')}
        message={
          <Box>
            <Typography>{t('trade.confirmCompleteBriefing', 'Review the trade before finalizing. This action cannot be undone.')}</Typography>
            <Briefing />
          </Box>
        }
        severity="success"
        isLoading={completeMutation.isPending}
      />

      <ConfirmationModal
        isOpen={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate();
          setConfirmDeleteOpen(false);
        }}
        title={t('trade.deleteSession')}
        message={t('trade.confirmDelete')}
        severity="error"
        isLoading={deleteMutation.isPending}
      />

      <ConfirmationModal
        isOpen={confirmWishlistRemoveOpen}
        onClose={() => {
          setConfirmWishlistRemoveOpen(false);
          navigate('/trade', {
            state: {
              message: t('trade.completedSuccess', 'Trade completed successfully! Cards have been moved to your collection.'),
              severity: 'success'
            }
          });
        }}
        onConfirm={() => {
          removeWishlistMutation.mutate(matchedWishlistItems);
          setConfirmWishlistRemoveOpen(false);
        }}
        title={t('trade.removeFromWishlistTitle')}
        message={
          <Box>
            <Typography sx={{ mb: 2 }}>{t('trade.removeFromWishlistMessage')}</Typography>
            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
              {matchedWishlistItems.map((item) => (
                <ListItem key={item.id}>
                  <ListItemText primary={item.name} />
                </ListItem>
              ))}
            </List>
          </Box>
        }
        confirmText={t('trade.confirmRemoveFromWishlist')}
        cancelText={t('trade.keepInWishlist')}
        severity="success"
        isLoading={removeWishlistMutation.isPending}
      />
    </Stack>
  );
}
