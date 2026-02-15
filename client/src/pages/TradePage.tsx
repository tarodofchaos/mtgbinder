import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  Tabs,
  Tab,
  Snackbar,
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  History as HistoryIcon,
  SwapHoriz as TradeIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { createTradeSession, getActiveSessions, joinTradeSession } from '../services/trade-service';
import { useAuth } from '../context/auth-context';
import { QRCodeDisplay } from '../components/trading/QRCodeDisplay';
import { QRScanner } from '../components/trading/QRScanner';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { TradeHistoryTab } from '../components/trading/TradeHistoryTab';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
  },
  activeSession: {
    p: 2,
    bgcolor: 'success.main',
    color: 'success.contrastText',
    borderRadius: 2,
    '& .MuiTypography-root': {
      color: 'inherit',
    },
  },
  section: {
    p: 3,
  },
  sessionCode: {
    fontSize: '2rem',
    fontFamily: 'monospace',
    fontWeight: 700,
    letterSpacing: '0.25em',
    color: 'primary.main',
    textAlign: 'center',
  },
  dividerContainer: {
    position: 'relative',
    my: 2,
  },
  dividerText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    px: 2,
    bgcolor: 'background.paper',
    color: 'text.secondary',
  },
  joinCodeInput: {
    '& input': {
      fontFamily: 'monospace',
      textAlign: 'center',
      fontSize: '1.25rem',
      letterSpacing: '0.25em',
    },
  },
};

export function TradePage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const [joinCode, setJoinCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    if (location.state?.message) {
      setSnackbar({
        open: true,
        message: location.state.message,
        severity: location.state.severity || 'success',
      });
      // Clear state to prevent showing again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const publicTradesUrl = user?.shareCode
    ? `${window.location.origin}/binder/${user.shareCode}`
    : '';

  const { data: sessions } = useQuery({
    queryKey: ['tradeSessions'],
    queryFn: getActiveSessions,
  });

  const createMutation = useMutation({
    mutationFn: createTradeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradeSessions'] });
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinTradeSession,
    onSuccess: (session) => {
      navigate(`/trade/${session.sessionCode}`);
    },
  });

  const handleJoin = () => {
    if (joinCode.trim().length >= 6) {
      joinMutation.mutate(joinCode.trim().toUpperCase());
    }
  };

  const handleScan = (result: string) => {
    const code = result.includes('/trade/') ? result.split('/trade/')[1] : result;
    setShowScanner(false);
    joinMutation.mutate(code.trim().toUpperCase());
  };

  const pendingSession = sessions?.find((s) => s.status === 'PENDING');
  const activeSession = sessions?.find((s) => s.status === 'ACTIVE');

  return (
    <Stack spacing={3} sx={styles.container}>
      <Typography variant="h4" fontWeight={700}>
        {t('trade.title')}
      </Typography>

      {/* Tabs */}
      <Paper>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab icon={<TradeIcon />} label={t('trade.active')} iconPosition="start" />
          <Tab icon={<HistoryIcon />} label={t('trade.history')} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Active tab content */}
      {activeTab === 0 && (
        <Stack spacing={3}>
          {/* Active session notice */}
          {activeSession && (
        <Paper sx={styles.activeSession}>
          <Typography variant="h6" gutterBottom>
            {t('trade.activeSession')}
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('trade.tradingWith', {
              name: activeSession.joiner?.displayName || activeSession.initiator?.displayName
            })}
          </Typography>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => navigate(`/trade/${activeSession.sessionCode}`)}
          >
            {t('trade.viewMatches')}
          </Button>
        </Paper>
      )}

      {/* Create new session */}
      <Paper sx={styles.section}>
        <Typography variant="h5" gutterBottom>
          {t('trade.startTrade')}
        </Typography>

        {pendingSession ? (
          <Stack spacing={3} alignItems="center">
            <Typography color="text.secondary">
              {t('trade.shareCodeOrQr')}
            </Typography>

            <QRCodeDisplay
              value={`${window.location.origin}/trade/${pendingSession.sessionCode}`}
              size={200}
            />

            <Box textAlign="center">
              <Typography sx={styles.sessionCode}>
                {pendingSession.sessionCode}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('trade.sessionExpires')}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<CopyIcon />}
              onClick={() => {
                navigator.clipboard.writeText(pendingSession.sessionCode);
              }}
            >
              {t('trade.copyCode')}
            </Button>
          </Stack>
        ) : (
          <Box textAlign="center">
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {t('trade.createSessionDescription')}
            </Typography>
            <Button
              variant="contained"
              onClick={() => createMutation.mutate(undefined)}
              disabled={createMutation.isPending}
              startIcon={createMutation.isPending ? <LoadingSpinner size="sm" /> : undefined}
            >
              {createMutation.isPending ? t('common.creating') : t('trade.createSession')}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Join existing session */}
      <Paper sx={styles.section}>
        <Typography variant="h5" gutterBottom>
          {t('trade.joinTrade')}
        </Typography>

        {showScanner ? (
          <Stack spacing={2}>
            <QRScanner
              onScan={handleScan}
              onError={(error) => console.error('Scan error:', error)}
            />
            <Button variant="outlined" fullWidth onClick={() => setShowScanner(false)}>
              {t('common.cancel')}
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ScanIcon />}
              onClick={() => setShowScanner(true)}
            >
              {t('trade.scanQrCode')}
            </Button>

            <Box sx={styles.dividerContainer}>
              <Divider />
              <Typography variant="body2" sx={styles.dividerText}>
                {t('trade.enterCode')}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <TextField
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder={t('trade.enterCodePlaceholder')}
                slotProps={{ htmlInput: { maxLength: 6 } }}
                sx={{ ...styles.joinCodeInput, flexGrow: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joinMutation.isPending}
              >
                {joinMutation.isPending ? t('common.joining') : t('common.join')}
              </Button>
            </Stack>

            {joinMutation.isError && (
              <Alert severity="error">
                {(joinMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error || t('trade.joinFailed')}
              </Alert>
            )}
          </Stack>
        )}
      </Paper>

          {/* Share public trades */}
          {user?.shareCode && (
            <Paper sx={styles.section}>
              <Typography variant="h5" gutterBottom>
                <ShareIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {t('trade.shareMyTrades')}
              </Typography>

              <Stack spacing={3} alignItems="center">
                <Typography color="text.secondary" textAlign="center">
                  {t('trade.shareQrDescription')}
                </Typography>

                <QRCodeDisplay value={publicTradesUrl} size={200} />

                <Box textAlign="center">
                  <Typography
                    sx={{
                      fontSize: '1rem',
                      fontFamily: 'monospace',
                      color: 'primary.main',
                      wordBreak: 'break-all',
                    }}
                  >
                    {publicTradesUrl}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('trade.linkNeverExpires')}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CopyIcon />}
                    onClick={() => {
                      navigator.clipboard.writeText(publicTradesUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? t('common.copied') : t('common.copyLink')}
                  </Button>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate(`/binder/${user.shareCode}`)}
                  >
                    {t('common.preview')}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          )}
        </Stack>
      )}

      {/* History tab content */}
      {activeTab === 1 && <TradeHistoryTab />}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
