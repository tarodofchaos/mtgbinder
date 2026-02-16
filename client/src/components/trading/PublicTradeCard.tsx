import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Paper,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  OpenInNew as ExternalLinkIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CollectionItem, CardCondition, getCardmarketUrl } from '@mtg-binder/shared';
import { CardImage } from '../cards/CardImage';

interface PublicTradeCardProps {
  item: CollectionItem;
}

const styles: Record<string, SxProps<Theme>> = {
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 6,
    },
  },
  imageContainer: {
    position: 'relative',
  },
  quantityBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    bgcolor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    px: 1,
    py: 0.5,
    borderRadius: 1,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  foilText: {
    ml: 0.5,
    color: 'warning.main',
  },
  priceBadge: {
    position: 'absolute',
    top: 25,
    left: 8,
  },
  alterBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    bgcolor: 'secondary.main',
    color: 'white',
  },
  content: {
    flexGrow: 1,
    pb: 1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mt: 1,
  },
  price: {
    color: 'success.main',
    fontWeight: 500,
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
  },
};

export function PublicTradeCard({ item }: PublicTradeCardProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const card = item.card!;

  // Use custom trade price if set, otherwise use market price
  const unitPrice = item.tradePrice ?? card.priceEur;
  const totalValue = unitPrice ? unitPrice * item.forTrade : null;

  // Check if item has foil copies available for trade
  const hasFoil = item.foilQuantity > 0;

  const handleCardClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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

  return (
    <>
      <Card sx={styles.card} onClick={handleCardClick}>
        <Box sx={styles.imageContainer}>
          <CardImage
            scryfallId={card.scryfallId}
            name={card.name}
            size="normal"
            customImageUrl={item.photoUrl}
            setCode={card.setCode}
            collectorNumber={card.collectorNumber}
            language={item.language}
          />

          <Box sx={styles.quantityBadge}>
            x{item.forTrade}
            {hasFoil && (
              <Box component="span" sx={styles.foilText}>
                ({t('common.foil').toLowerCase()})
              </Box>
            )}
          </Box>

          {item.tradePrice !== null && (
            <Chip
              label={t('trade.eachPrice', { price: item.tradePrice.toFixed(2) })}
              color="success"
              size="small"
              sx={styles.priceBadge}
            />
          )}

          {item.isAlter && (
            <Chip
              label={t('collection.isAlter')}
              size="small"
              sx={styles.alterBadge}
            />
          )}
        </Box>

        <CardContent sx={styles.content}>
          <Typography variant="subtitle2" noWrap title={card.name}>
            {card.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {card.setName}
          </Typography>
          <Box sx={styles.footer}>
            <Typography variant="caption" color="text.secondary">
              {getConditionLabel(item.condition as CardCondition)}
            </Typography>
            {totalValue !== null && (
              <Typography variant="body2" sx={styles.price}>
                €{totalValue.toFixed(2)}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Card Detail Modal */}
      <Dialog
        open={isModalOpen}
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
        <IconButton
          onClick={handleCloseModal}
          sx={styles.closeButton}
          size="small"
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={styles.modalContent}>
          <Box sx={styles.modalCard}>
            <CardImage
              scryfallId={card.scryfallId}
              name={card.name}
              size="large"
              customImageUrl={item.photoUrl}
              setCode={card.setCode}
              collectorNumber={card.collectorNumber}
              language={item.language}
            />
          </Box>
          <Paper sx={styles.modalInfo}>
            <Typography variant="h6" gutterBottom>
              {card.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {card.setName} ({card.setCode})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip
                label={getConditionLabel(item.condition as CardCondition)}
                size="small"
                variant="outlined"
              />
              <Chip
                label={t('collection.copiesForTrade', { count: item.forTrade })}
                size="small"
                color="success"
              />
              {item.isAlter && (
                <Chip label={t('common.alter')} size="small" color="secondary" />
              )}
              {hasFoil && (
                <Chip label={t('common.foil')} size="small" color="warning" />
              )}
              {item.tradePrice !== null && (
                <Chip
                  label={t('trade.eachPrice', { price: item.tradePrice.toFixed(2) })}
                  size="small"
                  color="primary"
                />
              )}
              {item.tradePrice === null && card.priceEur && (
                <Chip
                  label={`~€${card.priceEur.toFixed(2)}`}
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
              href={getCardmarketUrl(card)}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {t('publicBinder.viewOnCardmarket')}
            </Button>
          </Paper>
        </DialogContent>
      </Dialog>
    </>
  );
}
