import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardActionArea,
  CardContent,
  Chip,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { getTradeHistory } from '../../services/trade-service';
import { useAuth } from '../../context/auth-context';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { TradeHistoryDetail } from './TradeHistoryDetail';

const styles: Record<string, SxProps<Theme>> = {
  filterBar: {
    display: 'flex',
    gap: 2,
    flexDirection: { xs: 'column', sm: 'row' },
    mb: 3,
  },
  sessionCard: {
    mb: 2,
    transition: 'all 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: 4,
    },
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    mb: 1,
  },
  sessionMeta: {
    display: 'flex',
    gap: 2,
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
  emptyState: {
    py: 8,
    textAlign: 'center',
    color: 'text.secondary',
  },
};

export function TradeHistoryTab() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['tradeHistory', startDate, endDate, sort],
    queryFn: () => getTradeHistory({ startDate, endDate, sort }),
  });

  const handleClose = () => {
    setSelectedSessionId(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <LoadingSpinner size="lg" />
      </Box>
    );
  }

  return (
    <>
      <Stack spacing={3}>
        {/* Filters */}
        <Paper sx={{ p: 2 }}>
          <Box sx={styles.filterBar}>
            <TextField
              label={t('trade.historySort.startDate')}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <TextField
              label={t('trade.historySort.endDate')}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
              sx={{ flexGrow: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="history-sort-label">{t('trade.historySort.label')}</InputLabel>
              <Select
                labelId="history-sort-label"
                value={sort}
                label={t('trade.historySort.label')}
                onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
              >
                <MenuItem value="desc">{t('trade.historySort.newestFirst')}</MenuItem>
                <MenuItem value="asc">{t('trade.historySort.oldestFirst')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Session list */}
        {!sessions || sessions.length === 0 ? (
          <Box sx={styles.emptyState}>
            <HistoryIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
            <Typography variant="h6" gutterBottom>
              {t('trade.noHistory')}
            </Typography>
            <Typography variant="body2">
              {t('trade.noHistoryDescription')}
            </Typography>
          </Box>
        ) : (
          sessions.map((session) => {
            const partner =
              session.initiatorId === user?.id ? session.joiner : session.initiator;
            const sessionDate = new Date(session.createdAt).toLocaleDateString(i18n.language, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Card key={session.id} sx={styles.sessionCard}>
                <CardActionArea onClick={() => setSelectedSessionId(session.id)}>
                  <CardContent>
                    <Box sx={styles.sessionHeader}>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {partner?.displayName || t('trade.unknownUser')}
                        </Typography>
                        <Box sx={styles.sessionMeta}>
                          <Typography component="span">{sessionDate}</Typography>
                          <Typography component="span">•</Typography>
                          <Typography component="span">
                            {t('trade.session', { code: session.sessionCode })}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={t('matchList.matches', { count: session.matchCount || 0 })}
                        color="primary"
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })
        )}
      </Stack>

      {/* Detail modal */}
      {selectedSessionId && (
        <TradeHistoryDetail sessionId={selectedSessionId} onClose={handleClose} />
      )}
    </>
  );
}
