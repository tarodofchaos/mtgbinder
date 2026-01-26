import { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Button,
  Collapse,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { ImportResult } from '../../services/import-service';

interface ImportResultsStepProps {
  result: ImportResult;
  onClose: () => void;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    py: 2,
  },
  icon: {
    fontSize: 64,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 2,
    width: '100%',
    maxWidth: 400,
  },
  statCard: {
    p: 2,
    textAlign: 'center',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  statLabel: {
    fontSize: '0.875rem',
    color: 'text.secondary',
  },
  errorsSection: {
    width: '100%',
  },
  errorsList: {
    maxHeight: 200,
    overflow: 'auto',
    mt: 1,
  },
  actions: {
    mt: 2,
  },
};

export function ImportResultsStep({ result, onClose }: ImportResultsStepProps) {
  const [showErrors, setShowErrors] = useState(false);

  const isSuccess = result.failed === 0;
  const hasErrors = result.errors.length > 0;

  return (
    <Box sx={styles.container}>
      {/* Success/Error icon */}
      {isSuccess ? (
        <SuccessIcon sx={styles.icon} color="success" />
      ) : (
        <ErrorIcon sx={styles.icon} color="warning" />
      )}

      {/* Title */}
      <Typography variant="h5">
        {isSuccess ? 'Import Complete!' : 'Import Completed with Errors'}
      </Typography>

      {/* Summary alert */}
      <Alert severity={isSuccess ? 'success' : 'warning'} sx={{ width: '100%' }}>
        {result.imported > 0 && `${result.imported} new card${result.imported !== 1 ? 's' : ''} imported. `}
        {result.updated > 0 && `${result.updated} card${result.updated !== 1 ? 's' : ''} updated. `}
        {result.skipped > 0 && `${result.skipped} card${result.skipped !== 1 ? 's' : ''} skipped. `}
        {result.failed > 0 && `${result.failed} card${result.failed !== 1 ? 's' : ''} failed. `}
      </Alert>

      {/* Stats grid */}
      <Box sx={styles.statsGrid}>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: 'success.main' }}>
            {result.imported}
          </Typography>
          <Typography sx={styles.statLabel}>New Cards</Typography>
        </Paper>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: 'info.main' }}>
            {result.updated}
          </Typography>
          <Typography sx={styles.statLabel}>Updated</Typography>
        </Paper>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: 'text.secondary' }}>
            {result.skipped}
          </Typography>
          <Typography sx={styles.statLabel}>Skipped</Typography>
        </Paper>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: result.failed > 0 ? 'error.main' : 'text.secondary' }}>
            {result.failed}
          </Typography>
          <Typography sx={styles.statLabel}>Failed</Typography>
        </Paper>
      </Box>

      {/* Errors section */}
      {hasErrors && (
        <Box sx={styles.errorsSection}>
          <Button
            startIcon={showErrors ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setShowErrors(!showErrors)}
            color="error"
            size="small"
          >
            {showErrors ? 'Hide' : 'Show'} {result.errors.length} error{result.errors.length !== 1 ? 's' : ''}
          </Button>
          <Collapse in={showErrors}>
            <Paper variant="outlined" sx={styles.errorsList}>
              <List dense disablePadding>
                {result.errors.map((error, index) => (
                  <ListItem key={index} divider={index < result.errors.length - 1}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="error">
                          Row {error.row}: {error.cardName}
                        </Typography>
                      }
                      secondary={error.error}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Collapse>
        </Box>
      )}

      {/* Close button */}
      <Box sx={styles.actions}>
        <Button variant="contained" onClick={onClose} size="large">
          Done
        </Button>
      </Box>
    </Box>
  );
}
