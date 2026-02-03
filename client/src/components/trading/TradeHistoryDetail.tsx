import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Paper,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { getTradeHistoryDetail } from '../../services/trade-service';
import { useAuth } from '../../context/auth-context';
import { MatchList } from './MatchList';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { TradeMatch } from '@mtg-binder/shared';

interface TradeHistoryDetailProps {
  sessionId: string;
  onClose: () => void;
}

const styles: Record<string, SxProps<Theme>> = {
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comparisonCard: {
    p: 2,
    mb: 3,
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
};

export function TradeHistoryDetail({ sessionId, onClose }: TradeHistoryDetailProps) {
  const { user } = useAuth();

  const { data: session, isLoading, error } = useQuery({
    queryKey: ['tradeHistoryDetail', sessionId],
    queryFn: () => getTradeHistoryDetail(sessionId),
  });

  const isInitiator = user?.id === session?.initiator?.id;
  const partner = session && (isInitiator ? session.joiner : session.initiator);

  // Parse matches from matchesJson
  let myOffers: TradeMatch[] = [];
  let theirOffers: TradeMatch[] = [];
  let myTotalValue = 0;
  let theirTotalValue = 0;

  if (session?.matchesJson) {
    const matches = session.matchesJson as any;
    myOffers = isInitiator ? matches.userAOffers || [] : matches.userBOffers || [];
    theirOffers = isInitiator ? matches.userBOffers || [] : matches.userAOffers || [];
    myTotalValue = isInitiator ? matches.userATotalValue || 0 : matches.userBTotalValue || 0;
    theirTotalValue = isInitiator ? matches.userBTotalValue || 0 : matches.userATotalValue || 0;
  }

  const valueDifference = myTotalValue - theirTotalValue;
  const sessionDate = session
    ? new Date(session.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={styles.dialogTitle}>
        <Box>
          <Typography variant="h6">Trade with {partner?.displayName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {sessionDate}
          </Typography>
        </Box>
        <IconButton onClick={onClose} edge="end">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LoadingSpinner size="lg" />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load trade session details
          </Alert>
        )}

        {session && (
          <Box>
            {/* Value comparison */}
            <Paper sx={styles.comparisonCard}>
              <Box sx={styles.comparisonGrid}>
                <Box>
                  <Typography sx={styles.comparisonLabel}>You Offered</Typography>
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
                  <Typography sx={styles.comparisonLabel}>They Offered</Typography>
                  <Typography sx={{ ...styles.comparisonValue, color: 'primary.main' }}>
                    €{theirTotalValue.toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Match counts summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={6}>
                <Paper sx={styles.summaryCard}>
                  <Typography sx={{ ...styles.summaryValue, color: 'success.main' }}>
                    {myOffers.filter((m) => m.isMatch).length}
                  </Typography>
                  <Typography sx={styles.summaryLabel}>
                    Your matches ({myOffers.length} total)
                  </Typography>
                </Paper>
              </Grid>
              <Grid size={6}>
                <Paper sx={styles.summaryCard}>
                  <Typography sx={{ ...styles.summaryValue, color: 'primary.main' }}>
                    {theirOffers.filter((m) => m.isMatch).length}
                  </Typography>
                  <Typography sx={styles.summaryLabel}>
                    Their matches ({theirOffers.length} total)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Match lists */}
            <MatchList
              matches={myOffers}
              totalValue={myTotalValue}
              title="Cards You Offered"
              emptyMessage="No cards were offered"
            />

            <Box sx={{ mt: 3 }}>
              <MatchList
                matches={theirOffers}
                totalValue={theirTotalValue}
                title="Cards They Offered"
                emptyMessage="No cards were offered"
              />
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
