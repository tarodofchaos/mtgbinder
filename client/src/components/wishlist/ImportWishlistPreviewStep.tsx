import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Alert,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as ReadyIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Edit as EditIcon,
  Inventory as CollectionIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Card } from '@mtg-binder/shared';
import { WishlistPreviewRow, PreviewStats } from '../../services/import-service';
import { CardImage } from '../cards/CardImage';
import { PrintingSelector } from '../cards/PrintingSelector';

interface ImportWishlistPreviewStepProps {
  previewRows: WishlistPreviewRow[];
  stats: PreviewStats;
  duplicateMode: 'skip' | 'update';
  onDuplicateModeChange: (mode: 'skip' | 'update') => void;
  onCardOverride: (rowIndex: number, card: Card) => void;
  onImport: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const PREVIEW_LIMIT = 20;

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  statsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
  },
  statChip: {
    fontWeight: 500,
  },
  duplicateModeSection: {
    p: 2,
    bgcolor: 'action.hover',
    borderRadius: 1,
  },
  tableContainer: {
    maxHeight: 400,
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
  },
  cardCell: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    minWidth: 200,
  },
  cardImage: {
    width: 40,
    flexShrink: 0,
  },
  cardInfo: {
    minWidth: 0,
    flex: 1,
  },
  setInfo: {
    fontSize: '0.75rem',
    color: 'text.secondary',
  },
  changeButton: {
    ml: 1,
    minWidth: 'auto',
    p: 0.5,
  },
  statusCell: {
    width: 100,
  },
  showMoreButton: {
    display: 'flex',
    justifyContent: 'center',
    mt: 1,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 1.5,
  },
  priorityChip: {
    fontSize: '0.7rem',
    height: 20,
  },
};

const priorityColors: Record<string, 'default' | 'error' | 'warning' | 'success'> = {
  URGENT: 'error',
  HIGH: 'warning',
  NORMAL: 'default',
  LOW: 'success',
};

