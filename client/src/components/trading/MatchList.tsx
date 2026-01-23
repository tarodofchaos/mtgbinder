import {
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  Chip,
} from '@mui/material';
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

  return (
    <Paper>
      <Box sx={styles.header}>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="h6" sx={styles.totalValue}>
          Total: €{totalValue.toFixed(2)}
        </Typography>
      </Box>

      <List disablePadding>
        {matches.map((match, index) => (
          <ListItem
            key={`${match.card.id}-${index}`}
            divider={index < matches.length - 1}
            sx={styles.listItem}
          >
            <Box sx={styles.cardImageWrapper}>
              <CardImage
                scryfallId={match.card.scryfallId}
                name={match.card.name}
                size="small"
              />
            </Box>

            <Box sx={styles.cardInfo}>
              <Typography variant="subtitle2" noWrap>
                {match.card.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {match.card.setName} ({match.card.setCode})
              </Typography>
              <Box sx={styles.metaRow}>
                <Typography variant="caption" color="text.secondary">
                  {match.condition} {match.isFoil && '(Foil)'}
                </Typography>
                <Chip
                  label={priorityConfig[match.priority]?.label || match.priority}
                  color={priorityConfig[match.priority]?.color || 'default'}
                  size="small"
                />
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
