import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  Chip,
} from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { TradeMatch } from '@mtg-binder/shared';
import { CardImage } from '../cards/CardImage';

interface MatchListProps {
  matches: TradeMatch[];
  totalValue: number;
  title: string;
  emptyMessage?: string;
}

type ChipColor = 'error' | 'warning' | 'primary' | 'default';

const priorityConfig: Record<string, { color: ChipColor; label: string }> = {
  URGENT: { color: 'error', label: 'Urgent' },
  HIGH: { color: 'warning', label: 'High' },
  NORMAL: { color: 'primary', label: 'Normal' },
  LOW: { color: 'default', label: 'Low' },
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
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  listItemMatch: {
    display: 'flex',
    alignItems: 'center',
    p: 2,
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
  },
  price: {
    color: 'success.main',
  },
};

export function MatchList({
  matches,
  totalValue,
  title,
  emptyMessage = 'No matches found',
}: MatchListProps) {
  if (matches.length === 0) {
    return (
      <Paper sx={styles.emptyCard}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography color="text.secondary">{emptyMessage}</Typography>
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
            {matchCount} match{matchCount !== 1 ? 'es' : ''} · {matches.length} total cards
          </Typography>
        </Box>
        <Typography variant="h6" sx={styles.totalValue}>
          Total: €{totalValue.toFixed(2)}
        </Typography>
      </Box>

      <List disablePadding>
        {matches.map((match, index) => (
          <ListItem
            key={`${match.card.id}-${index}`}
            divider={index < matches.length - 1}
            sx={match.isMatch ? styles.listItemMatch : styles.listItem}
          >
            <Box sx={styles.cardImageWrapper}>
              <CardImage
                scryfallId={match.card.scryfallId}
                name={match.card.name}
                size="small"
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
                    Match
                  </Box>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {match.card.setName} ({match.card.setCode})
              </Typography>
              <Box sx={styles.metaRow}>
                <Typography variant="caption" color="text.secondary">
                  {match.condition} {match.isFoil && '(Foil)'}
                </Typography>
                {match.priority && (
                  <Chip
                    label={priorityConfig[match.priority]?.label || match.priority}
                    color={priorityConfig[match.priority]?.color || 'default'}
                    size="small"
                  />
                )}
              </Box>
            </Box>

            <Box sx={styles.priceColumn}>
              <Typography variant="body2" fontWeight={500}>
                x{match.availableQuantity}
              </Typography>
              {match.priceEur && (
                <Typography variant="body2" sx={styles.price}>
                  €{(match.priceEur * match.availableQuantity).toFixed(2)}
                </Typography>
              )}
            </Box>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
