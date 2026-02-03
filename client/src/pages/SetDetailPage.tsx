import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  LinearProgress,
  Alert,
  Button,
  Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  FavoriteBorder as WishlistIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { Card } from '@mtg-binder/shared';
import { getSetCompletion } from '../services/collection-service';
import { addToWishlist } from '../services/wishlist-service';
import { CardGrid, CardGridItem } from '../components/cards/CardGrid';
import { CardImage } from '../components/cards/CardImage';
import { LoadingPage } from '../components/ui/LoadingSpinner';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
  },
  header: {
    mb: 3,
  },
  backButton: {
    mb: 2,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2,
  },
  titleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  progressSection: {
    p: 3,
    mb: 3,
  },
  progressBar: {
    height: 12,
    borderRadius: 1,
    mb: 1,
  },
  stats: {
    display: 'flex',
    gap: 3,
    flexWrap: 'wrap',
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
  cardItem: {
    p: 2,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    transition: 'all 0.2s',
    '&:hover': {
      bgcolor: 'action.hover',
      boxShadow: 2,
    },
  },
  cardImageWrapper: {
    mb: 2,
  },
  cardInfo: {
    flexGrow: 1,
    mb: 2,
  },
  cardActions: {
    mt: 'auto',
  },
};

export function SetDetailPage() {
  const { t } = useTranslation();
  const { setCode } = useParams<{ setCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addingToWishlist, setAddingToWishlist] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['setCompletion', setCode],
    queryFn: () => getSetCompletion(setCode!),
    enabled: !!setCode,
  });

  const addToWishlistMutation = useMutation({
    mutationFn: (cardId: string) => addToWishlist({ cardId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setAddingToWishlist(null);
    },
    onError: () => {
      setAddingToWishlist(null);
    },
  });

  const handleAddToWishlist = (card: Card) => {
    setAddingToWishlist(card.id);
    addToWishlistMutation.mutate(card.id);
  };

  if (isLoading) return <LoadingPage />;

  if (error || !data) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error">{t('sets.failedToLoadSet')}</Alert>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/sets')}
          sx={{ mt: 2 }}
        >
          {t('sets.backToSets')}
        </Button>
      </Box>
    );
  }

  const getCompletionColor = (percentage: number): 'error' | 'warning' | 'info' | 'success' => {
    if (percentage === 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const completionColor = getCompletionColor(data.completionPercentage);

  return (
    <Box sx={styles.container}>
      <Box sx={styles.header}>
        <Button
          variant="text"
          startIcon={<BackIcon />}
          onClick={() => navigate('/sets')}
          sx={styles.backButton}
        >
          {t('sets.backToSets')}
        </Button>

        <Box sx={styles.titleRow}>
          <Box sx={styles.titleInfo}>
            <Typography variant="h4" component="h1">
              {data.setName}
            </Typography>
            <Chip
              label={data.setCode}
              size="small"
              variant="outlined"
            />
          </Box>
          <Chip
            label={`${data.completionPercentage}% ${t('sets.complete')}`}
            color={completionColor}
            sx={{ fontWeight: 700, fontSize: '1rem', height: 36 }}
          />
        </Box>
      </Box>

      <Paper sx={styles.progressSection}>
        <LinearProgress
          variant="determinate"
          value={data.completionPercentage}
          color={completionColor}
          sx={styles.progressBar}
        />
        <Box sx={styles.stats}>
          <Typography variant="body1">
            <strong>{data.ownedCount}</strong> {t('sets.owned')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            •
          </Typography>
          <Typography variant="body1">
            <strong>{data.totalCount}</strong> {t('sets.total')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            •
          </Typography>
          <Typography variant="body1" color="error.main">
            <strong>{data.missingCards.length}</strong> {t('sets.missing')}
          </Typography>
        </Box>
      </Paper>

      {data.missingCards.length === 0 ? (
        <Box sx={styles.emptyState}>
          <Typography variant="h5" color="success.main" gutterBottom>
            {t('sets.setComplete')}
          </Typography>
          <Typography color="text.secondary">
            {t('sets.ownAllCards', { setName: data.setName })}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>
            {t('sets.missingCards', { count: data.missingCards.length })}
          </Typography>

          <CardGrid>
            {data.missingCards.map((card) => (
              <CardGridItem key={card.id}>
                <Paper sx={styles.cardItem}>
                  <Box sx={styles.cardImageWrapper}>
                    <CardImage
                      scryfallId={card.scryfallId}
                      name={card.name}
                      size="normal"
                    />
                  </Box>

                  <Box sx={styles.cardInfo}>
                    <Typography variant="subtitle1" fontWeight={500} gutterBottom>
                      {card.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      #{card.collectorNumber} • {card.rarity}
                    </Typography>
                    {card.priceEur && (
                      <Typography variant="body2" color="success.main">
                        €{card.priceEur.toFixed(2)}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={styles.cardActions}>
                    <Button
                      variant="contained"
                      size="small"
                      fullWidth
                      startIcon={<WishlistIcon />}
                      onClick={() => handleAddToWishlist(card)}
                      disabled={addingToWishlist === card.id}
                    >
                      {addingToWishlist === card.id ? t('common.adding') : t('sets.addToWishlist')}
                    </Button>
                  </Box>
                </Paper>
              </CardGridItem>
            ))}
          </CardGrid>
        </>
      )}
    </Box>
  );
}
