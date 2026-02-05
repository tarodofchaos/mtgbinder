import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  Chip,
  Checkbox,
  TextField,
  MenuItem,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { TradeMatch } from '@mtg-binder/shared';
import { useTranslation } from 'react-i18next';
import { CardImage } from '../cards/CardImage';

interface MatchListProps {
  matches: TradeMatch[];
  totalValue: number;
  title: string;
  emptyMessage?: string;
  onToggleSelect?: (cardId: string, quantity: number) => void;
  selectedJson?: Record<string, number>;
  isSelectable?: boolean;
}

type ChipColor = 'error' | 'warning' | 'primary' | 'default';

const priorityConfig: Record<string, { color: ChipColor; key: string }> = {
  URGENT: { color: 'error', key: 'wishlist.priority.urgent' },
  HIGH: { color: 'warning', key: 'wishlist.priority.high' },
  NORMAL: { color: 'primary', key: 'wishlist.priority.normal' },
  LOW: { color: 'default', key: 'wishlist.priority.low' },
};

const styles: Record<string, SxProps<Theme>> = {
  emptyCard: {
    p: 3,
    textAlign: 'center',
  },
  header: {
    p: 2,
    bgcolor: 'action.hover',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalValue: {
    fontWeight: 700,
    color: 'success.main',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    p: 2,
    cursor: 'pointer',
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  listItemMatch: {
    display: 'flex',
    alignItems: 'center',
    p: 2,
    cursor: 'pointer',
    bgcolor: '#e8f5e9', // Light green background (green-50)
    borderLeft: '4px solid',
    borderLeftColor: 'success.main',
    '&:hover': {
      bgcolor: '#c8e6c9', // Slightly darker on hover (green-100)
    },
    // Force dark text colors regardless of theme (dark mode has white text)
    '& .MuiTypography-root': {
      color: '#1f2937', // gray-800 - dark text
    },
    '& .MuiTypography-colorTextSecondary, & .MuiTypography-root.MuiTypography-colorTextSecondary': {
      color: '#4b5563', // gray-600 - dark secondary text
    },
  },
  listItemSelected: {
    bgcolor: 'action.selected !important',
    '&::after': {
      content: '""',
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 4,
      bgcolor: 'primary.main',
    },
  },
  matchBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    color: '#166534', // Dark green for good contrast (green-800)
    fontWeight: 600,
    fontSize: '0.75rem',
    bgcolor: '#bbf7d0', // Light green chip background (green-200)
    px: 0.75,
    py: 0.25,
    borderRadius: 1,
  },
  cardImageWrapper: {
    width: 64,
    flexShrink: 0,
  },
  cardInfo: {
    ml: 2,
    flexGrow: 1,
    minWidth: 0,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    mt: 0.5,
  },
  priceColumn: {
    textAlign: 'right',
    flexShrink: 0,
    ml: 2,
    minWidth: 100,
  },
  price: {
    color: 'success.main',
  },
  quantitySelector: {
    width: 70,
    mr: 2,
  },
};

export function MatchList({
  matches,
  totalValue,
  title,
  emptyMessage,
  onToggleSelect,
  selectedJson = {},
  isSelectable = false,
}: MatchListProps) {
  const { t } = useTranslation();

  if (matches.length === 0) {
    return (
      <Paper sx={styles.emptyCard}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary">
          {emptyMessage || t('matchList.noMatches')}
        </Typography>
      </Paper>
    );
  }

  const matchCount = matches.filter((m) => m.isMatch).length;

  return (
    <Paper>
      <Box sx={styles.header}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('matchList.summary', {
              matchCount,
              totalCards: matches.length,
            })}
          </Typography>
        </Box>
        <Typography variant="h6" sx={styles.totalValue}>
          {t('matchList.totalValue', { value: totalValue.toFixed(2) })}
        </Typography>
      </Box>

      <List disablePadding>
        {matches.map((match, index) => {
          const selectedQuantity = selectedJson[match.card.id] || 0;
          const isSelected = selectedQuantity > 0;
          const itemStyle: SxProps<Theme> = [
            match.isMatch ? styles.listItemMatch : styles.listItem,
            isSelected && styles.listItemSelected,
          ].filter(Boolean) as SxProps<Theme>;

          const unitPrice = match.tradePrice ?? match.card.priceEur ?? 0;

          return (
            <ListItem
              key={`${match.card.id}-${index}`}
              divider={index < matches.length - 1}
              sx={itemStyle}
              onClick={() => isSelectable && onToggleSelect?.(match.card.id, isSelected ? 0 : 1)}
            >
              {isSelectable && (
                <Checkbox
                  checked={isSelected}
                  sx={{ ml: -1, mr: 1 }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect?.(match.card.id, isSelected ? 0 : 1)}
                />
              )}
              
              <Box sx={styles.cardImageWrapper}>
                <CardImage
                  scryfallId={match.card.scryfallId}
                  name={match.card.name}
                  size="small"
                  customImageUrl={match.photoUrl}
                />
              </Box>

              <Box sx={styles.cardInfo}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" noWrap>
                    {match.card.name}
                  </Typography>
                  {match.isMatch && (
                    <Box sx={styles.matchBadge}>
                      <StarIcon sx={{ fontSize: 14 }} />
                      {t('matchList.match')}
                    </Box>
                  )}
                  {match.isAlter && (
                    <Chip label="Alter" size="small" color="secondary" sx={{ height: 20, fontSize: '0.65rem' }} />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {match.card.setName} ({match.card.setCode})
                </Typography>
                <Box sx={styles.metaRow}>
                  <Typography variant="caption" color="text.secondary">
                    {match.condition} {match.isFoil && t('matchList.foil')}
                  </Typography>
                  {match.priority && (
                    <Chip
                      label={
                        priorityConfig[match.priority]?.key
                          ? t(priorityConfig[match.priority].key)
                          : match.priority
                      }
                      color={priorityConfig[match.priority]?.color || 'default'}
                      size="small"
                    />
                  )}
                </Box>
              </Box>

              {isSelectable && match.availableQuantity > 1 && (
                <TextField
                  select
                  size="small"
                  label="Qty"
                  value={selectedQuantity || 1}
                  sx={styles.quantitySelector}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggleSelect?.(match.card.id, parseInt(e.target.value))}
                >
                  {[...Array(match.availableQuantity)].map((_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {i + 1}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <Box sx={styles.priceColumn}>
                <Typography variant="body2" fontWeight={500}>
                  x{isSelectable && isSelected ? selectedQuantity : match.availableQuantity}
                </Typography>
                {unitPrice > 0 && (
                  <>
                    <Typography variant="caption" color="text.secondary" display="block">
                      €{unitPrice.toFixed(2)} each
                    </Typography>
                    <Typography variant="body2" sx={styles.price} fontWeight={600}>
                      €{(unitPrice * (isSelectable && isSelected ? selectedQuantity : match.availableQuantity)).toFixed(2)}
                    </Typography>
                  </>
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Paper>
  );
}