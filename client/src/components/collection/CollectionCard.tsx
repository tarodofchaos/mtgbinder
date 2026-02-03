import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CollectionItem, CardCondition } from '@mtg-binder/shared';
import { CardImage } from '../cards/CardImage';

interface CollectionCardProps {
  item: CollectionItem;
  onEdit?: (item: CollectionItem) => void;
  onRemove?: (item: CollectionItem) => void;
}


const styles: Record<string, SxProps<Theme>> = {
  card: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: 6,
    },
    '&:hover .card-actions': {
      opacity: 1,
    },
  },
  imageContainer: {
    position: 'relative',
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
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
  tradeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  actionsOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    bgcolor: 'rgba(0, 0, 0, 0.6)',
    opacity: 0,
    transition: 'opacity 0.2s',
  },
  actionButton: {
    bgcolor: 'primary.main',
    color: 'white',
    '&:hover': {
      bgcolor: 'primary.dark',
    },
  },
  deleteButton: {
    bgcolor: 'error.main',
    color: 'white',
    '&:hover': {
      bgcolor: 'error.dark',
    },
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
};

export function CollectionCard({ item, onEdit, onRemove }: CollectionCardProps) {
  const { t } = useTranslation();
  const card = item.card!;
  const price = card.priceEur;
  const totalValue = price ? price * item.quantity : null;

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
    <Card sx={styles.card}>
      <Box sx={styles.imageContainer}>
        <CardImage scryfallId={card.scryfallId} name={card.name} size="normal" />

        <Box sx={styles.quantityBadge}>
          x{item.quantity}
          {item.foilQuantity > 0 && (
            <Box component="span" sx={styles.foilText}>
              ({t('collection.foilCount', { count: item.foilQuantity })})
            </Box>
          )}
        </Box>

        {item.forTrade > 0 && (
          <Chip
            label={
              item.tradePrice !== null
                ? `${item.forTrade} @ €${item.tradePrice.toFixed(2)}`
                : t('collection.copiesForTrade', { count: item.forTrade })
            }
            color="success"
            size="small"
            sx={styles.tradeBadge}
          />
        )}

        {(onEdit || onRemove) && (
          <Box className="card-actions" sx={styles.actionsOverlay}>
            {onEdit && (
              <IconButton
                onClick={() => onEdit(item)}
                sx={styles.actionButton}
                size="small"
              >
                <EditIcon />
              </IconButton>
            )}
            {onRemove && (
              <IconButton
                onClick={() => onRemove(item)}
                sx={styles.deleteButton}
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
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
  );
}
