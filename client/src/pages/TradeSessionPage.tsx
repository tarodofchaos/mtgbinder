import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Check as CheckIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { getTradeMatches, completeTradeSession, deleteTradeSession } from '../services/trade-service';
import { useAuth } from '../context/auth-context';
import { MatchList } from '../components/trading/MatchList';
import { LoadingPage } from '../components/ui/LoadingSpinner';

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
  comparisonCard: {
    p: 2,
  },
  comparisonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 2,
    textAlign: 'center',
  },
  comparisonLabel: {
    color: 'text.secondary',
    fontSize: '0.875rem',
    mb: 0.5,
  },
  comparisonValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  summaryCard: {
    p: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '2rem',
    fontWeight: 700,
  },
  summaryLabel: {
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
};

export function TradeSessionPage() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tradeMatches', code],
    queryFn: () => getTradeMatches(code!),
    enabled: !!code,
    refetchInterval: 30000,
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

  if (isLoading) return <LoadingPage />;

  if (error || !data) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
          Failed to load trade session
        </Alert>
        <Box>
          <Button variant="contained" onClick={() => navigate('/trade')}>
            Back to Trade
          </Button>
        </Box>
      </Box>
    );
  }

  const { session, userAOffers, userBOffers, userATotalValue, userBTotalValue } = data;
  const isInitiator = user?.id === session.initiator?.id;
  const partner = isInitiator ? session.joiner : session.initiator;

  const myOffers = isInitiator ? userAOffers : userBOffers;
  const theirOffers = isInitiator ? userBOffers : userAOffers;
  const myTotalValue = isInitiator ? userATotalValue : userBTotalValue;
  const theirTotalValue = isInitiator ? userBTotalValue : userATotalValue;

  const valueDifference = myTotalValue - theirTotalValue;

  return (
    <Stack spacing={3} sx={styles.container}>
      <Box sx={styles.header}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Trade with {partner?.displayName}
          </Typography>
          <Typography color="text.secondary">
            Session: {session.sessionCode}
          </Typography>
        </Box>

        {isInitiator && (
          <Box sx={styles.buttonGroup}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              onClick={() => {
                if (confirm('Complete this trade session?')) {
                  completeMutation.mutate();
                }
              }}
            >
              Complete
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (confirm('Delete this trade session?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              Delete
            </Button>
          </Box>
        )}
      </Box>

      {/* Value comparison */}
      <Paper sx={styles.comparisonCard}>
        <Box sx={styles.comparisonGrid}>
          <Box>
            <Typography sx={styles.comparisonLabel}>You Offer</Typography>
            <Typography sx={{ ...styles.comparisonValue, color: 'success.main' }}>
              €{myTotalValue.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={styles.comparisonLabel}>Difference</Typography>
            <Typography
              sx={{
                ...styles.comparisonValue,
                color: valueDifference >= 0 ? 'success.main' : 'error.main',
              }}
            >
              {valueDifference >= 0 ? '+' : ''}€{valueDifference.toFixed(2)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={styles.comparisonLabel}>They Offer</Typography>
            <Typography sx={{ ...styles.comparisonValue, color: 'primary.main' }}>
              €{theirTotalValue.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Match counts summary */}
      <Grid container spacing={2}>
        <Grid size={6}>
          <Paper sx={styles.summaryCard}>
            <Typography sx={{ ...styles.summaryValue, color: 'success.main' }}>
              {myOffers.filter((m) => m.isMatch).length}
            </Typography>
            <Typography sx={styles.summaryLabel}>
              Matching cards you can offer ({myOffers.length} total)
            </Typography>
          </Paper>
        </Grid>
        <Grid size={6}>
          <Paper sx={styles.summaryCard}>
            <Typography sx={{ ...styles.summaryValue, color: 'primary.main' }}>
              {theirOffers.filter((m) => m.isMatch).length}
            </Typography>
            <Typography sx={styles.summaryLabel}>
              Matching cards they can offer ({theirOffers.length} total)
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Match lists */}
      <MatchList
        matches={myOffers}
        totalValue={myTotalValue}
        title="Cards You Can Offer"
        emptyMessage="None of your tradeable cards match their wishlist"
      />

      <MatchList
        matches={theirOffers}
        totalValue={theirTotalValue}
        title="Cards They Can Offer"
        emptyMessage="None of their tradeable cards match your wishlist"
      />
    </Stack>
  );
}
