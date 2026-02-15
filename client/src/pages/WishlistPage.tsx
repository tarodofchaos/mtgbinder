import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Stack,
  Pagination,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add as AddIcon, Close as CloseIcon, Upload as UploadIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { WishlistItem, WishlistPriority, Card } from '@mtg-binder/shared';
import { getWishlist, addToWishlist, removeFromWishlist, updateWishlistItem } from '../services/wishlist-service';
import { CardGrid, CardGridItem } from '../components/cards/CardGrid';
import { WishlistCard } from '../components/wishlist/WishlistCard';
import { CardSearch } from '../components/cards/CardSearch';
import { CardImage } from '../components/cards/CardImage';
import { PrintingSelector } from '../components/cards/PrintingSelector';
import { Modal } from '../components/ui/Modal';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { DebouncedTextField } from '../components/ui/DebouncedTextField';
import { ImportDecklistModal } from '../components/wishlist/ImportDecklistModal';
import { ImportWishlistModal } from '../components/wishlist/ImportWishlistModal';
import { useTranslation } from 'react-i18next';

interface AddWishlistForm {
  priority: WishlistPriority;
  quantity: number;
  maxPrice: string;
  foilOnly: boolean;
}

interface EditWishlistForm {
  priority: WishlistPriority;
  quantity: number;
  maxPrice: string;
  foilOnly: boolean;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    pb: 10,
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
  },
};

