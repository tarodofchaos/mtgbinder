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
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {isSuccess ? t('import.importComplete') : t('import.importCompleteWithErrors')}
      </Typography>

      {/* Summary alert */}
      <Alert severity={isSuccess ? 'success' : 'warning'} sx={{ width: '100%' }}>
        {result.imported > 0 && t('import.importedCardsMsg', { count: result.imported }) + ' '}
        {result.updated > 0 && t('import.updatedCardsMsg', { count: result.updated }) + ' '}
        {result.skipped > 0 && t('import.skippedCardsMsg', { count: result.skipped }) + ' '}
        {result.failed > 0 && t('import.failedCardsMsg', { count: result.failed }) + ' '}
      </Alert>

      {/* Stats grid */}
      <Box sx={styles.statsGrid}>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: 'success.main' }}>
            {result.imported}
          </Typography>
          <Typography sx={styles.statLabel}>{t('import.newCards')}</Typography>
        </Paper>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: 'info.main' }}>
            {result.updated}
          </Typography>
          <Typography sx={styles.statLabel}>{t('import.updated')}</Typography>
        </Paper>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: 'text.secondary' }}>
            {result.skipped}
          </Typography>
          <Typography sx={styles.statLabel}>{t('import.skipped')}</Typography>
        </Paper>
        <Paper sx={styles.statCard} elevation={1}>
          <Typography sx={{ ...styles.statValue, color: result.failed > 0 ? 'error.main' : 'text.secondary' }}>
            {result.failed}
          </Typography>
          <Typography sx={styles.statLabel}>{t('import.failed')}</Typography>
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
            {showErrors ? t('common.hide') : t('common.show')} {t('import.errorCount', { count: result.errors.length })}
          </Button>
          <Collapse in={showErrors}>
            <Paper variant="outlined" sx={styles.errorsList}>
              <List dense disablePadding>
                {result.errors.map((error, index) => (
                  <ListItem key={index} divider={index < result.errors.length - 1}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="error">
                          {t('import.rowError', { row: error.row, cardName: error.cardName })}
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
          {t('common.done')}
        </Button>
      </Box>
    </Box>
  );
}
