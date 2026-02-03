import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Card } from '@mtg-binder/shared';
import { getCardPrintings } from '../../services/card-service';
import { CardImage } from './CardImage';

interface PrintingSelectorProps {
  cardName: string | null;
  onSelect: (card: Card) => void;
  onClose: () => void;
}

const styles: Record<string, SxProps<Theme>> = {
  content: {
    p: 0,
    minWidth: { xs: 320, sm: 450 },
    maxHeight: 500,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    py: 4,
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    py: 2,
    px: 2,
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  cardImageWrapper: {
    width: 100,
    flexShrink: 0,
  },
  cardInfo: {
    flexGrow: 1,
    minWidth: 0,
  },
  price: {
    color: 'success.main',
    fontWeight: 500,
  },
};

export function PrintingSelector({ cardName, onSelect, onClose }: PrintingSelectorProps) {
  const { t } = useTranslation();
  const { data: printings, isLoading, error } = useQuery({
    queryKey: ['cardPrintings', cardName],
    queryFn: () => getCardPrintings(cardName!),
    enabled: !!cardName,
  });

  const handleSelect = (card: Card) => {
    onSelect(card);
    onClose();
  };

  return (
    <Dialog open={!!cardName} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t('printing.selectPrinting')}
        {cardName && (
          <Typography variant="body2" color="text.secondary">
            {cardName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={styles.content} dividers>
        {isLoading ? (
          <Box sx={styles.loadingContainer}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {t('printing.loadingError')}
          </Alert>
        ) : printings && printings.length > 0 ? (
          <List disablePadding>
            {printings.map((card) => (
              <ListItemButton
                key={card.id}
                onClick={() => handleSelect(card)}
                sx={styles.listItem}
                divider
              >
                <Box sx={styles.cardImageWrapper}>
                  <CardImage
                    scryfallId={card.scryfallId}
                    name={card.name}
                    size="small"
                  />
                </Box>
                <Box sx={styles.cardInfo}>
                  <Typography variant="subtitle2" noWrap>
                    {card.setName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {card.setCode} · #{card.collectorNumber}
                  </Typography>
                  {card.priceEur && (
                    <Typography variant="body2" sx={styles.price}>
                      €{card.priceEur.toFixed(2)}
                    </Typography>
                  )}
                </Box>
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            {t('printing.noPrintings')}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
