import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { BatchProgress } from '../../services/import-service';

interface ImportProgressStepProps {
  progress: BatchProgress | null;
  totalCards: number;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 6,
    gap: 3,
  },
  progressWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    display: 'flex',
    justifyContent: 'space-between',
    mt: 1,
  },
};

export function ImportProgressStep({ progress, totalCards }: ImportProgressStepProps) {
  const { t } = useTranslation();
  const isSmallImport = totalCards <= 100;

  if (isSmallImport || !progress) {
    return (
      <Box sx={styles.container}>
        <CircularProgress size={60} />
        <Typography variant="h6">{t('import.importing')}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t('import.progressMessage', { count: totalCards })}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      <CircularProgress size={60} />
      <Typography variant="h6">{t('import.importing')}</Typography>

      <Box sx={styles.progressWrapper}>
        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          sx={styles.progressBar}
        />
        <Box sx={styles.progressText}>
          <Typography variant="body2" color="text.secondary">
            {t('import.batchProgress', { current: progress.currentBatch, total: progress.totalBatches })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progress.percentage}%
          </Typography>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary">
        {t('import.processingBatches', { count: totalCards, batches: progress.totalBatches })}
      </Typography>
    </Box>
  );
}
