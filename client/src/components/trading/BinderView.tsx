import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Paper,
  Dialog,
  DialogContent,
  Chip,
  Stack,
  Button,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Close as CloseIcon,
  OpenInNew as ExternalLinkIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CollectionItem, CardCondition, getCardmarketUrl } from '@mtg-binder/shared';
import { CardImage } from '../cards/CardImage';

interface BinderViewProps {
  items: CollectionItem[];
}

const CARDS_PER_PAGE = 9; // 3x3 grid
const CARDS_PER_SPREAD = CARDS_PER_PAGE * 2; // Left + right page

// MTG card aspect ratio: 63mm × 88mm ≈ 0.716 (width/height)
// For a 3×3 grid with gaps, we calculate the spread aspect ratio
// Each page is 3 cards wide, 3 cards tall
// Two pages side by side = 6 cards wide, 3 cards tall
// Spread ratio ≈ (6 × 0.716) / 3 = 1.43, but we add some padding
const SPREAD_ASPECT_RATIO = '1.5 / 1';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    perspective: '2000px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    py: 2,
  },
  binderWrapper: {
    position: 'relative',
    width: '100%',
    maxWidth: 1000,
    aspectRatio: SPREAD_ASPECT_RATIO,
    display: 'flex',
    justifyContent: 'center',
  },
  binder: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    transformStyle: 'preserve-3d',
  },
  spine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 8,
    transform: 'translateX(-50%)',
    background: 'linear-gradient(90deg, #1a1a2e 0%, #2d2d44 50%, #1a1a2e 100%)',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
    zIndex: 10,
    borderRadius: 2,
  },
  leftPage: {
    flex: 1,
    bgcolor: '#2a2a3e',
    borderRadius: '8px 0 0 8px',
    p: { xs: 0.5, sm: 1, md: 1.5 },
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: { xs: 0.5, sm: 0.75, md: 1 },
    boxShadow: 'inset 2px 0 8px rgba(0,0,0,0.3)',
    border: '2px solid #3d3d5c',
    borderRight: 'none',
  },
  rightPageContainer: {
    flex: 1,
    position: 'relative',
    transformStyle: 'preserve-3d',
  },
  rightPage: {
    position: 'absolute',
    inset: 0,
    bgcolor: '#2a2a3e',
    borderRadius: '0 8px 8px 0',
    p: { xs: 0.5, sm: 1, md: 1.5 },
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: { xs: 0.5, sm: 0.75, md: 1 },
    boxShadow: 'inset -2px 0 8px rgba(0,0,0,0.3)',
    border: '2px solid #3d3d5c',
    borderLeft: 'none',
    backfaceVisibility: 'hidden',
    transformOrigin: 'left center',
    transition: 'transform 0.6s ease-in-out',
  },
  cardSlot: {
    bgcolor: '#1f1f2e',
    borderRadius: 1,
    border: '1px solid #3d3d5c',
    overflow: 'hidden',
    position: 'relative',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      borderColor: 'primary.main',
      boxShadow: '0 0 12px rgba(59, 130, 246, 0.6)',
      transform: 'scale(1.02)',
      zIndex: 5,
    },
    '&:active': {
      transform: 'scale(0.98)',
    },
  },
  emptySlot: {
    bgcolor: '#1a1a28',
    borderRadius: 1,
    border: '1px dashed #3d3d5c',
  },
  quantityBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    bgcolor: 'rgba(0,0,0,0.85)',
    color: 'white',
    px: 0.5,
    py: 0.25,
    borderRadius: 0.5,
    fontSize: '0.65rem',
    fontWeight: 600,
    lineHeight: 1,
  },
  navigation: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    mt: 2,
  },
  navButton: {
    bgcolor: 'primary.main',
    color: 'white',
    '&:hover': {
      bgcolor: 'primary.dark',
    },
    '&:disabled': {
      bgcolor: 'action.disabledBackground',
    },
  },
  pageInfo: {
    minWidth: 120,
    textAlign: 'center',
  },
  // Modal styles
  modalContent: {
    p: 0,
    bgcolor: 'transparent',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: 400,
  },
  modalCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 2,
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  modalInfo: {
    mt: 2,
    p: 2,
    bgcolor: 'background.paper',
    borderRadius: 2,
    width: '100%',
    maxWidth: 350,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    bgcolor: 'rgba(0,0,0,0.6)',
    color: 'white',
    '&:hover': {
      bgcolor: 'rgba(0,0,0,0.8)',
    },
    zIndex: 10,
  },
};

