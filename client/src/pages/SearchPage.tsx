import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  Pagination,
  Card,
  CardContent,
  CardActionArea,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material';
import { Card as CardType } from '@mtg-binder/shared';
import { searchCards, CardSearchParams } from '../services/card-service';
import { CardGrid, CardGridItem } from '../components/cards/CardGrid';
import { CardImage } from '../components/cards/CardImage';
import { Modal } from '../components/ui/Modal';
import { LoadingPage, LoadingSpinner } from '../components/ui/LoadingSpinner';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
  },
  searchForm: {
    p: 2,
    mb: 3,
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    mt: 3,
  },
  resultCard: {
    height: '100%',
    transition: 'box-shadow 0.2s',
    '&:hover': {
      boxShadow: 6,
    },
  },
  cardPrice: {
    color: 'success.main',
    mt: 0.5,
  },
  modalContent: {
    display: 'flex',
    flexDirection: { xs: 'column', md: 'row' },
    gap: 3,
  },
  modalImage: {
    flexShrink: 0,
    width: { xs: '100%', md: 256 },
  },
  modalDetails: {
    flexGrow: 1,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 2,
  },
};

export function SearchPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [setCode, setSetCode] = useState('');
  const [rarity, setRarity] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  const params: CardSearchParams = {
    q: searchQuery || undefined,
    setCode: setCode || undefined,
    rarity: rarity || undefined,
    page,
    pageSize: 24,
  };

  const hasSearch = searchQuery || setCode || rarity;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['cardSearch', params],
    queryFn: () => searchCards(params),
    enabled: Boolean(hasSearch),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const cards = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Box sx={styles.container}>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        {t('search.title')}
      </Typography>

      {/* Search form */}
      <Paper component="form" onSubmit={handleSearch} sx={styles.searchForm}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search.cardNamePlaceholder')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              value={setCode}
              onChange={(e) => setSetCode(e.target.value.toUpperCase())}
              placeholder={t('search.setCodePlaceholder')}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
              fullWidth
            >
              <MenuItem value="">{t('rarities.anyRarity')}</MenuItem>
              <MenuItem value="common">{t('rarities.common')}</MenuItem>
              <MenuItem value="uncommon">{t('rarities.uncommon')}</MenuItem>
              <MenuItem value="rare">{t('rarities.rare')}</MenuItem>
              <MenuItem value="mythic">{t('rarities.mythic')}</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" disabled={isFetching}>
            {isFetching ? <LoadingSpinner size="sm" /> : t('common.search')}
          </Button>
        </Box>
      </Paper>

      {/* Results */}
      {!hasSearch ? (
        <Box sx={styles.emptyState}>
          <Typography color="text.secondary">
            {t('search.enterSearchTerm')}
          </Typography>
        </Box>
      ) : isLoading ? (
        <LoadingPage />
      ) : cards.length === 0 ? (
        <Box sx={styles.emptyState}>
          <Typography color="text.secondary">
            {t('search.noResults')}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('search.foundCards', { count: data?.total || 0 })}
          </Typography>

          <CardGrid>
            {cards.map((card) => (
              <CardGridItem key={card.id}>
                <Card sx={styles.resultCard}>
                  <CardActionArea onClick={() => setSelectedCard(card)}>
                    <CardImage
                      scryfallId={card.scryfallId}
                      name={card.name}
                      size="normal"
                    />
                    <CardContent>
                      <Typography variant="subtitle2" noWrap title={card.name}>
                        {card.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {card.setName}
                      </Typography>
                      {card.priceEur && (
                        <Typography variant="body2" sx={styles.cardPrice}>
                          €{card.priceEur.toFixed(2)}
                        </Typography>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </CardGridItem>
            ))}
          </CardGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={styles.paginationContainer}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Card detail modal */}
      <Modal isOpen={!!selectedCard} onClose={() => setSelectedCard(null)} size="lg">
        {selectedCard && (
          <Box sx={styles.modalContent}>
            <Box sx={styles.modalImage}>
              <CardImage
                scryfallId={selectedCard.scryfallId}
                name={selectedCard.name}
                size="large"
              />
            </Box>
            <Box sx={styles.modalDetails}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {selectedCard.name}
              </Typography>
              <Typography color="text.secondary" gutterBottom>
                {selectedCard.typeLine}
              </Typography>

              {selectedCard.manaCost && (
                <Typography sx={{ mb: 1 }}>
                  <Typography component="span" color="text.secondary">
                    {t('search.manaCost')}
                  </Typography>{' '}
                  {selectedCard.manaCost}
                </Typography>
              )}

              {selectedCard.oracleText && (
                <Typography sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
                  {selectedCard.oracleText}
                </Typography>
              )}

              <Box sx={styles.detailGrid}>
                <Typography variant="body2">
                  <Typography component="span" color="text.secondary">
                    {t('search.setLabel')}
                  </Typography>{' '}
                  {selectedCard.setName}
                </Typography>
                <Typography variant="body2">
                  <Typography component="span" color="text.secondary">
                    {t('search.rarityLabel')}
                  </Typography>{' '}
                  {selectedCard.rarity}
                </Typography>
                <Typography variant="body2">
                  <Typography component="span" color="text.secondary">
                    {t('search.collectorNumber')}
                  </Typography>{' '}
                  {selectedCard.collectorNumber}
                </Typography>
                {selectedCard.priceEur && (
                  <Typography variant="body2">
                    <Typography component="span" color="text.secondary">
                      {t('search.priceEur')}
                    </Typography>{' '}
                    <Typography component="span" sx={{ color: 'success.main' }}>
                      €{selectedCard.priceEur.toFixed(2)}
                    </Typography>
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        )}
      </Modal>
    </Box>
  );
}
