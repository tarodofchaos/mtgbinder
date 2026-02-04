import { Box, Typography, IconButton, Avatar, Link as MuiLink, Button } from '@mui/material';
import {
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenInNewIcon,
  SwapHoriz as SwapIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { type Notification, NotificationType, getCardmarketUrl, getScryfallImageUrl } from '@mtg-binder/shared';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createTradeSession, sendMessage } from '../../services/trade-service';

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
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id, card, type, data, read, createdAt } = notification;

  if (!card) return null;

  const imageUrl = getScryfallImageUrl(card.scryfallId, 'small');
  const cardmarketUrl = getCardmarketUrl(card);
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  const handleWantIt = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const offererId = data?.offererUserId;
      if (!offererId) return;

      const session = await createTradeSession({ withUserId: offererId });
      await sendMessage(session.sessionCode, `I'm interested in your ${card.name}!`);
      
      onMarkAsRead(id);
      navigate(`/trade/session/${session.sessionCode}`);
    } catch (error) {
      console.error('Failed to start trade', error);
    }
  };

  const renderContent = () => {
    // Fallback to string comparison if NotificationType is undefined due to build issues
    const isPriceAlert = (type as string) === 'PRICE_ALERT' || (NotificationType && type === NotificationType.PRICE_ALERT);
    const isTradeMatch = (type as string) === 'TRADE_MATCH' || (NotificationType && type === NotificationType.TRADE_MATCH);

    if (isPriceAlert) {
      const oldPrice = data?.oldPrice || 0;
      const newPrice = data?.newPrice || 0;
      const priceDrop = oldPrice - newPrice;
      const percentDrop = oldPrice > 0 ? ((priceDrop / oldPrice) * 100).toFixed(0) : '0';

      return (
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
      );
    }

    if (isTradeMatch) {
      const offererName = data?.offererName || 'someone';
      return (
        <Box sx={{ mt: 0.5, mb: 1 }}>
           <Typography variant="body2" color="text.secondary">
             {t('notifications.tradeMatchMessage', { name: offererName, cardName: card.name })}
           </Typography>
           <Button 
             variant="contained" 
             size="small" 
             startIcon={<SwapIcon />}
             onClick={handleWantIt}
             sx={{ mt: 1 }}
           >
             {t('notifications.iWantIt')}
           </Button>
        </Box>
      );
    }

    return null;
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

        {renderContent()}

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