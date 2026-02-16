import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Stack,
  Paper,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { WishlistPriority } from '@mtg-binder/shared';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import {
  importDecklistPreview,
  confirmDecklistImport,
  DecklistPreviewItem,
} from '../../services/wishlist-service';
import { importFromUrl } from '../../services/import-service';
import { CardImage } from '../cards/CardImage';
import { UrlImportTab } from '../import/UrlImportTab';
import { PhotoImportTab } from '../import/PhotoImportTab';

interface ImportDecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportMethod = 'text' | 'url' | 'photo';

const styles: Record<string, SxProps<Theme>> = {
  tabs: {
    mb: 2,
    borderBottom: 1,
    borderColor: 'divider',
  },
  previewTable: {
    mt: 2,
    maxHeight: 400,
    overflow: 'auto',
  },
  cardImageCell: {
    width: 60,
    padding: 1,
  },
  statusCell: {
    width: 40,
  },
  errorList: {
    mt: 2,
    p: 2,
    bgcolor: 'error.light',
    borderRadius: 1,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1.5,
    mt: 3,
  },
  helpText: {
    mb: 2,
    p: 2,
    bgcolor: 'info.light',
    borderRadius: 1,
  },
  deckInfo: {
    mb: 2,
  },
};

export function ImportDecklistModal({ isOpen, onClose, onSuccess }: ImportDecklistModalProps) {
  const { t } = useTranslation();
  const [importMethod, setImportMethod] = useState<ImportMethod>('text');
  const [decklistText, setDecklistText] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>(WishlistPriority.NORMAL);
  const [preview, setPreview] = useState<DecklistPreviewItem[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [deckInfo, setDeckInfo] = useState<{ name?: string; author?: string; source?: string } | null>(null);

  const previewMutation = useMutation({
    mutationFn: () => importDecklistPreview(decklistText, priority),
    onSuccess: (data) => {
      setPreview(data.preview);
      setParseErrors(data.parseErrors);
      setDeckInfo(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!preview) throw new Error('No preview available');

      // Only include cards that were successfully matched and not already in wishlist
      const cardsToImport = preview
        .filter((item) => item.matchedCard && !item.alreadyInWishlist)
        .map((item) => ({
          cardId: item.matchedCard!.id,
          quantity: item.quantity,
        }));

      return confirmDecklistImport(cardsToImport, priority);
    },
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
  });

  const handleClose = () => {
    setDecklistText('');
    setPriority(WishlistPriority.NORMAL);
    setPreview(null);
    setParseErrors([]);
    setUrlError(null);
    setDeckInfo(null);
    setImportMethod('text');
    onClose();
  };

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const handleConfirm = () => {
    confirmMutation.mutate();
  };

  const handleUrlFetch = async (url: string) => {
    setIsUrlLoading(true);
    setUrlError(null);

    try {
      const result = await importFromUrl(url, 'wishlist');

      if (result.entries.length === 0) {
        setUrlError(t('import.noCardsFoundInDeck'));
        setIsUrlLoading(false);
        return;
      }

      // Convert URL import entries to DecklistPreviewItem format
      const previewItems: DecklistPreviewItem[] = result.entries.map((entry) => ({
        cardName: entry.cardName,
        setCode: entry.setCode,
        quantity: entry.quantity,
        ownedQuantity: 0, // Will be populated by server if needed
        matchedCard: entry.resolvedCard,
        alreadyInWishlist: false, // Will be checked by server if needed
      }));

      setPreview(previewItems);
      setParseErrors(result.errors);
      setDeckInfo({
        name: result.deckName,
        author: result.deckAuthor,
        source: result.source,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('import.fetchFailed');
      setUrlError(message);
    } finally {
      setIsUrlLoading(false);
    }
  };

  const handleMethodChange = (_: React.SyntheticEvent, newValue: ImportMethod) => {
    setImportMethod(newValue);
    setPreview(null);
    setParseErrors([]);
    setUrlError(null);
    setDeckInfo(null);
  };

  const getStatusIcon = (item: DecklistPreviewItem) => {
    if (!item.matchedCard) {
      return <ErrorIcon color="error" fontSize="small" />;
    }
    if (item.alreadyInWishlist) {
      return <WarningIcon color="warning" fontSize="small" />;
    }
    return <CheckIcon color="success" fontSize="small" />;
  };

  const getStatusText = (item: DecklistPreviewItem) => {
    if (!item.matchedCard) {
      return t('import.notFound');
    }
    if (item.alreadyInWishlist) {
      return t('import.alreadyInWishlist');
    }
    return t('import.readyToImport');
  };

  const cardsToImport = preview?.filter(
    (item) => item.matchedCard && !item.alreadyInWishlist
  ).length || 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('wishlist.importDecklist')} size="xl">
      <Stack spacing={3}>
        {!preview ? (
          <>
            {/* Import method tabs */}
            <Tabs
              value={importMethod}
              onChange={handleMethodChange}
              sx={styles.tabs}
            >
              <Tab label={t('import.tabText')} value="text" />
              <Tab label={t('import.tabUrl')} value="url" />
              <Tab label={t('import.tabPhoto')} value="photo" />
            </Tabs>

            {importMethod === 'text' && (
              <>
                <Alert severity="info" sx={styles.helpText}>
                  <Typography variant="body2" gutterBottom>
                    <strong>{t('import.supportedFormats')}</strong>
                  </Typography>
                  <Typography variant="body2" component="div">
                    • 4 Lightning Bolt<br />
                    • 4x Card Name<br />
                    • Card Name x4<br />
                    • 4 Lightning Bolt (M10) - {t('import.withSetCode')}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {t('import.sideboardNote')}
                  </Typography>
                </Alert>

                <TextField
                  label={t('import.decklist')}
                  multiline
                  rows={12}
                  fullWidth
                  value={decklistText}
                  onChange={(e) => setDecklistText(e.target.value)}
                  placeholder="4 Lightning Bolt&#10;3x Counterspell&#10;Brainstorm x2"
                  helperText={t('import.pasteDecklist')}
                />

                <TextField
                  select
                  label={t('import.defaultPriority')}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WishlistPriority)}
                  fullWidth
                >
                  <MenuItem value={WishlistPriority.LOW}>{t('priorities.low')}</MenuItem>
                  <MenuItem value={WishlistPriority.NORMAL}>{t('priorities.normal')}</MenuItem>
                  <MenuItem value={WishlistPriority.HIGH}>{t('priorities.high')}</MenuItem>
                  <MenuItem value={WishlistPriority.URGENT}>{t('priorities.urgent')}</MenuItem>
                </TextField>

                {previewMutation.isError && (
                  <Alert severity="error">
                    {t('import.parseError')}
                  </Alert>
                )}

                <Box sx={styles.buttonGroup}>
                  <Button variant="outlined" onClick={handleClose}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handlePreview}
                    disabled={!decklistText.trim() || previewMutation.isPending}
                  >
                    {previewMutation.isPending ? t('import.parsing') : t('import.previewImport')}
                  </Button>
                </Box>
              </>
            )}

            {importMethod === 'url' && (
              <>
                <TextField
                  select
                  label={t('import.defaultPriority')}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WishlistPriority)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <MenuItem value={WishlistPriority.LOW}>{t('priorities.low')}</MenuItem>
                  <MenuItem value={WishlistPriority.NORMAL}>{t('priorities.normal')}</MenuItem>
                  <MenuItem value={WishlistPriority.HIGH}>{t('priorities.high')}</MenuItem>
                  <MenuItem value={WishlistPriority.URGENT}>{t('priorities.urgent')}</MenuItem>
                </TextField>

                <UrlImportTab
                  onFetch={handleUrlFetch}
                  isLoading={isUrlLoading}
                  error={urlError}
                />

                <Box sx={styles.buttonGroup}>
                  <Button variant="outlined" onClick={handleClose}>
                    {t('common.cancel')}
                  </Button>
                </Box>
              </>
            )}

            {importMethod === 'photo' && (
              <>
                <TextField
                  select
                  label={t('import.defaultPriority')}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as WishlistPriority)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  <MenuItem value={WishlistPriority.LOW}>{t('priorities.low')}</MenuItem>
                  <MenuItem value={WishlistPriority.NORMAL}>{t('priorities.normal')}</MenuItem>
                  <MenuItem value={WishlistPriority.HIGH}>{t('priorities.high')}</MenuItem>
                  <MenuItem value={WishlistPriority.URGENT}>{t('priorities.urgent')}</MenuItem>
                </TextField>

                <PhotoImportTab
                  onParse={async (text) => {
                    setDecklistText(text);
                    // Trigger preview mutation after state update
                    setTimeout(() => previewMutation.mutate(), 0);
                  }}
                  isLoading={previewMutation.isPending}
                  error={previewMutation.isError ? t('import.parseError') : null}
                />

                <Box sx={styles.buttonGroup}>
                  <Button variant="outlined" onClick={handleClose}>
                    {t('common.cancel')}
                  </Button>
                </Box>
              </>
            )}
          </>
        ) : (
          <>
            {/* Deck info from URL import */}
            {deckInfo && (deckInfo.name || deckInfo.author) && (
              <Alert severity="success" sx={styles.deckInfo}>
                <Typography variant="body2">
                  <strong>{deckInfo.name || t('import.deck')}</strong>
                  {deckInfo.author && ' ' + t('import.byAuthor', { author: deckInfo.author })}
                  {deckInfo.source && ` (${deckInfo.source})`}
                </Typography>
              </Alert>
            )}

            <Alert severity="info">
              <Typography variant="body2">
                {t('import.foundCards', { count: preview.length })} {cardsToImport} {t('import.willBeImported')}
              </Typography>
            </Alert>

            {parseErrors.length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" fontWeight={500}>
                  {t('import.someLinesFailed')}
                </Typography>
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {parseErrors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>
                      <Typography variant="caption">{error}</Typography>
                    </li>
                  ))}
                  {parseErrors.length > 5 && (
                    <li>
                      <Typography variant="caption">
                        ... {t('import.andMore', { count: parseErrors.length - 5 })}
                      </Typography>
                    </li>
                  )}
                </Box>
              </Alert>
            )}

            <TableContainer component={Paper} sx={styles.previewTable}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={styles.statusCell}></TableCell>
                    <TableCell sx={styles.cardImageCell}></TableCell>
                    <TableCell>{t('import.cardName')}</TableCell>
                    <TableCell>{t('import.set')}</TableCell>
                    <TableCell align="center">{t('import.need')}</TableCell>
                    <TableCell align="center">{t('import.own')}</TableCell>
                    <TableCell>{t('import.status')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((item, idx) => (
                    <TableRow
                      key={idx}
                      sx={{
                        bgcolor: item.matchedCard && !item.alreadyInWishlist
                          ? 'transparent'
                          : 'action.hover',
                      }}
                    >
                      <TableCell sx={styles.statusCell}>
                        {getStatusIcon(item)}
                      </TableCell>
                      <TableCell sx={styles.cardImageCell}>
                        {item.matchedCard && (
                          <CardImage
                            scryfallId={item.matchedCard.scryfallId}
                            name={item.matchedCard.name}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.matchedCard ? item.matchedCard.name : item.cardName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {item.matchedCard ? (
                          <Chip
                            label={item.matchedCard.setCode}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          item.setCode && (
                            <Chip
                              label={item.setCode}
                              size="small"
                              variant="outlined"
                              color="error"
                            />
                          )
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{item.quantity}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color={item.ownedQuantity > 0 ? 'success.main' : 'text.secondary'}
                        >
                          {item.ownedQuantity}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {getStatusText(item)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {confirmMutation.isError && (
              <Alert severity="error">
                {t('import.importError')}
              </Alert>
            )}

            <Box sx={styles.buttonGroup}>
              <Button variant="outlined" onClick={handleClose}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setPreview(null);
                  setParseErrors([]);
                  setDeckInfo(null);
                }}
              >
                {t('common.back')}
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirm}
                disabled={cardsToImport === 0 || confirmMutation.isPending}
              >
                {confirmMutation.isPending
                  ? t('import.importing')
                  : t('import.importCards', { count: cardsToImport })}
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Modal>
  );
}
