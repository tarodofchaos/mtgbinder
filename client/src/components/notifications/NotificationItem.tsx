import { Box, Typography, IconButton, Avatar, Link as MuiLink } from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import type { PriceAlert } from '@mtg-binder/shared';
import { getCardmarketUrl, getScryfallImageUrl } from '@mtg-binder/shared';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    gap: 1.5,
    p: 2,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  unread: {
    bgcolor: 'action.selected',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 1,
    border: 1,
    borderColor: 'divider',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 1,
    mb: 0.5,
  },
  cardName: {
    fontWeight: 600,
    color: 'text.primary',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  priceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    mb: 0.5,
  },
  priceIcon: {
    fontSize: 20,
    color: 'success.main',
  },
  oldPrice: {
    textDecoration: 'line-through',
    color: 'text.disabled',
    fontSize: '0.875rem',
  },
  newPrice: {
    color: 'success.main',
    fontWeight: 600,
  },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    mt: 1,
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    fontSize: '0.875rem',
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  linkIcon: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: '0.75rem',
    color: 'text.disabled',
    mt: 0.5,
  },
  actions: {
    display: 'flex',
    gap: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    bgcolor: 'primary.main',
    mr: 1,
    flexShrink: 0,
  },
};

interface NotificationItemProps {
  notification: PriceAlert;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const { t } = useTranslation();
  const { id, card, oldPrice, newPrice, read, createdAt } = notification;

  if (!card) return null;

  const imageUrl = getScryfallImageUrl(card.scryfallId, 'small');
  const cardmarketUrl = getCardmarketUrl(card);
  const priceDrop = oldPrice - newPrice;
  const percentDrop = ((priceDrop / oldPrice) * 100).toFixed(0);
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <Box sx={{
      ...styles.container as any,
      ...(read ? {} : styles.unread as any),
    }}>
      {!read && <Box sx={styles.unreadDot} />}

      {imageUrl && (
        <Avatar
          src={imageUrl}
          alt={card.name}
          variant="square"
          sx={styles.avatar}
        />
      )}

      <Box sx={styles.content}>
        <Box sx={styles.header}>
          <Typography sx={styles.cardName} title={card.name}>
            {card.name}
          </Typography>
        </Box>

        <Box sx={styles.priceRow}>
          <TrendingDownIcon sx={styles.priceIcon} />
          <Typography variant="body2" sx={styles.oldPrice}>
            €{oldPrice.toFixed(2)}
          </Typography>
          <Typography variant="body2">→</Typography>
          <Typography variant="body2" sx={styles.newPrice}>
            €{newPrice.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
            (-{percentDrop}%)
          </Typography>
        </Box>

        <Box sx={styles.linkRow}>
          <MuiLink
            href={cardmarketUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={styles.link}
            onClick={(e) => e.stopPropagation()}
          >
            {t('notifications.viewOnCardmarket')}
            <OpenInNewIcon sx={styles.linkIcon} />
          </MuiLink>
        </Box>

        <Typography sx={styles.timestamp}>
          {timeAgo}
        </Typography>
      </Box>

      <Box sx={styles.actions}>
        {!read && (
          <IconButton
            size="small"
            onClick={handleMarkAsRead}
            aria-label={t('notifications.markAsRead')}
            title={t('notifications.markAsRead')}
          >
            <CheckCircleIcon fontSize="small" />
          </IconButton>
        )}
        <IconButton
          size="small"
          onClick={handleDelete}
          aria-label={t('notifications.delete')}
          title={t('notifications.delete')}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
