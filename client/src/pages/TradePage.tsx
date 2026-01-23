import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
} from '@mui/material';
import { QrCodeScanner as ScanIcon, ContentCopy as CopyIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { createTradeSession, getActiveSessions, joinTradeSession } from '../services/trade-service';
import { QRCodeDisplay } from '../components/trading/QRCodeDisplay';
import { QRScanner } from '../components/trading/QRScanner';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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
  const [joinCode, setJoinCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
        Trade
      </Typography>

      {/* Active session notice */}
      {activeSession && (
        <Paper sx={styles.activeSession}>
          <Typography variant="h6" gutterBottom>
            Active Trade Session
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You have an active trade session with{' '}
            {activeSession.joiner?.displayName || activeSession.initiator?.displayName}
          </Typography>
          <Button
            variant="contained"
            color="inherit"
            onClick={() => navigate(`/trade/${activeSession.sessionCode}`)}
          >
            View Matches
          </Button>
        </Paper>
      )}

      {/* Create new session */}
      <Paper sx={styles.section}>
        <Typography variant="h5" gutterBottom>
          Start a Trade
        </Typography>

        {pendingSession ? (
          <Stack spacing={3} alignItems="center">
            <Typography color="text.secondary">
              Share this code or QR with someone to start trading:
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
                Session expires in 24 hours
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
              Copy Code
            </Button>
          </Stack>
        ) : (
          <Box textAlign="center">
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Create a trade session to find matches with other collectors
            </Typography>
            <Button
              variant="contained"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              startIcon={createMutation.isPending ? <LoadingSpinner size="sm" /> : undefined}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Trade Session'}
            </Button>
          </Box>
        )}
      </Paper>

      {/* Join existing session */}
      <Paper sx={styles.section}>
        <Typography variant="h5" gutterBottom>
          Join a Trade
        </Typography>

        {showScanner ? (
          <Stack spacing={2}>
            <QRScanner
              onScan={handleScan}
              onError={(error) => console.error('Scan error:', error)}
            />
            <Button variant="outlined" fullWidth onClick={() => setShowScanner(false)}>
              Cancel
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
              Scan QR Code
            </Button>

            <Box sx={styles.dividerContainer}>
              <Divider />
              <Typography variant="body2" sx={styles.dividerText}>
                or enter code
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <TextField
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                slotProps={{ htmlInput: { maxLength: 6 } }}
                sx={{ ...styles.joinCodeInput, flexGrow: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleJoin}
                disabled={joinCode.length < 6 || joinMutation.isPending}
              >
                {joinMutation.isPending ? 'Joining...' : 'Join'}
              </Button>
            </Stack>

            {joinMutation.isError && (
              <Alert severity="error">
                Failed to join session. Check the code and try again.
              </Alert>
            )}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