export function WishlistPage() {
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [pendingCardName, setPendingCardName] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [editPendingCardName, setEditPendingCardName] = useState<string | null>(null);
  const [editSelectedCard, setEditSelectedCard] = useState<Card | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<WishlistPriority | ''>('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { control: addControl, handleSubmit: handleAddSubmit, reset: resetAdd } = useForm<AddWishlistForm>({
    defaultValues: {
      priority: WishlistPriority.NORMAL,
      quantity: 1,
      maxPrice: '',
      foilOnly: false,
    },
  });

  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm<EditWishlistForm>();

  useEffect(() => {
    if (editingItem) {
      resetEdit({
        priority: editingItem.priority as WishlistPriority,
        quantity: editingItem.quantity,
        maxPrice: editingItem.maxPrice?.toString() || '',
        foilOnly: editingItem.foilOnly,
      });
      setEditSelectedCard(null);
      setEditPendingCardName(null);
    }
  }, [editingItem, resetEdit]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['wishlist', { search, priority: priorityFilter || undefined, page }],
    queryFn: () => getWishlist({
      search,
      priority: priorityFilter || undefined,
      page,
      pageSize: 24,
    }),
  });

  const addMutation = useMutation({
    mutationFn: addToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setShowAddModal(false);
      setSelectedCard(null);
      resetAdd();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EditWishlistForm> & { cardId?: string } }) => {
      const payload = {
        ...data,
        maxPrice: data.maxPrice ? parseFloat(data.maxPrice) : null,
      };
      return updateWishlistItem(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      setEditingItem(null);
      setEditSelectedCard(null);
      setEditPendingCardName(null);
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
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

  const onAddSubmit = (data: AddWishlistForm) => {
    if (!selectedCard) return;

    addMutation.mutate({
      cardId: selectedCard.id,
      priority: data.priority,
      quantity: data.quantity,
      maxPrice: data.maxPrice ? parseFloat(data.maxPrice) : null,
      foilOnly: data.foilOnly,
    });
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingItem(item);
  };

  const onEditSubmit = (data: EditWishlistForm) => {
    if (!editingItem) return;
    const payload: Partial<EditWishlistForm> & { cardId?: string } = { ...data };
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

  const handleRemove = (item: WishlistItem) => {
    if (confirm(t('wishlist.confirmRemove', { cardName: item.card?.name }))) {
      removeMutation.mutate(item.id);
    }
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setSelectedCard(null);
    setPendingCardName(null);
    resetAdd();
  };

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['wishlist'] });
  };

  if (isLoading) return <LoadingPage />;

  if (error) {
    return (
      <Box sx={styles.emptyState}>
        <Alert severity="error">{t('wishlist.failedToLoad')}</Alert>
      </Box>
    );
  }

  const items = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <Box sx={styles.container}>
      {/* Filters */}
      <Box sx={styles.filtersRow}>
        <DebouncedTextField
          id="wishlist-search"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder={t('wishlist.searchPlaceholder')}
          fullWidth
          sx={{ flexGrow: 1 }}
        />
        <TextField
          id="wishlist-priority-filter"
          select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value as WishlistPriority | '');
            setPage(1);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">{t('wishlist.allPriorities')}</MenuItem>
          <MenuItem value="URGENT">{t('priorities.urgent')}</MenuItem>
          <MenuItem value="HIGH">{t('priorities.high')}</MenuItem>
          <MenuItem value="NORMAL">{t('priorities.normal')}</MenuItem>
          <MenuItem value="LOW">{t('priorities.low')}</MenuItem>
        </TextField>
        <Button
          id="wishlist-import-decklist"
          variant="outlined"
          startIcon={<UploadIcon />}
          onClick={() => setShowImportModal(true)}
        >
          {t('wishlist.importDecklist')}
        </Button>
        <Button
          id="wishlist-import-csv"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={() => setShowCSVImportModal(true)}
        >
          {t('wishlist.importCsv')}
        </Button>
        <Button
          id="wishlist-add-button"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowAddModal(true)}
        >
          {t('wishlist.addCard')}
        </Button>
      </Box>

      {/* Wishlist grid */}
      {items.length === 0 ? (
        <Box sx={styles.emptyState}>
          <Typography color="text.secondary" gutterBottom>
            {t('wishlist.emptyWishlist')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddModal(true)}
          >
            {t('wishlist.addFirstCard')}
          </Button>
        </Box>
      ) : (
        <>
          <CardGrid>
            {items.map((item) => (
              <CardGridItem key={item.id}>
                <WishlistCard item={item} onEdit={handleEdit} onRemove={handleRemove} />
              </CardGridItem>
            ))}
          </CardGrid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={styles.paginationContainer}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_e, value) => setPage(value)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Add card modal */}
      <Modal
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        title={t('wishlist.addToWishlist')}
        size="lg"
      >
        <Stack spacing={3}>
          {!selectedCard && (
            <CardSearch
              onSelect={handleCardNameSelected}
              placeholder={t('collection.typeCardName')}
              autoFocus={true}
            />
          )}

          {selectedCard && (
            <Box component="form" onSubmit={handleAddSubmit(onAddSubmit)}>
              <Stack spacing={3}>
                <Paper sx={styles.selectedCard}>
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
                </Paper>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Controller
                      name="priority"
                      control={addControl}
                      render={({ field }) => (
                        <TextField {...field} select label={t('wishlist.priority')} fullWidth>
                          <MenuItem value="URGENT">{t('priorities.urgent')}</MenuItem>
                          <MenuItem value="HIGH">{t('priorities.high')}</MenuItem>
                          <MenuItem value="NORMAL">{t('priorities.normal')}</MenuItem>
                          <MenuItem value="LOW">{t('priorities.low')}</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={6}>
                    <Controller
                      name="quantity"
                      control={addControl}
                      rules={{ min: 1 }}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label={t('collection.quantity')}
                          fullWidth
                          slotProps={{ htmlInput: { min: 1 } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Controller
                      name="maxPrice"
                      control={addControl}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          type="number"
                          label={t('wishlist.maxPrice')}
                          placeholder={t('common.optional')}
                          fullWidth
                          slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={6}>
                    <Box sx={{ pt: 1 }}>
                      <Controller
                        name="foilOnly"
                        control={addControl}
                        render={({ field }) => (
                          <FormControlLabel
                            control={<Checkbox {...field} checked={field.value} />}
                            label={t('wishlist.foilOnly')}
                          />
                        )}
                      />
                    </Box>
                  </Grid>
                </Grid>

                {addMutation.isError && (
                  <Alert severity="error">
                    {t('wishlist.failedToAdd')}
                  </Alert>
                )}

                <Box sx={styles.buttonGroup}>
                  <Button variant="outlined" onClick={handleCloseAddModal}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={addMutation.isPending}
                  >
                    {addMutation.isPending ? t('wishlist.addingToWishlist') : t('wishlist.addToWishlist')}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </Stack>

        <PrintingSelector
          cardName={pendingCardName}
          onSelect={handlePrintingSelected}
          onClose={() => setPendingCardName(null)}
        />
      </Modal>

      {/* Edit wishlist item modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={handleCloseEditModal}
        title={t('wishlist.editItem')}
        size="lg"
      >
        {editingItem && (
          <Box component="form" onSubmit={handleEditSubmit(onEditSubmit)}>
            <Stack spacing={3}>
              {/* Current or new card display - click image to change */}
              <Paper sx={styles.selectedCard}>
                <Box
                  sx={styles.clickableImage}
                  onClick={() => setEditPendingCardName(editingItem.card?.name || null)}
                  title={t('collection.clickToChangePrinting')}
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
                      {t('collection.newPrintingSelected')}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {t('collection.clickToChangePrinting')}
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
                    name="priority"
                    control={editControl}
                    render={({ field }) => (
                      <TextField {...field} select label={t('wishlist.priority')} fullWidth>
                        <MenuItem value="URGENT">{t('priorities.urgent')}</MenuItem>
                        <MenuItem value="HIGH">{t('priorities.high')}</MenuItem>
                        <MenuItem value="NORMAL">{t('priorities.normal')}</MenuItem>
                        <MenuItem value="LOW">{t('priorities.low')}</MenuItem>
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid size={6}>
                  <Controller
                    name="quantity"
                    control={editControl}
                    rules={{ min: 1 }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label={t('collection.quantity')}
                        fullWidth
                        slotProps={{ htmlInput: { min: 1 } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid size={6}>
                  <Controller
                    name="maxPrice"
                    control={editControl}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        type="number"
                        label={t('wishlist.maxPrice')}
                        placeholder="Optional"
                        fullWidth
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                      />
                    )}
                  />
                </Grid>
                <Grid size={6}>
                  <Box sx={{ pt: 1 }}>
                    <Controller
                      name="foilOnly"
                      control={editControl}
                      render={({ field }) => (
                        <FormControlLabel
                          control={<Checkbox {...field} checked={field.value} />}
                          label={t('wishlist.foilOnly')}
                        />
                      )}
                    />
                  </Box>
                </Grid>
              </Grid>

              {updateMutation.isError && (
                <Alert severity="error">{t('wishlist.failedToUpdate')}</Alert>
              )}

              <Box sx={styles.buttonGroup}>
                <Button variant="outlined" onClick={handleCloseEditModal}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? t('common.saving') : t('common.saveChanges')}
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

      {/* Import decklist modal */}
      <ImportDecklistModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Import CSV modal */}
      <ImportWishlistModal
        isOpen={showCSVImportModal}
        onClose={() => setShowCSVImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </Box>
  );
}
