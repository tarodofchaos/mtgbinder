import {
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
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
  const isSmallImport = totalCards <= 100;

  if (isSmallImport || !progress) {
    return (
      <Box sx={styles.container}>
        <CircularProgress size={60} />
        <Typography variant="h6">Importing cards...</Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we add {totalCards} cards to your collection
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      <CircularProgress size={60} />
      <Typography variant="h6">Importing cards...</Typography>

      <Box sx={styles.progressWrapper}>
        <LinearProgress
          variant="determinate"
          value={progress.percentage}
          sx={styles.progressBar}
        />
        <Box sx={styles.progressText}>
          <Typography variant="body2" color="text.secondary">
            Batch {progress.currentBatch} of {progress.totalBatches}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {progress.percentage}%
          </Typography>
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Processing {totalCards} cards in {progress.totalBatches} batches
      </Typography>
    </Box>
  );
}
