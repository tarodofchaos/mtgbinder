import { useState, useCallback } from 'react';
import { Box, Stepper, Step, StepLabel, Tabs, Tab } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { Card } from '@mtg-binder/shared';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { ImportUploadStep } from './ImportUploadStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ImportProgressStep } from './ImportProgressStep';
import { ImportResultsStep } from './ImportResultsStep';
import { TextImportTab } from '../import/TextImportTab';
import { UrlImportTab } from '../import/UrlImportTab';
import {
  parseCollectionCSV,
  prepareImportPreview,
  previewRowsToImportRows,
  importCollectionBatched,
  parseTextImport,
  importFromUrl,
  textEntriesToPreviewRows,
  CSVParseError,
  PreviewRow,
  PreviewStats,
  DuplicateMode,
  ImportResult,
  BatchProgress,
} from '../../services/import-service';

interface ImportCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStep = 'input' | 'preview' | 'progress' | 'results';
type ImportMethod = 'csv' | 'text' | 'url';

const styles: Record<string, SxProps<Theme>> = {
  stepper: {
    mb: 3,
  },
  tabs: {
    mb: 2,
    borderBottom: 1,
    borderColor: 'divider',
  },
  content: {
    minHeight: 300,
  },
};

export function ImportCollectionModal({ isOpen, onClose, onSuccess }: ImportCollectionModalProps) {
  const { t } = useTranslation();

  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod>('csv');

  // Input step state
  const [parseErrors, setParseErrors] = useState<CSVParseError[]>([]);
  const [textError, setTextError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [deckInfo, setDeckInfo] = useState<{ name?: string; author?: string; source?: string } | null>(null);

  // Preview step state
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [previewStats, setPreviewStats] = useState<PreviewStats>({
    total: 0,
    ready: 0,
    notFound: 0,
    errors: 0,
  });
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('add');

  // Progress step state
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // Results step state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const steps = [
    t('import.inputStep'),
    t('import.previewStep'),
    t('import.importStep'),
    t('common.done'),
  ];

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setCurrentStep('input');
    setIsLoading(false);
    setParseErrors([]);
    setTextError(null);
    setUrlError(null);
    setDeckInfo(null);
    setPreviewRows([]);
    setPreviewStats({ total: 0, ready: 0, notFound: 0, errors: 0 });
    setDuplicateMode('add');
    setBatchProgress(null);
    setImportResult(null);
    onClose();
  }, [onClose]);

  // Handle file selection in upload step (CSV)
  const handleFileSelected = useCallback(async (file: File) => {
    setIsLoading(true);
    setParseErrors([]);

    try {
      // Parse CSV
      const { rows, errors } = await parseCollectionCSV(file);

      if (errors.length > 0) {
        setParseErrors(errors);
        setIsLoading(false);
        return;
      }

      if (rows.length === 0) {
        setParseErrors([{ row: 0, message: t('import.noValidRows') }]);
        setIsLoading(false);
        return;
      }

      // Prepare preview by resolving card names
      const { previewRows: resolved, stats } = await prepareImportPreview(rows);

      setPreviewRows(resolved);
      setPreviewStats(stats);
      setCurrentStep('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('import.parseFailed');
      setParseErrors([{ row: 0, message }]);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Handle text import
  const handleTextParse = useCallback(async (text: string) => {
    setIsLoading(true);
    setTextError(null);

    try {
      const result = await parseTextImport(text, 'collection');

      if (result.entries.length === 0) {
        setTextError(t('import.noValidCardsText'));
        setIsLoading(false);
        return;
      }

      // Convert to preview rows
      const rows = textEntriesToPreviewRows(result.entries);

      setPreviewRows(rows);
      setPreviewStats({
        total: result.stats.total,
        ready: result.stats.matched,
        notFound: result.stats.notFound,
        errors: 0,
      });
      setDeckInfo(null);
      setCurrentStep('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('import.parseFailedText');
      setTextError(message);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Handle URL import
  const handleUrlFetch = useCallback(async (url: string) => {
    setIsLoading(true);
    setUrlError(null);

    try {
      const result = await importFromUrl(url, 'collection');

      if (result.entries.length === 0) {
        setUrlError(t('import.noCardsFoundInDeck'));
        setIsLoading(false);
        return;
      }

      // Convert to preview rows
      const rows = textEntriesToPreviewRows(result.entries);

      setPreviewRows(rows);
      setPreviewStats({
        total: result.stats.total,
        ready: result.stats.matched,
        notFound: result.stats.notFound,
        errors: 0,
      });
      setDeckInfo({
        name: result.deckName,
        author: result.deckAuthor,
        source: result.source,
      });
      setCurrentStep('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : t('import.fetchFailed');
      setUrlError(message);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Handle card override from PrintingSelector
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

    // Recalculate stats
    setPreviewStats((prev) => ({
      ...prev,
      ready: prev.ready + (previewRows[rowIndex].status === 'not_found' ? 1 : 0),
      notFound: prev.notFound - (previewRows[rowIndex].status === 'not_found' ? 1 : 0),
    }));
  }, [previewRows]);

  // Handle import
  const handleImport = useCallback(async () => {
    setCurrentStep('progress');
    setBatchProgress(null);

    try {
      const importRows = previewRowsToImportRows(previewRows);
      const result = await importCollectionBatched(
        importRows,
        duplicateMode,
        (progress) => setBatchProgress(progress)
      );

      setImportResult(result);
      setCurrentStep('results');

      // Notify parent of success to refresh collection
      if (result.imported > 0 || result.updated > 0) {
        onSuccess();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('import.importFailed');
      setImportResult({
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: previewRows.filter((r) => r.status === 'ready').length,
        errors: [{ row: 0, cardName: '', error: message }],
      });
      setCurrentStep('results');
    }
  }, [previewRows, duplicateMode, onSuccess, t]);

  // Handle back from preview
  const handleBack = useCallback(() => {
    setCurrentStep('input');
    setPreviewRows([]);
    setPreviewStats({ total: 0, ready: 0, notFound: 0, errors: 0 });
    setParseErrors([]);
    setDeckInfo(null);
  }, []);

  // Get active step index for stepper
  const getActiveStep = () => {
    switch (currentStep) {
      case 'input':
        return 0;
      case 'preview':
        return 1;
      case 'progress':
        return 2;
      case 'results':
        return 3;
      default:
        return 0;
    }
  };

  const handleMethodChange = (_: React.SyntheticEvent, newValue: ImportMethod) => {
    setImportMethod(newValue);
    setParseErrors([]);
    setTextError(null);
    setUrlError(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={currentStep === 'progress' ? () => {} : handleClose}
      title={t('import.importCollection')}
      size="lg"
    >
      <Box>
        {/* Stepper */}
        <Stepper activeStep={getActiveStep()} sx={styles.stepper}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step content */}
        <Box sx={styles.content}>
          {currentStep === 'input' && (
            <>
              {/* Import method tabs */}
              <Tabs
                value={importMethod}
                onChange={handleMethodChange}
                sx={styles.tabs}
              >
                <Tab label={t('import.tabCsv')} value="csv" />
                <Tab label={t('import.tabText')} value="text" />
                <Tab label={t('import.tabUrl')} value="url" />
              </Tabs>

              {importMethod === 'csv' && (
                <ImportUploadStep
                  onFileSelected={handleFileSelected}
                  parseErrors={parseErrors}
                  isLoading={isLoading}
                />
              )}

              {importMethod === 'text' && (
                <TextImportTab
                  onParse={handleTextParse}
                  isLoading={isLoading}
                  error={textError}
                  targetType="collection"
                />
              )}

              {importMethod === 'url' && (
                <UrlImportTab
                  onFetch={handleUrlFetch}
                  isLoading={isLoading}
                  error={urlError}
                />
              )}
            </>
          )}

          {currentStep === 'preview' && (
            <ImportPreviewStep
              previewRows={previewRows}
              stats={previewStats}
              duplicateMode={duplicateMode}
              onDuplicateModeChange={setDuplicateMode}
              onCardOverride={handleCardOverride}
              onImport={handleImport}
              onBack={handleBack}
              isLoading={isLoading}
              deckInfo={deckInfo}
            />
          )}

          {currentStep === 'progress' && (
            <ImportProgressStep
              progress={batchProgress}
              totalCards={previewRows.filter((r) => r.status === 'ready' || r.customCardId).length}
            />
          )}

          {currentStep === 'results' && importResult && (
            <ImportResultsStep
              result={importResult}
              onClose={handleClose}
            />
          )}
        </Box>
      </Box>
    </Modal>
  );
}
