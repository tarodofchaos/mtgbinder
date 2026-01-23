import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  Stack,
  MenuItem,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close as CloseIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { CardCondition, Card } from '@mtg-binder/shared';
import { CardSearch } from '../cards/CardSearch';
import { CardImage } from '../cards/CardImage';
import { PrintingSelector } from '../cards/PrintingSelector';
import { addToCollection } from '../../services/collection-service';

interface AddCardFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface FormData {
  quantity: number;
  foilQuantity: number;
  condition: CardCondition;
  language: string;
  forTrade: number;
  tradePrice: number | null;
}

const conditions: Array<{ value: CardCondition; label: string }> = [
  { value: CardCondition.MINT, label: 'Mint' },
  { value: CardCondition.NEAR_MINT, label: 'Near Mint' },
  { value: CardCondition.LIGHTLY_PLAYED, label: 'Lightly Played' },
  { value: CardCondition.MODERATELY_PLAYED, label: 'Moderately Played' },
  { value: CardCondition.HEAVILY_PLAYED, label: 'Heavily Played' },
  { value: CardCondition.DAMAGED, label: 'Damaged' },
];

const languages = [
  { value: 'EN', label: 'English' },
  { value: 'ES', label: 'Spanish' },
  { value: 'DE', label: 'German' },
  { value: 'FR', label: 'French' },
  { value: 'IT', label: 'Italian' },
  { value: 'PT', label: 'Portuguese' },
  { value: 'JA', label: 'Japanese' },
  { value: 'KO', label: 'Korean' },
  { value: 'RU', label: 'Russian' },
  { value: 'ZH', label: 'Chinese' },
];

const styles: Record<string, SxProps<Theme>> = {
  card: {
    p: 3,
  },
  title: {
    mb: 3,
    fontWeight: 600,
  },
  selectedCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 2,
    p: 2,
    bgcolor: 'action.hover',
    borderRadius: 2,
    position: 'relative',
  },
  cardImageWrapper: {
    width: 80,
    flexShrink: 0,
  },
  clearButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1.5,
    mt: 2,
  },
};

export function AddCardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const [pendingCardName, setPendingCardName] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const queryClient = useQueryClient();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      quantity: 1,
      foilQuantity: 0,
      condition: CardCondition.NEAR_MINT,
      language: 'EN',
      forTrade: 0,
      tradePrice: null,
    },
  });

  const mutation = useMutation({
    mutationFn: addToCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collectionStats'] });
      setSelectedCard(null);
      reset();
      onSuccess?.();
    },
  });

  const handleCardNameSelected = (card: { name: string }) => {
    setPendingCardName(card.name);
  };

  const handlePrintingSelected = (card: Card) => {
    setSelectedCard(card);
    setPendingCardName(null);
  };

  const handleClearSelection = () => {
    setSelectedCard(null);
  };

  const onSubmit = (data: FormData) => {
    if (!selectedCard) return;

    mutation.mutate({
      cardId: selectedCard.id,
      quantity: data.quantity,
      foilQuantity: data.foilQuantity,
      condition: data.condition,
      language: data.language,
      forTrade: data.forTrade,
      tradePrice: data.tradePrice,
    });
  };

  return (
    <Paper sx={styles.card}>
      <Typography variant="h5" sx={styles.title}>
        Add Card to Collection
      </Typography>

      <Stack spacing={3}>
        {!selectedCard && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Search Card
            </Typography>
            <CardSearch
              onSelect={handleCardNameSelected}
              placeholder="Type card name..."
            />
          </Box>
        )}

        {selectedCard && (
          <>
            <Box sx={styles.selectedCard}>
              <Box sx={styles.cardImageWrapper}>
                <CardImage
                  scryfallId={selectedCard.scryfallId}
                  name={selectedCard.name}
                  size="small"
                />
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle1" fontWeight={500}>
                  {selectedCard.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedCard.setName} ({selectedCard.setCode})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  #{selectedCard.collectorNumber}
                </Typography>
                {selectedCard.priceEur && (
                  <Typography variant="body2" sx={{ color: 'success.main', mt: 0.5 }}>
                    €{selectedCard.priceEur.toFixed(2)}
                  </Typography>
                )}
              </Box>
              <IconButton
                size="small"
                onClick={handleClearSelection}
                sx={styles.clearButton}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box component="form" onSubmit={handleSubmit(onSubmit)}>
              <Stack spacing={3}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Controller
                      name="quantity"
                      control={control}
                      rules={{ required: true, min: 1 }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Quantity"
                          fullWidth
                          slotProps={{ htmlInput: { min: 1 } }}
                          error={!!errors.quantity}
                          helperText={errors.quantity ? 'Required' : ''}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={6}>
                    <Controller
                      name="foilQuantity"
                      control={control}
                      rules={{ min: 0 }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Foil Quantity"
                          fullWidth
                          slotProps={{ htmlInput: { min: 0 } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Controller
                      name="condition"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          label="Condition"
                          fullWidth
                        >
                          {conditions.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                              {c.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={6}>
                    <Controller
                      name="language"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          label="Language"
                          fullWidth
                        >
                          {languages.map((l) => (
                            <MenuItem key={l.value} value={l.value}>
                              {l.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Controller
                      name="forTrade"
                      control={control}
                      rules={{ min: 0 }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="For Trade"
                          fullWidth
                          slotProps={{ htmlInput: { min: 0 } }}
                          helperText="Copies available for trading"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={6}>
                    <Controller
                      name="tradePrice"
                      control={control}
                      rules={{ min: 0 }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseFloat(val));
                          }}
                          type="number"
                          label="Asking Price (€)"
                          fullWidth
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          helperText="Your price for trade"
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                {mutation.isError && (
                  <Alert severity="error">
                    Failed to add card. Please try again.
                  </Alert>
                )}

                <Box sx={styles.buttonGroup}>
                  {onCancel && (
                    <Button variant="outlined" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? 'Adding...' : 'Add to Collection'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          </>
        )}
      </Stack>

      <PrintingSelector
        cardName={pendingCardName}
        onSelect={handlePrintingSelected}
        onClose={() => setPendingCardName(null)}
      />
    </Paper>
  );
}
