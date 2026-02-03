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
import { WishlistItem, WishlistPriority } from '@mtg-binder/shared';
import { CardImage } from '../cards/CardImage';

interface WishlistCardProps {
  item: WishlistItem;
  onEdit?: (item: WishlistItem) => void;
  onRemove?: (item: WishlistItem) => void;
}

type ChipColor = 'error' | 'warning' | 'primary' | 'default';

const PRIORITY_CONFIG: Record<WishlistPriority, { color: ChipColor; labelKey: string }> = {
  URGENT: { color: 'error', labelKey: 'priorities.urgent' },
  HIGH: { color: 'warning', labelKey: 'priorities.high' },
  NORMAL: { color: 'primary', labelKey: 'priorities.normal' },
  LOW: { color: 'default', labelKey: 'priorities.low' },
};

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
  priorityBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  foilBadge: {
    position: 'absolute',
    bottom: 8,
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

export function WishlistCard({ item, onEdit, onRemove }: WishlistCardProps) {
  const { t } = useTranslation();
  const card = item.card!;
  const price = card.priceEur;
  const priorityStyle = PRIORITY_CONFIG[item.priority as WishlistPriority];

  return (
    <Card sx={styles.card}>
      <Box sx={styles.imageContainer}>
        <CardImage scryfallId={card.scryfallId} name={card.name} size="normal" />

        <Chip
          label={t(priorityStyle.labelKey)}
          color={priorityStyle.color}
          size="small"
          sx={styles.priorityBadge}
        />

        {item.quantity > 1 && (
          <Box sx={styles.quantityBadge}>x{item.quantity}</Box>
        )}

        {item.foilOnly && (
          <Chip
            label={t('wishlist.foilOnly')}
            color="warning"
            size="small"
            sx={styles.foilBadge}
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
          {item.maxPrice && (
            <Typography variant="caption" color="text.secondary">
              {t('wishlist.maxPriceLabel', { price: `€${item.maxPrice.toFixed(2)}` })}
            </Typography>
          )}
          {price !== null && (
            <Typography variant="body2" sx={styles.price}>
              €{price.toFixed(2)}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
