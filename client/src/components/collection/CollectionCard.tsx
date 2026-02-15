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
    position: 'relative',
    overflow: 'visible', // Allow badges to pop
    bgcolor: 'background.paper',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    '&:hover': {
      transform: 'translateY(-8px) scale(1.02)',
      boxShadow: (theme) => theme.palette.mode === 'dark' 
        ? '0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(124, 58, 237, 0.2)'
        : '0 20px 40px rgba(0,0,0,0.1)',
      '& .card-actions': {
        opacity: 1,
        transform: 'translateY(0)',
      },
      '& .card-image-wrapper': {
        transform: 'scale(1.05)',
      }
    },
  },
  imageContainer: {
    position: 'relative',
    borderRadius: '12px 12px 0 0',
    overflow: 'hidden',
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.8) 100%)',
      opacity: 0.6,
      pointerEvents: 'none',
    },
  },
  quantityBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    bgcolor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(4px)',
    color: 'white',
    px: 1.5,
    py: 0.5,
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 700,
    zIndex: 2,
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  foilText: {
    ml: 0.5,
    color: '#fbbf24', // Gold
    textShadow: '0 0 8px rgba(251, 191, 36, 0.5)',
  },
  tradeBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  actionsOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1.5,
    bgcolor: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    opacity: 0,
    transform: 'translateY(10px)',
    transition: 'all 0.3s ease-out',
    zIndex: 3,
  },
  actionButton: {
    bgcolor: 'primary.main',
    color: 'white',
    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
    '&:hover': {
      bgcolor: 'primary.dark',
      transform: 'scale(1.1)',
    },
  },
  deleteButton: {
    bgcolor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
    '&:hover': {
      bgcolor: 'error.dark',
      transform: 'scale(1.1)',
    },
  },
  content: {
    flexGrow: 1,
    p: '16px !important',
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5,
  },
  cardName: {
    fontWeight: 700,
    fontSize: '0.95rem',
    letterSpacing: '0.01em',
    color: 'text.primary',
  },
  setName: {
    fontSize: '0.75rem',
    opacity: 0.8,
    fontWeight: 500,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mt: 'auto',
    pt: 1,
  },
  price: {
    color: 'success.main',
    fontWeight: 800,
    fontSize: '1rem',
  },
  conditionBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    px: 1,
    py: 0.25,
    borderRadius: '4px',
    bgcolor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    textTransform: 'uppercase',
  },
  alterBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    zIndex: 2,
    bgcolor: 'secondary.main',
    color: 'white',
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
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

        {item.isAlter && (
          <Chip
            label={t('collection.isAlter')}
            size="small"
            sx={styles.alterBadge}
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
        <Typography sx={styles.cardName} noWrap title={card.name}>
          {card.name}
        </Typography>
        <Typography sx={styles.setName} color="text.secondary" noWrap>
          {card.setName}
        </Typography>
        <Box sx={styles.footer}>
          <Box sx={styles.conditionBadge}>
            {getConditionLabel(item.condition as CardCondition)}
          </Box>
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
