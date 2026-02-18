import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  Storefront as StorefrontIcon,
  SwapHoriz as TradeIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { getPublicWishlist } from '../services/public-binder-service';
import { WishlistCard } from '../components/wishlist/WishlistCard';
import { LoadingPage, LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/auth-context';
import { createTradeSession } from '../services/trade-service';
import { DynamicBanner } from '../components/ui/DynamicBanner';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 4,
  },
  header: {
    p: 3,
    mb: 3,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 4,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: 'divider',
  },
  headerIcon: {
    fontSize: 48,
    color: 'primary.main',
    mb: 1,
    position: 'relative',
    zIndex: 2,
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 2,
    mt: 2,
    flexWrap: 'wrap',
    position: 'relative',
    zIndex: 2,
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
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { shareCode } = useParams<{ shareCode: string }>();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 24;

  const createSessionMutation = useMutation({
    mutationFn: createTradeSession,
    onSuccess: (data) => {
      navigate(`/trade/${data.sessionCode}`);
    },
    onError: (error: any) => {
      console.error('Failed to create trade session:', error);
    },
  });

  const handleRequestTrade = (targetUserId: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    createSessionMutation.mutate({ withUserId: targetUserId });
  };

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
      {/* Header Banner */}
      <Box sx={{ position: 'relative', mb: 1 }}>
        <DynamicBanner
          title={t('publicWishlist.title', { name: user.displayName })}
          subtitle={t('publicWishlist.subtitle')}
          context={{
            scryfallId: items[0]?.card?.scryfallId || undefined,
            themeId: user.bannerTheme || undefined,
          }}
          height={200}
        />
        
        <Box sx={{ 
          position: 'absolute', 
          bottom: 20, 
          left: 0, 
          right: 0, 
          display: 'flex', 
          justifyContent: 'center', 
          gap: 2, 
          flexWrap: 'wrap',
          zIndex: 3
        }}>
          <Chip
            label={t('publicWishlist.cardsWanted', { count: total })}
            color="primary"
            sx={{ bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: 'white', fontWeight: 700 }}
          />
          <Button
            component={RouterLink}
            to={`/binder/${shareCode}`}
            variant="contained"
            size="small"
            startIcon={<StorefrontIcon />}
            sx={{ 
              height: 32, 
              borderRadius: 16, 
              bgcolor: 'rgba(255,255,255,0.9)', 
              color: 'black',
              '&:hover': { bgcolor: 'white' }
            }}
          >
            {t('nav.collection')}
          </Button>

          {currentUser?.id !== user.id && (
            <Button
              variant="contained"
              size="small"
              color="primary"
              startIcon={<TradeIcon />}
              onClick={() => handleRequestTrade(user.id)}
              disabled={createSessionMutation.isPending}
              sx={{ height: 32, borderRadius: 16 }}
            >
              {createSessionMutation.isPending ? t('common.loading') : t('publicWishlist.requestTrade')}
            </Button>
          )}
        </Box>
      </Box>

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: currentUser?.id !== user.id ? 2 : 0 }}>
          {t('publicWishlist.contactTrader', { name: user.displayName })}{' '}
          <Typography component="span" fontWeight={600} color="primary.main" fontFamily="monospace">
            {user.shareCode}
          </Typography>
        </Typography>

        {currentUser?.id !== user.id && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<TradeIcon />}
            onClick={() => handleRequestTrade(user.id)}
            disabled={createSessionMutation.isPending}
            sx={{ borderRadius: 2 }}
          >
            {createSessionMutation.isPending ? t('common.loading') : t('publicWishlist.requestTrade')}
          </Button>
        )}
      </Paper>
    </Stack>
  );
}
