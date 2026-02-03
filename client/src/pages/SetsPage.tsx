import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import { LibraryBooks as SetsIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { getSetCompletions } from '../services/collection-service';
import { LoadingPage } from '../components/ui/LoadingSpinner';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    mb: 3,
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
  setCard: {
    p: 3,
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: 'action.hover',
      transform: 'translateY(-2px)',
      boxShadow: 3,
    },
  },
  setHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 2,
  },
  setInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  progressContainer: {
    mt: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 1,
  },
  stats: {
    display: 'flex',
    gap: 2,
    mt: 2,
  },
};

export function SetsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: sets, isLoading, error } = useQuery({
    queryKey: ['setCompletions'],
    queryFn: getSetCompletions,
  });

  if (isLoading) return <LoadingPage />;

  if (error) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error">{t('sets.failedToLoad')}</Alert>
      </Box>
    );
  }

  if (!sets || sets.length === 0) {
    return (
      <Box sx={styles.emptyState}>
        <SetsIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {t('sets.noSets')}
        </Typography>
        <Typography color="text.secondary">
          {t('sets.noSetsDescription')}
        </Typography>
      </Box>
    );
  }

  const getCompletionColor = (percentage: number): 'error' | 'warning' | 'info' | 'success' => {
    if (percentage === 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.header}>
        <SetsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" component="h1">
            {t('sets.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('sets.subtitle')}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={2}>
        {sets.map((set) => (
          <Paper
            key={set.setCode}
            sx={styles.setCard}
            onClick={() => navigate(`/sets/${set.setCode}`)}
          >
            <Box sx={styles.setHeader}>
              <Box sx={styles.setInfo}>
                <Typography variant="h6" component="h2">
                  {set.setName}
                </Typography>
                <Chip
                  label={set.setCode}
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Chip
                label={`${set.completionPercentage}%`}
                color={getCompletionColor(set.completionPercentage)}
                sx={{ fontWeight: 700 }}
              />
            </Box>

            <Box sx={styles.progressContainer}>
              <LinearProgress
                variant="determinate"
                value={set.completionPercentage}
                color={getCompletionColor(set.completionPercentage)}
                sx={styles.progressBar}
              />
            </Box>

            <Box sx={styles.stats}>
              <Typography variant="body2" color="text.secondary">
                <strong>{set.ownedCount}</strong> / {set.totalCount} {t('sets.cards')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                •
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>{set.totalCount - set.ownedCount}</strong> {t('sets.missing')}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