export function BinderView({ items }: BinderViewProps) {
  const { t } = useTranslation();
  const [currentSpread, setCurrentSpread] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [selectedCard, setSelectedCard] = useState<CollectionItem | null>(null);

  const totalSpreads = Math.ceil(items.length / CARDS_PER_SPREAD);
  const maxSpread = Math.max(0, totalSpreads - 1);

  const startIndex = currentSpread * CARDS_PER_SPREAD;
  const leftPageCards = items.slice(startIndex, startIndex + CARDS_PER_PAGE);
  const rightPageCards = items.slice(startIndex + CARDS_PER_PAGE, startIndex + CARDS_PER_SPREAD);

  const nextStartIndex = (currentSpread + 1) * CARDS_PER_SPREAD;
  const nextRightCards = items.slice(nextStartIndex + CARDS_PER_PAGE, nextStartIndex + CARDS_PER_SPREAD);

  const prevStartIndex = (currentSpread - 1) * CARDS_PER_SPREAD;
  const prevLeftCards = items.slice(prevStartIndex, prevStartIndex + CARDS_PER_PAGE);

  const handleNext = () => {
    if (currentSpread < maxSpread && !isFlipping) {
      setFlipDirection('next');
      setIsFlipping(true);
    }
  };

  const handlePrev = () => {
    if (currentSpread > 0 && !isFlipping) {
      setFlipDirection('prev');
      setIsFlipping(true);
    }
  };

  useEffect(() => {
    if (isFlipping) {
      const timer = setTimeout(() => {
        if (flipDirection === 'next') {
          setCurrentSpread((s) => Math.min(maxSpread, s + 1));
        } else if (flipDirection === 'prev') {
          setCurrentSpread((s) => Math.max(0, s - 1));
        }
        setIsFlipping(false);
        setFlipDirection(null);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isFlipping, flipDirection, maxSpread]);

  const handleCardClick = (item: CollectionItem) => {
    setSelectedCard(item);
  };

  const handleCloseModal = () => {
    setSelectedCard(null);
  };

  const getConditionLabel = (condition: CardCondition): string => {
    const labels: Record<CardCondition, string> = {
      M: t('conditions.mint'),
      NM: t('conditions.nearMint'),
      LP: t('conditions.lightlyPlayed'),
      MP: t('conditions.moderatelyPlayed'),
      HP: t('conditions.heavilyPlayed'),
      DMG: t('conditions.damaged'),
    };
    return labels[condition] || condition;
  };

  const renderCardSlot = (item: CollectionItem | undefined, index: number) => {
    if (!item) {
      return <Box key={`empty-${index}`} sx={styles.emptySlot} />;
    }

    const card = item.card!;
    return (
      <Box
        key={`${item.id}-${index}`}
        sx={styles.cardSlot}
        onClick={() => handleCardClick(item)}
      >
        <CardImage
          scryfallId={card.scryfallId}
          name={card.name}
          size="normal"
          customImageUrl={item.photoUrl}
          setCode={card.setCode}
          collectorNumber={card.collectorNumber}
          language={item.language}
        />
        {item.forTrade > 1 && (
          <Box sx={styles.quantityBadge}>x{item.forTrade}</Box>
        )}
        {item.isAlter && (
          <Box
            sx={{
              ...styles.quantityBadge,
              bottom: 2,
              right: 2,
              left: 'auto',
              bgcolor: 'secondary.main',
            }}
          >
            A
          </Box>
        )}
      </Box>
    );
  };

  const renderPage = (cards: CollectionItem[]) => {
    const slots = [];
    for (let i = 0; i < CARDS_PER_PAGE; i++) {
      slots.push(renderCardSlot(cards[i], i));
    }
    return slots;
  };

  const getFlipTransform = () => {
    if (!isFlipping) return 'rotateY(0deg)';
    if (flipDirection === 'next') return 'rotateY(-180deg)';
    return 'rotateY(0deg)';
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.binderWrapper}>
        <Box sx={styles.binder}>
          {/* Left page */}
          <Paper sx={styles.leftPage} elevation={4}>
            {renderPage(
              flipDirection === 'prev' && isFlipping ? prevLeftCards : leftPageCards
            )}
          </Paper>

          {/* Spine */}
          <Box sx={styles.spine} />

          {/* Right page with flip animation */}
          <Box sx={styles.rightPageContainer}>
            <Paper
              sx={{
                ...styles.rightPage,
                transform: getFlipTransform(),
              }}
              elevation={4}
            >
              {renderPage(rightPageCards)}
            </Paper>

            {isFlipping && flipDirection === 'next' && (
              <Paper
                sx={{
                  ...styles.rightPage,
                  transform: 'rotateY(180deg)',
                  bgcolor: '#252538',
                }}
                elevation={4}
              >
                {renderPage(nextRightCards)}
              </Paper>
            )}
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={styles.navigation}>
        <IconButton
          onClick={handlePrev}
          disabled={currentSpread === 0 || isFlipping}
          sx={styles.navButton}
          size="large"
        >
          <PrevIcon />
        </IconButton>

        <Box sx={styles.pageInfo}>
          <Typography variant="body2" color="text.secondary">
            {t('publicBinder.pages', { start: currentSpread * 2 + 1, end: currentSpread * 2 + 2 })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('publicBinder.ofTotal', { total: totalSpreads * 2 })}
          </Typography>
        </Box>

        <IconButton
          onClick={handleNext}
          disabled={currentSpread >= maxSpread || isFlipping}
          sx={styles.navButton}
          size="large"
        >
          <NextIcon />
        </IconButton>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        {t('publicBinder.binderHelp', { count: items.length })}
      </Typography>

      {/* Card Detail Modal */}
      <Dialog
        open={!!selectedCard}
        onClose={handleCloseModal}
        maxWidth="sm"
        PaperProps={{
          sx: {
            bgcolor: 'transparent',
            boxShadow: 'none',
            overflow: 'visible',
          },
        }}
      >
                <DialogContent sx={styles.modalContent}>
                  {selectedCard && (
                    <>
                      <Box sx={styles.modalCard}>
                        <CardImage
                          scryfallId={selectedCard.card!.scryfallId}
                          name={selectedCard.card!.name}
                          size="large"
                          customImageUrl={selectedCard.photoUrl}
                          setCode={selectedCard.card!.setCode}
                          collectorNumber={selectedCard.card!.collectorNumber}
                          language={selectedCard.language}
                        />
                      </Box>
                      <Paper sx={styles.modalInfo}>
                        <Typography variant="h6" gutterBottom>
                          {selectedCard.card!.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {selectedCard.card!.setName} ({selectedCard.card!.setCode})
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                          <Chip
                            label={getConditionLabel(selectedCard.condition as CardCondition)}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            label={t('collection.copiesForTrade', { count: selectedCard.forTrade })}
                            size="small"
                            color="success"
                          />
                          {selectedCard.isAlter && (
                            <Chip label={t('common.alter')} size="small" color="secondary" />
                          )}
                          {selectedCard.foilQuantity > 0 && (
                            <Chip label={t('common.foil')} size="small" color="warning" />
                          )}
                          {selectedCard.tradePrice !== null && (
                            <Chip
                              label={t('trade.eachPrice', { price: selectedCard.tradePrice.toFixed(2) })}
                              size="small"
                              color="primary"
                            />
                          )}
                          {selectedCard.tradePrice === null && selectedCard.card!.priceEur && (
                            <Chip
                              label={`~€${selectedCard.card!.priceEur.toFixed(2)}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          startIcon={<ExternalLinkIcon />}
                          href={getCardmarketUrl(selectedCard.card!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ mt: 2 }}
                        >
                          {t('publicBinder.viewOnCardmarket')}
                        </Button>
                      </Paper>
                    </>
                  )}
                </DialogContent>
                <IconButton
                  onClick={handleCloseModal}
                  sx={styles.closeButton}
                  size="small"
                >
                  <CloseIcon />
                </IconButton>
              </Dialog>    </Box>
  );
}
