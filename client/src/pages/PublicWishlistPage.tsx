import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
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
  Button,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Favorite as WishlistIcon,
  Storefront as StorefrontIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { getPublicWishlist } from '../services/public-binder-service';
import { WishlistCard } from '../components/wishlist/WishlistCard';
import { LoadingPage, LoadingSpinner } from '../components/ui/LoadingSpinner';

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
};

export function PublicWishlistPage() {
  const { t } = useTranslation();
  const { shareCode } = useParams<{ shareCode: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['publicWishlist', shareCode, search, page],
    queryFn: () =>
      getPublicWishlist(shareCode!, {
        page,
        pageSize,
        search: search || undefined,
      }),
    enabled: !!shareCode,
  });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !data) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
          {t('publicWishlist.invalidShareCode')}
        </Alert>
      </Box>
    );
  }

  const { user, items, total, totalPages } = data;

  return (
    <Stack spacing={3} sx={styles.container}>
      {/* Header */}
      <Paper sx={styles.header}>
        <WishlistIcon sx={styles.headerIcon} />
        <Typography variant="h4" fontWeight={700}>
          {t('publicWishlist.title', { name: user.displayName })}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('publicWishlist.subtitle')}
        </Typography>

        <Box sx={styles.statsRow}>
          <Chip
            label={t('publicWishlist.cardsWanted', { count: total })}
            color="primary"
            variant="outlined"
          />
          <Button
            component={RouterLink}
            to={`/binder/${shareCode}`}
            variant="outlined"
            size="small"
            startIcon={<StorefrontIcon />}
            sx={{ ml: 1, height: 32, borderRadius: 16 }}
          >
            {t('nav.collection')}
          </Button>
        </Box>
      </Paper>

      {/* Search */}
      <TextField
        fullWidth
        placeholder={t('publicWishlist.searchPlaceholder')}
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
            {search ? t('publicWishlist.noCardsMatch') : t('publicWishlist.noCardsWanted')}
          </Typography>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid key={item.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <WishlistCard item={item} />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
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
          {t('publicWishlist.contactTrader', { name: user.displayName })}{' '}
          <Typography component="span" fontWeight={600} color="primary.main" fontFamily="monospace">
            {user.shareCode}
          </Typography>
        </Typography>
      </Paper>
    </Stack>
  );
}
