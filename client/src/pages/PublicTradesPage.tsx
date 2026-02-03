import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  Alert,
  Stack,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Storefront as StorefrontIcon,
  GridView as GridViewIcon,
  AutoStories as BinderIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { getPublicTrades } from '../services/public-binder-service';
import { PublicTradeCard } from '../components/trading/PublicTradeCard';
import { BinderView } from '../components/trading/BinderView';
import { LoadingPage, LoadingSpinner } from '../components/ui/LoadingSpinner';

type ViewMode = 'grid' | 'binder';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 4,
  },
  header: {
    p: 3,
    mb: 3,
    textAlign: 'center',
  },
  headerIcon: {
    fontSize: 48,
    color: 'primary.main',
    mb: 1,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 2,
    mt: 2,
    flexWrap: 'wrap',
  },
  searchContainer: {
    mb: 3,
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
  loadingMore: {
    display: 'flex',
    justifyContent: 'center',
    py: 3,
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: 2,
    mt: 3,
  },
  viewToggle: {
    mb: 2,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  binderContainer: {
    bgcolor: 'background.paper',
    borderRadius: 2,
    p: 2,
    boxShadow: 3,
  },
};

export function PublicTradesPage() {
  const { t } = useTranslation();
  const { shareCode } = useParams<{ shareCode: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // For grid view, paginate server-side. For binder view, fetch all items
  const pageSize = viewMode === 'grid' ? 24 : 500;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['publicTrades', shareCode, search, page, viewMode],
    queryFn: () =>
      getPublicTrades(shareCode!, {
        page: viewMode === 'binder' ? 1 : page,
        pageSize,
        search: search || undefined,
      }),
    enabled: !!shareCode,
  });

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode) {
      setViewMode(newMode);
      setPage(1); // Reset to first page when switching modes
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !data) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
          {t('publicBinder.invalidShareCode')}
        </Alert>
      </Box>
    );
  }

  const { user, items, total, totalPages } = data;

  // Calculate total value of all tradeable cards
  const totalValue = items.reduce((sum, item) => {
    const price = item.tradePrice ?? item.card?.priceEur ?? 0;
    return sum + price * item.forTrade;
  }, 0);

  return (
    <Stack spacing={3} sx={styles.container}>
      {/* Header */}
      <Paper sx={styles.header}>
        <StorefrontIcon sx={styles.headerIcon} />
        <Typography variant="h4" fontWeight={700}>
          {t('publicBinder.tradeBinder', { name: user.displayName })}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('publicBinder.browseCards')}
        </Typography>

        <Box sx={styles.statsRow}>
          <Chip
            label={t('publicBinder.cardsAvailable', { count: total })}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={t('publicBinder.totalValueLabel', { value: `€${totalValue.toFixed(2)}` })}
            color="success"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* Search and view toggle */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
        <TextField
          fullWidth
          placeholder={t('publicBinder.searchPlaceholder')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
        >
          <ToggleButton value="grid">
            <Tooltip title={t('publicBinder.gridView')}>
              <GridViewIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="binder">
            <Tooltip title={t('publicBinder.binderView')}>
              <BinderIcon />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Loading indicator for pagination */}
      {isFetching && !isLoading && (
        <Box sx={styles.loadingMore}>
          <LoadingSpinner size="sm" />
        </Box>
      )}

      {/* Cards display */}
      {items.length === 0 ? (
        <Paper sx={styles.emptyState}>
          <Typography variant="h6" color="text.secondary">
            {search ? t('publicBinder.noCardsMatch') : t('publicBinder.noCardsAvailable')}
          </Typography>
        </Paper>
      ) : viewMode === 'binder' ? (
        /* Binder View */
        <Box sx={styles.binderContainer}>
          <BinderView items={items} />
        </Box>
      ) : (
        /* Grid View */
        <>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <PublicTradeCard item={item} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination (only for grid view) */}
          {totalPages > 1 && (
            <Box sx={styles.pagination}>
              <Chip
                label={t('common.previous')}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                clickable
              />
              <Typography color="text.secondary" sx={{ alignSelf: 'center' }}>
                {t('common.page', { current: page, total: totalPages })}
              </Typography>
              <Chip
                label={t('common.next')}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                clickable
              />
            </Box>
          )}
        </>
      )}

      {/* Contact info */}
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('publicBinder.contactTrader', { name: user.displayName })}{' '}
          <Typography component="span" fontWeight={600} color="primary.main" fontFamily="monospace">
            {user.shareCode}
          </Typography>
        </Typography>
      </Paper>
    </Stack>
  );
}
