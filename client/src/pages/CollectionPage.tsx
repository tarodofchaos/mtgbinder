import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Alert,
  Pagination,
  Stack,
  MenuItem,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add as AddIcon, Close as CloseIcon, Upload as UploadIcon, FilterAltOff as FilterAltOffIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { CollectionItem, CardCondition, Card } from '@mtg-binder/shared';
import { getCollection, getCollectionStats, removeFromCollection, updateCollectionItem } from '../services/collection-service';
import { CardGrid, CardGridItem } from '../components/cards/CardGrid';
import { CollectionCard } from '../components/collection/CollectionCard';
import { AddCardForm } from '../components/collection/AddCardForm';
import { ImportCollectionModal } from '../components/collection/ImportCollectionModal';
import { CardImage } from '../components/cards/CardImage';
import { PrintingSelector } from '../components/cards/PrintingSelector';
import { Modal } from '../components/ui/Modal';
import { LoadingPage } from '../components/ui/LoadingSpinner';

interface EditFormData {
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

const MTG_COLORS = [
  { value: 'W', label: 'White', symbol: '{W}' },
  { value: 'U', label: 'Blue', symbol: '{U}' },
  { value: 'B', label: 'Black', symbol: '{B}' },
  { value: 'R', label: 'Red', symbol: '{R}' },
  { value: 'G', label: 'Green', symbol: '{G}' },
];

const RARITIES = ['common', 'uncommon', 'rare', 'mythic'];

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
    gap: 2,
    mb: 3,
  },
  statCard: {
    p: 2,
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  statLabel: {
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
  filtersRow: {
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    gap: 2,
    mb: 3,
  },
  emptyState: {
    py: 6,
    textAlign: 'center',
  },
  paginationContainer: {
    display: 'flex',
    justifyContent: 'center',
    mt: 3,
  },
  editCardPreview: {
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
  clickableImage: {
    width: 80,
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    '&:hover': {
      opacity: 0.8,
    },
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

export function CollectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [editPendingCardName, setEditPendingCardName] = useState<string | null>(null);
  const [editSelectedCard, setEditSelectedCard] = useState<Card | null>(null);
  const queryClient = useQueryClient();

  // Extract filter state from URL params
  const search = searchParams.get('search') || '';
  const setCode = searchParams.get('setCode') || '';
  const colors = searchParams.get('colors')?.split(',').filter(Boolean) || [];
  const rarity = searchParams.get('rarity') || '';
  const priceMin = searchParams.get('priceMin') || '';
  const priceMax = searchParams.get('priceMax') || '';
  const forTradeOnly = searchParams.get('forTrade') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Helper to update URL params
  const updateFilters = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'false') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset to page 1 when filters change
    if (!updates.page) {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };

  const { control, handleSubmit, reset, formState: { errors } } = useForm<EditFormData>();

  useEffect(() => {
    if (editingItem) {
      reset({
        quantity: editingItem.quantity,
        foilQuantity: editingItem.foilQuantity,
        condition: editingItem.condition as CardCondition,
        language: editingItem.language,
        forTrade: editingItem.forTrade,
        tradePrice: editingItem.tradePrice,
      });
      setEditSelectedCard(null);
      setEditPendingCardName(null);
    }
  }, [editingItem, reset]);

  const { data: statsData } = useQuery({
    queryKey: ['collectionStats'],
    queryFn: getCollectionStats,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['collection', { search, setCode, colors, rarity, priceMin, priceMax, forTrade: forTradeOnly, page }],
    queryFn: () => getCollection({
      search,
      setCode,
      colors: colors.length > 0 ? colors.join(',') : undefined,
      rarity: rarity || undefined,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      forTrade: forTradeOnly,
      page,
      pageSize: 24
    }),
  });

  const removeMutation = useMutation({
    mutationFn: removeFromCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collectionStats'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditFormData> & { cardId?: string } }) =>
      updateCollectionItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collection'] });
      queryClient.invalidateQueries({ queryKey: ['collectionStats'] });
      setEditingItem(null);
      setEditSelectedCard(null);
      setEditPendingCardName(null);
    },
  });

  const handleEdit = (item: CollectionItem) => {
    setEditingItem(item);
  };

  const handleEditSubmit = (data: EditFormData) => {
    if (!editingItem) return;
    const payload: Partial<EditFormData> & { cardId?: string } = { ...data };
    if (editSelectedCard) {
      payload.cardId = editSelectedCard.id;
    }
    updateMutation.mutate({ id: editingItem.id, data: payload });
  };

  const handleEditPrintingSelected = (card: Card) => {
    setEditSelectedCard(card);
    setEditPendingCardName(null);
  };

  const handleClearEditSelection = () => {
    setEditSelectedCard(null);
  };

  const handleCloseEditModal = () => {
    setEditingItem(null);
    setEditSelectedCard(null);
    setEditPendingCardName(null);
  };

  const handleRemove = (item: CollectionItem) => {
    if (confirm(`Remove ${item.card?.name} from collection?`)) {
      removeMutation.mutate(item.id);
    }
  };

  if (isLoading) return <LoadingPage />;

  if (error) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error">Failed to load collection</Alert>
      </Box>
    );
  }

  const stats = statsData;
  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Box sx={styles.container}>
      {/* Stats */}
      <Box sx={styles.statsGrid}>
        <Paper sx={styles.statCard}>
          <Typography sx={styles.statValue}>{stats?.uniqueCards || 0}</Typography>
          <Typography sx={styles.statLabel}>Unique Cards</Typography>
        </Paper>
        <Paper sx={styles.statCard}>
          <Typography sx={styles.statValue}>{stats?.totalCards || 0}</Typography>
          <Typography sx={styles.statLabel}>Total Cards</Typography>
        </Paper>
        <Paper sx={styles.statCard}>
          <Typography sx={{ ...styles.statValue, color: 'success.main' }}>
            €{((stats?.totalValue || 0) + (stats?.totalValueFoil || 0)).toFixed(2)}
          </Typography>
          <Typography sx={styles.statLabel}>Total Value</Typography>
        </Paper>
        <Paper sx={styles.statCard}>
          <Typography sx={{ ...styles.statValue, color: 'primary.main' }}>
            {stats?.forTradeCount || 0}
          </Typography>
          <Typography sx={styles.statLabel}>For Trade</Typography>
        </Paper>
      </Box>

      {/* Filters */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {/* Search and Actions Row */}
        <Box sx={styles.filtersRow}>
          <TextField
            value={search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            placeholder="Search your collection..."
            fullWidth
            sx={{ flexGrow: 1 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={forTradeOnly}
                onChange={(e) => updateFilters({ forTrade: e.target.checked ? 'true' : null })}
              />
            }
            label="For Trade Only"
          />
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setShowImportModal(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddModal(true)}
          >
            Add Card
          </Button>
        </Box>

        {/* Advanced Filters Row */}
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              {/* Color Filter */}
              <Box sx={{ minWidth: 200 }}>
                <Typography variant="caption" sx={{ mb: 0.5, display: 'block' }}>
                  Color (cards with ALL selected)
                </Typography>
                <ToggleButtonGroup
                  value={colors}
                  onChange={(_, newColors) => updateFilters({ colors: newColors.join(',') || null })}
                  size="small"
                >
                  {MTG_COLORS.map(color => (
                    <ToggleButton
                      key={color.value}
                      value={color.value}
                      aria-label={color.label}
                      title={color.label}
                    >
                      {color.value}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* Rarity Filter */}
              <TextField
                select
                label="Rarity"
                value={rarity}
                onChange={(e) => updateFilters({ rarity: e.target.value })}
                sx={{ minWidth: 150 }}
                size="small"
              >
                <MenuItem value="">All</MenuItem>
                {RARITIES.map(r => (
                  <MenuItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </MenuItem>
                ))}
              </TextField>

              {/* Set Filter */}
              <TextField
                label="Set Code"
                value={setCode}
                onChange={(e) => updateFilters({ setCode: e.target.value.toUpperCase() })}
                placeholder="e.g., MH3"
                sx={{ minWidth: 150 }}
                size="small"
              />

              {/* Price Range */}
              <TextField
                label="Min Price (€)"
                type="number"
                value={priceMin}
                onChange={(e) => updateFilters({ priceMin: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ minWidth: 120 }}
                size="small"
              />
              <TextField
                label="Max Price (€)"
                type="number"
                value={priceMax}
                onChange={(e) => updateFilters({ priceMax: e.target.value })}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ minWidth: 120 }}
                size="small"
              />

              {/* Clear Filters Button */}
              <Button
                variant="outlined"
                startIcon={<FilterAltOffIcon />}
                onClick={() => setSearchParams({})}
                disabled={!search && !setCode && colors.length === 0 && !rarity && !priceMin && !priceMax && !forTradeOnly}
                size="small"
                sx={{ mt: 'auto' }}
              >
                Clear Filters
              </Button>
            </Box>

            {/* Active Filters Display */}
            {(search || setCode || colors.length > 0 || rarity || priceMin || priceMax || forTradeOnly) && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ alignSelf: 'center', mr: 1 }}>Active filters:</Typography>
                {search && <Chip label={`Search: ${search}`} size="small" onDelete={() => updateFilters({ search: null })} />}
                {setCode && <Chip label={`Set: ${setCode}`} size="small" onDelete={() => updateFilters({ setCode: null })} />}
                {colors.map(c => (
                  <Chip
                    key={c}
                    label={`Color: ${c}`}
                    size="small"
                    onDelete={() => updateFilters({ colors: colors.filter(col => col !== c).join(',') || null })}
                  />
                ))}
                {rarity && <Chip label={`Rarity: ${rarity}`} size="small" onDelete={() => updateFilters({ rarity: null })} />}
                {priceMin && <Chip label={`Min: €${priceMin}`} size="small" onDelete={() => updateFilters({ priceMin: null })} />}
                {priceMax && <Chip label={`Max: €${priceMax}`} size="small" onDelete={() => updateFilters({ priceMax: null })} />}
                {forTradeOnly && <Chip label="For Trade Only" size="small" onDelete={() => updateFilters({ forTrade: null })} />}
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>

      {/* Collection grid */}
      {items.length === 0 ? (
        <Box sx={styles.emptyState}>
          <Typography color="text.secondary" gutterBottom>
            {search || setCode || colors.length > 0 || rarity || priceMin || priceMax || forTradeOnly
              ? 'No cards match your filters'
              : 'Your collection is empty'}
          </Typography>
          {!(search || setCode || colors.length > 0 || rarity || priceMin || priceMax || forTradeOnly) ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setShowAddModal(true)}
            >
              Add Your First Card
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<FilterAltOffIcon />}
              onClick={() => setSearchParams({})}
            >
              Clear Filters
            </Button>
          )}
        </Box>
      ) : (
        <>
          <CardGrid>
            {items.map((item) => (
              <CardGridItem key={item.id}>
                <CollectionCard item={item} onEdit={handleEdit} onRemove={handleRemove} />
              </CardGridItem>
            ))}
          </CardGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={styles.paginationContainer}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => updateFilters({ page: value.toString() })}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Add card modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Card to Collection"
        size="lg"
      >
        <AddCardForm
          onSuccess={() => setShowAddModal(false)}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>

      {/* Edit card modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={handleCloseEditModal}
        title="Edit Collection Item"
        size="lg"
      >
        {editingItem && (
          <Box component="form" onSubmit={handleSubmit(handleEditSubmit)}>
            <Stack spacing={3}>
              {/* Current or new card display - click image to change */}
              <Paper sx={styles.editCardPreview}>
                <Box
                  sx={styles.clickableImage}
                  onClick={() => setEditPendingCardName(editingItem.card?.name || null)}
                  title="Click to change printing"
                >
                  <CardImage
                    scryfallId={editSelectedCard?.scryfallId || editingItem.card?.scryfallId || null}
                    name={editSelectedCard?.name || editingItem.card?.name || ''}
                    size="small"
                  />
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={500}>
                    {editSelectedCard?.name || editingItem.card?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {editSelectedCard?.setName || editingItem.card?.setName} ({editSelectedCard?.setCode || editingItem.card?.setCode})
                  </Typography>
                  {editSelectedCard ? (
                    <Typography variant="caption" color="primary.main">
                      New printing selected
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Click image to change printing
                    </Typography>
                  )}
                </Box>
                {editSelectedCard && (
                  <IconButton
                    size="small"
                    onClick={handleClearEditSelection}
                    sx={styles.clearButton}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Paper>

              <Grid container spacing={2}>
                <Grid size={6}>
                  <Controller
                    name="quantity"
                    control={control}
                    rules={{ required: true, min: 0 }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Quantity"
                        fullWidth
                        slotProps={{ htmlInput: { min: 0 } }}
                        error={!!errors.quantity}
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
                      <TextField {...field} select label="Condition" fullWidth>
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
                      <TextField {...field} select label="Language" fullWidth>
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

              {updateMutation.isError && (
                <Alert severity="error">Failed to update. Please try again.</Alert>
              )}

              <Box sx={styles.buttonGroup}>
                <Button variant="outlined" onClick={handleCloseEditModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}

        <PrintingSelector
          cardName={editPendingCardName}
          onSelect={handleEditPrintingSelected}
          onClose={() => setEditPendingCardName(null)}
        />
      </Modal>

      {/* Import CSV modal */}
      <ImportCollectionModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['collection'] });
          queryClient.invalidateQueries({ queryKey: ['collectionStats'] });
        }}
      />
    </Box>
  );
}
