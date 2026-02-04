import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
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

const CONDITIONS: Array<{ value: CardCondition; labelKey: string }> = [
  { value: CardCondition.MINT, labelKey: 'conditions.mint' },
  { value: CardCondition.NEAR_MINT, labelKey: 'conditions.nearMint' },
  { value: CardCondition.LIGHTLY_PLAYED, labelKey: 'conditions.lightlyPlayed' },
  { value: CardCondition.MODERATELY_PLAYED, labelKey: 'conditions.moderatelyPlayed' },
  { value: CardCondition.HEAVILY_PLAYED, labelKey: 'conditions.heavilyPlayed' },
  { value: CardCondition.DAMAGED, labelKey: 'conditions.damaged' },
];

const LANGUAGES = [
  { value: 'EN', labelKey: 'languages.en' },
  { value: 'ES', labelKey: 'languages.es' },
  { value: 'DE', labelKey: 'languages.de' },
  { value: 'FR', labelKey: 'languages.fr' },
  { value: 'IT', labelKey: 'languages.it' },
  { value: 'PT', labelKey: 'languages.pt' },
  { value: 'JA', labelKey: 'languages.ja' },
  { value: 'KO', labelKey: 'languages.ko' },
  { value: 'RU', labelKey: 'languages.ru' },
  { value: 'ZH', labelKey: 'languages.zh' },
];

const styles: Record<string, SxProps<Theme>> = {
  container: {
    minHeight: 300,
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
  const { t } = useTranslation();
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
    <Box sx={styles.container}>
      <Stack spacing={3}>
        {!selectedCard && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('collection.searchCard')}
            </Typography>
            <CardSearch
              onSelect={handleCardNameSelected}
              placeholder={t('collection.typeCardName')}
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
                          label={t('collection.quantity')}
                          fullWidth
                          slotProps={{ htmlInput: { min: 1 } }}
                          error={!!errors.quantity}
                          helperText={errors.quantity ? t('common.required') : ''}
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
                          label={t('collection.foilQuantity')}
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
                          label={t('collection.condition')}
                          fullWidth
                        >
                          {CONDITIONS.map((c) => (
                            <MenuItem key={c.value} value={c.value}>
                              {t(c.labelKey)}
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
                          label={t('collection.language')}
                          fullWidth
                        >
                          {LANGUAGES.map((l) => (
                            <MenuItem key={l.value} value={l.value}>
                              {t(l.labelKey)}
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
                          label={t('collection.forTrade')}
                          fullWidth
                          slotProps={{ htmlInput: { min: 0 } }}
                          helperText={t('collection.forTradeHelp')}
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
                          label={`${t('collection.askingPrice')} (€)`}
                          fullWidth
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                          helperText={t('collection.askingPriceHelp')}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                {mutation.isError && (
                  <Alert severity="error">
                    {t('collection.failedToAdd')}
                  </Alert>
                )}

                <Box sx={styles.buttonGroup}>
                  {onCancel && (
                    <Button variant="outlined" onClick={onCancel}>
                      {t('common.cancel')}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending ? t('collection.addingToCollection') : t('collection.addToCollection')}
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
    </Box>
  );
}