export function ImportWishlistPreviewStep({
  previewRows,
  stats,
  duplicateMode,
  onDuplicateModeChange,
  onCardOverride,
  onImport,
  onBack,
  isLoading,
}: ImportWishlistPreviewStepProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [printingSelectorRow, setPrintingSelectorRow] = useState<number | null>(null);

  const displayRows = showAll ? previewRows : previewRows.slice(0, PREVIEW_LIMIT);
  const hasMore = previewRows.length > PREVIEW_LIMIT;

  const handleChangePrinting = (rowIndex: number) => {
    setPrintingSelectorRow(rowIndex);
  };

  const handlePrintingSelected = (card: Card) => {
    if (printingSelectorRow !== null) {
      onCardOverride(printingSelectorRow, card);
      setPrintingSelectorRow(null);
    }
  };

  const canImport = stats.ready > 0;

  return (
    <Box sx={styles.container}>
      {/* Stats */}
      <Box sx={styles.statsRow}>
        <Chip
          label={t('import.totalStats', { count: stats.total })}
          color="primary"
          variant="outlined"
          sx={styles.statChip}
        />
        <Chip
          label={t('import.readyStats', { count: stats.ready })}
          color="success"
          icon={<ReadyIcon />}
          sx={styles.statChip}
        />
        {stats.notFound > 0 && (
          <Chip
            label={t('import.notFoundStats', { count: stats.notFound })}
            color="error"
            icon={<ErrorIcon />}
            sx={styles.statChip}
          />
        )}
      </Box>

      {/* Duplicate mode selector */}
      <Paper sx={styles.duplicateModeSection}>
        <FormControl component="fieldset">
          <FormLabel component="legend">
            <Typography variant="subtitle2">
              {t('import.duplicateWishlistTitle')}
            </Typography>
          </FormLabel>
          <RadioGroup
            row
            value={duplicateMode}
            onChange={(e) => onDuplicateModeChange(e.target.value as 'skip' | 'update')}
          >
            <FormControlLabel
              value="skip"
              control={<Radio />}
              label={t('import.skipKeep')}
            />
            <FormControlLabel
              value="update"
              control={<Radio />}
              label={t('import.updateReplace')}
            />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Preview table */}
      <TableContainer component={Paper} sx={styles.tableContainer}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('import.cardName')}</TableCell>
              <TableCell align="center">{t('common.qty')}</TableCell>
              <TableCell align="center">{t('wishlist.priority')}</TableCell>
              <TableCell align="center">{t('collection.askingPrice')}</TableCell>
              <TableCell align="center">{t('import.minCondition')}</TableCell>
              <TableCell align="center">{t('import.foilOnly')}</TableCell>
              <TableCell align="center">{t('import.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.map((row, index) => (
              <TableRow
                key={index}
                sx={{
                  bgcolor: row.status === 'not_found' ? 'error.light' : 'inherit',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <TableCell>
                  <Box sx={styles.cardCell}>
                    {row.resolvedCard ? (
                      <>
                        <Box sx={styles.cardImage}>
                          <CardImage
                            scryfallId={row.resolvedCard.scryfallId}
                            name={row.resolvedCard.name}
                            size="small"
                          />
                        </Box>
                        <Box sx={styles.cardInfo}>
                          <Typography variant="body2" noWrap>
                            {row.resolvedCard.name}
                          </Typography>
                          <Typography sx={styles.setInfo} noWrap>
                            {row.resolvedCard.setName} ({row.resolvedCard.setCode})
                          </Typography>
                          {row.inCollection && (
                            <Chip
                              icon={<CollectionIcon />}
                              label={t('import.inCollection')}
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          sx={styles.changeButton}
                          onClick={() => handleChangePrinting(index)}
                          title={t('import.changePrinting')}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <Typography variant="body2" color="error">
                        {row.name}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">{row.quantity}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={row.priority}
                    size="small"
                    color={priorityColors[row.priority]}
                    sx={styles.priorityChip}
                  />
                </TableCell>
                <TableCell align="center">
                  {row.maxPrice !== null ? `€${row.maxPrice.toFixed(2)}` : '-'}
                </TableCell>
                <TableCell align="center">{row.minCondition || '-'}</TableCell>
                <TableCell align="center">{row.foilOnly ? t('common.yes') : t('common.no')}</TableCell>
                <TableCell align="center" sx={styles.statusCell}>
                  {row.status === 'ready' ? (
                    <Chip
                      label={t('import.readyLabel')}
                      size="small"
                      color="success"
                      icon={<ReadyIcon />}
                    />
                  ) : (
                    <Chip
                      label={t('import.notFoundLabel')}
                      size="small"
                      color="error"
                      icon={<ErrorIcon />}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Show more/less button */}
      {hasMore && (
        <Box sx={styles.showMoreButton}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowAll(!showAll)}
            endIcon={showAll ? <CollapseIcon /> : <ExpandIcon />}
          >
            {showAll ? t('import.showLess') : t('import.showAllSummary', { count: previewRows.length })}
          </Button>
        </Box>
      )}

      {/* Warning for not found cards */}
      {stats.notFound > 0 && (
        <Alert severity="warning">
          {t('import.notFoundWarningWishlist', { count: stats.notFound })}
        </Alert>
      )}

      {/* Buttons */}
      <Box sx={styles.buttonGroup}>
        <Button variant="outlined" onClick={onBack} disabled={isLoading}>
          {t('common.back')}
        </Button>
        <Button
          variant="contained"
          onClick={onImport}
          disabled={!canImport || isLoading}
        >
          {isLoading ? t('import.importing') : t('import.importCards', { count: stats.ready })}
        </Button>
      </Box>

      {/* Printing selector modal */}
      {printingSelectorRow !== null && (
        <PrintingSelector
          cardName={previewRows[printingSelectorRow].name}
          onSelect={handlePrintingSelected}
          onClose={() => setPrintingSelectorRow(null)}
        />
      )}
    </Box>
  );
}
