import { useState, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  TextField,
  MenuItem,
  Button,
  Stack,
  Alert,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { WishlistPriority, Card } from '@mtg-binder/shared';
import { Modal } from '../ui/Modal';
import { ImportWishlistUploadStep } from './ImportWishlistUploadStep';
import { ImportWishlistPreviewStep } from './ImportWishlistPreviewStep';
import { ImportProgressStep } from '../collection/ImportProgressStep';
import { ImportResultsStep } from '../collection/ImportResultsStep';
import { CardImage } from '../cards/CardImage';
import { UrlImportTab } from '../import/UrlImportTab';
import {
  parseWishlistCSV,
  prepareWishlistImportPreview,
  wishlistPreviewRowsToImportRows,
  importWishlistBatched,
  CSVParseError,
  WishlistPreviewRow,
  PreviewStats,
  ImportResult,
  BatchProgress,
  importFromUrl,
} from '../../services/import-service';
import {
  importDecklistPreview,
  confirmDecklistImport,
  DecklistPreviewItem,
} from '../../services/wishlist-service';

interface UnifiedImportWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportTab = 'csv' | 'text' | 'url';
type ImportStep = 'upload' | 'preview' | 'progress' | 'results';
type WishlistDuplicateMode = 'skip' | 'update';

const styles: Record<string, SxProps<Theme>> = {
  tabs: {
    mb: 2,
    borderBottom: 1,
    borderColor: 'divider',
  },
  stepper: {
    mb: 3,
  },
  content: {
    minHeight: 300,
  },
  helpText: {
    mb: 2,
    p: 2,
    bgcolor: 'info.light',
    borderRadius: 1,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1.5,
    mt: 3,
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
  deckInfo: {
    mb: 2,
  },
};

export function UnifiedImportWishlistModal({ isOpen, onClose, onSuccess }: UnifiedImportWishlistModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ImportTab>('csv');
  
  // CSV specific state
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [parseErrors, setParseErrors] = useState<CSVParseError[]>([]);
  const [previewRows, setPreviewRows] = useState<WishlistPreviewRow[]>([]);
  const [previewStats, setPreviewStats] = useState<PreviewStats>({
    total: 0,
    ready: 0,
    notFound: 0,
    errors: 0,
  });
  const [duplicateMode, setDuplicateMode] = useState<WishlistDuplicateMode>('skip');
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Text/URL specific state
  const [decklistText, setDecklistText] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>(WishlistPriority.NORMAL);
  const [decklistPreview, setDecklistPreview] = useState<DecklistPreviewItem[] | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [deckInfo, setDeckInfo] = useState<{ name?: string; author?: string; source?: string } | null>(null);

  const steps = [
    t('import.uploadStep'),
    t('import.previewStep'),
    t('import.importStep'),
    t('common.done'),
  ];

  const handleClose = useCallback(() => {
    setActiveTab('csv');
    setCurrentStep('upload');
    setIsLoading(false);
    setParseErrors([]);
    setPreviewRows([]);
    setPreviewStats({ total: 0, ready: 0, notFound: 0, errors: 0 });
    setDuplicateMode('skip');
    setBatchProgress(null);
    setImportResult(null);
    setDecklistText('');
    setPriority(WishlistPriority.NORMAL);
    setDecklistPreview(null);
    setUrlError(null);
    setDeckInfo(null);
    onClose();
  }, [onClose]);

  // CSV Methods
  const handleFileSelected = useCallback(async (file: File) => {
    setIsLoading(true);
    setParseErrors([]);

    try {
      const { rows, errors } = await parseWishlistCSV(file);
      if (errors.length > 0) {
        setParseErrors(errors);
        setIsLoading(false);
        return;
      }
      if (rows.length === 0) {
        setParseErrors([{ row: 0, message: 'No valid rows found in CSV file.' }]);
        setIsLoading(false);
        return;
      }
      const { previewRows: resolved, stats } = await prepareWishlistImportPreview(rows);
      setPreviewRows(resolved);
      setPreviewStats(stats);
      setCurrentStep('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse CSV file';
      setParseErrors([{ row: 0, message }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCardOverride = useCallback((rowIndex: number, card: Card) => {
    setPreviewRows((prev) => {
      const updated = [...prev];
      updated[rowIndex] = {
        ...updated[rowIndex],
        customCardId: card.id,
        resolvedCard: {
          id: card.id,
          name: card.name,
          setCode: card.setCode,
          setName: card.setName,
          scryfallId: card.scryfallId,
          priceEur: card.priceEur,
        },
        status: 'ready',
        errorMessage: undefined,
      };
      return updated;
    });
    setPreviewStats((prev) => ({
      ...prev,
      ready: prev.ready + (previewRows[rowIndex].status === 'not_found' ? 1 : 0),
      notFound: prev.notFound - (previewRows[rowIndex].status === 'not_found' ? 1 : 0),
    }));
  }, [previewRows]);

  const handleCsvImport = useCallback(async () => {
    setCurrentStep('progress');
    setBatchProgress(null);
    try {
      const importRows = wishlistPreviewRowsToImportRows(previewRows);
      const result = await importWishlistBatched(
        importRows,
        duplicateMode,
        (progress) => setBatchProgress(progress)
      );
      setImportResult(result);
      setCurrentStep('results');
      if (result.imported > 0 || result.updated > 0) {
        onSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: previewRows.filter((r) => r.status === 'ready').length,
        errors: [{ row: 0, cardName: '', error: message }],
      });
      setCurrentStep('results');
    }
  }, [previewRows, duplicateMode, onSuccess]);

  // Text/URL Methods
  const previewMutation = useMutation({
    mutationFn: () => importDecklistPreview(decklistText, priority),
    onSuccess: (data) => {
      setDecklistPreview(data.preview);
      setDeckInfo(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: () => {
      if (!decklistPreview) throw new Error('No preview available');
      const cardsToImport = decklistPreview
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
      const previewItems: DecklistPreviewItem[] = result.entries.map((entry) => ({
        cardName: entry.cardName,
        setCode: entry.setCode,
        quantity: entry.quantity,
        ownedQuantity: 0,
        matchedCard: entry.resolvedCard,
        alreadyInWishlist: false,
      }));
      setDecklistPreview(previewItems);
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

  const getStatusIcon = (item: DecklistPreviewItem) => {
    if (!item.matchedCard) return <ErrorIcon color="error" fontSize="small" />;
    if (item.alreadyInWishlist) return <WarningIcon color="warning" fontSize="small" />;
    return <CheckIcon color="success" fontSize="small" />;
  };

  const getStatusText = (item: DecklistPreviewItem) => {
    if (!item.matchedCard) return t('import.notFound');
    if (item.alreadyInWishlist) return t('import.alreadyInWishlist');
    return t('import.readyToImport');
  };

  const activeStep = () => {
    switch (currentStep) {
      case 'upload': return 0;
      case 'preview': return 1;
      case 'progress': return 2;
      case 'results': return 3;
      default: return 0;
    }
  };

  const cardsToImportCount = decklistPreview?.filter(
    (item) => item.matchedCard && !item.alreadyInWishlist
  ).length || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={currentStep === 'progress' ? () => {} : handleClose}
      title={t('import.importWishlist')}
      size={activeTab === 'csv' && currentStep !== 'upload' ? 'lg' : (decklistPreview ? 'xl' : 'lg')}
    >
      <Box>
        {!decklistPreview && currentStep === 'upload' && (
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={styles.tabs}
          >
            <Tab label={t('import.tabCsv')} value="csv" />
            <Tab label={t('import.tabText')} value="text" />
            <Tab label={t('import.tabUrl')} value="url" />
          </Tabs>
        )}

        {activeTab === 'csv' ? (
          <Box>
            <Stepper activeStep={activeStep()} sx={styles.stepper}>
              {steps.map((label) => (
                <Step key={label}><StepLabel>{label}</StepLabel></Step>
              ))}
            </Stepper>
            <Box sx={styles.content}>
              {currentStep === 'upload' && (
                <ImportWishlistUploadStep
                  onFileSelected={handleFileSelected}
                  parseErrors={parseErrors}
                  isLoading={isLoading}
                />
              )}
              {currentStep === 'preview' && (
                <ImportWishlistPreviewStep
                  previewRows={previewRows}
                  stats={previewStats}
                  duplicateMode={duplicateMode}
                  onDuplicateModeChange={setDuplicateMode}
                  onCardOverride={handleCardOverride}
                  onImport={handleCsvImport}
                  onBack={() => setCurrentStep('upload')}
                  isLoading={isLoading}
                />
              )}
              {currentStep === 'progress' && (
                <ImportProgressStep
                  progress={batchProgress}
                  totalCards={previewRows.filter((r) => r.status === 'ready' || r.customCardId).length}
                />
              )}
              {currentStep === 'results' && importResult && (
                <ImportResultsStep result={importResult} onClose={handleClose} />
              )}
            </Box>
          </Box>
        ) : (
          <Stack spacing={3}>
            {!decklistPreview ? (
              <>
                {activeTab === 'text' && (
                  <>
                    <Alert severity="info" sx={styles.helpText}>
                      <Typography variant="body2" gutterBottom><strong>{t('import.supportedFormats')}</strong></Typography>
                      <Typography variant="body2" component="div">
                        • 4 Lightning Bolt<br />• 4x Card Name<br />• Card Name x4<br />• 4 Lightning Bolt (M10) - {t('import.withSetCode')}
                      </Typography>
                    </Alert>
                    <TextField
                      label={t('import.decklist')}
                      multiline
                      rows={10}
                      fullWidth
                      value={decklistText}
                      onChange={(e) => setDecklistText(e.target.value)}
                      placeholder="4 Lightning Bolt
3x Counterspell
Brainstorm x2"
                    />
                  </>
                )}
                {activeTab === 'url' && (
                  <UrlImportTab onFetch={handleUrlFetch} isLoading={isUrlLoading} error={urlError} />
                )}
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
                <Box sx={styles.buttonGroup}>
                  <Button variant="outlined" onClick={handleClose}>{t('common.cancel')}</Button>
                  {activeTab === 'text' && (
                    <Button
                      variant="contained"
                      onClick={() => previewMutation.mutate()}
                      disabled={!decklistText.trim() || previewMutation.isPending}
                    >
                      {previewMutation.isPending ? t('import.parsing') : t('import.previewImport')}
                    </Button>
                  )}
                </Box>
              </>
            ) : (
              <>
                {deckInfo && (deckInfo.name || deckInfo.author) && (
                  <Alert severity="success" sx={styles.deckInfo}>
                    <Typography variant="body2">
                      <strong>{deckInfo.name || t('import.deck')}</strong>
                      {deckInfo.author && ' ' + t('import.byAuthor', { author: deckInfo.author })}
                    </Typography>
                  </Alert>
                )}
                <Alert severity="info">
                  <Typography variant="body2">
                    {t('import.foundCards', { count: decklistPreview.length })} {cardsToImportCount} {t('import.willBeImported')}
                  </Typography>
                </Alert>
                <TableContainer component={Paper} sx={styles.previewTable}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={styles.statusCell}></TableCell>
                        <TableCell sx={styles.cardImageCell}></TableCell>
                        <TableCell>{t('import.cardName')}</TableCell>
                        <TableCell align="center">{t('import.qty')}</TableCell>
                        <TableCell>{t('import.status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {decklistPreview.map((item, idx) => (
                        <TableRow key={idx} sx={{ bgcolor: item.matchedCard && !item.alreadyInWishlist ? 'transparent' : 'action.hover' }}>
                          <TableCell sx={styles.statusCell}>{getStatusIcon(item)}</TableCell>
                          <TableCell sx={styles.cardImageCell}>
                            {item.matchedCard && <CardImage scryfallId={item.matchedCard.scryfallId} name={item.matchedCard.name} size="small" />}
                          </TableCell>
                          <TableCell><Typography variant="body2">{item.matchedCard ? item.matchedCard.name : item.cardName}</Typography></TableCell>
                          <TableCell align="center">{item.quantity}</TableCell>
                          <TableCell><Typography variant="caption" color="text.secondary">{getStatusText(item)}</Typography></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={styles.buttonGroup}>
                  <Button variant="outlined" onClick={handleClose}>{t('common.cancel')}</Button>
                  <Button variant="outlined" onClick={() => setDecklistPreview(null)}>{t('common.back')}</Button>
                  <Button
                    variant="contained"
                    onClick={() => confirmMutation.mutate()}
                    disabled={cardsToImportCount === 0 || confirmMutation.isPending}
                  >
                    {confirmMutation.isPending ? t('import.importing') : t('import.importCards', { count: cardsToImportCount })}
                  </Button>
                </Box>
              </>
            )}
          </Stack>
        )}
      </Box>
    </Modal>
  );
}
