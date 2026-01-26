import { useState, useCallback } from 'react';
import { Box, Stepper, Step, StepLabel } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import type { Card } from '@mtg-binder/shared';
import { Modal } from '../ui/Modal';
import { ImportUploadStep } from './ImportUploadStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ImportProgressStep } from './ImportProgressStep';
import { ImportResultsStep } from './ImportResultsStep';
import {
  parseCollectionCSV,
  prepareImportPreview,
  previewRowsToImportRows,
  importCollectionBatched,
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

type ImportStep = 'upload' | 'preview' | 'progress' | 'results';

const STEPS = ['Upload', 'Preview', 'Import', 'Done'];

const styles: Record<string, SxProps<Theme>> = {
  stepper: {
    mb: 3,
  },
  content: {
    minHeight: 300,
  },
};

export function ImportCollectionModal({ isOpen, onClose, onSuccess }: ImportCollectionModalProps) {
  // Step state
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [isLoading, setIsLoading] = useState(false);

  // Upload step state
  const [parseErrors, setParseErrors] = useState<CSVParseError[]>([]);

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

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setCurrentStep('upload');
    setIsLoading(false);
    setParseErrors([]);
    setPreviewRows([]);
    setPreviewStats({ total: 0, ready: 0, notFound: 0, errors: 0 });
    setDuplicateMode('add');
    setBatchProgress(null);
    setImportResult(null);
    onClose();
  }, [onClose]);

  // Handle file selection in upload step
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
        setParseErrors([{ row: 0, message: 'No valid rows found in CSV file.' }]);
        setIsLoading(false);
        return;
      }

      // Prepare preview by resolving card names
      const { previewRows: resolved, stats } = await prepareImportPreview(rows);

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

  // Handle back from preview
  const handleBack = useCallback(() => {
    setCurrentStep('upload');
    setPreviewRows([]);
    setPreviewStats({ total: 0, ready: 0, notFound: 0, errors: 0 });
    setParseErrors([]);
  }, []);

  // Get active step index for stepper
  const getActiveStep = () => {
    switch (currentStep) {
      case 'upload':
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={currentStep === 'progress' ? () => {} : handleClose}
      title="Import Collection from CSV"
      size="lg"
    >
      <Box>
        {/* Stepper */}
        <Stepper activeStep={getActiveStep()} sx={styles.stepper}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step content */}
        <Box sx={styles.content}>
          {currentStep === 'upload' && (
            <ImportUploadStep
              onFileSelected={handleFileSelected}
              parseErrors={parseErrors}
              isLoading={isLoading}
            />
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
