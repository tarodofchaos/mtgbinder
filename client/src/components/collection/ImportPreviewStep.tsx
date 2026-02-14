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
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { Card } from '@mtg-binder/shared';
import { DuplicateMode, PreviewRow, PreviewStats } from '../../services/import-service';
import { CardImage } from '../cards/CardImage';
import { PrintingSelector } from '../cards/PrintingSelector';

interface ImportPreviewStepProps {
  previewRows: PreviewRow[];
  stats: PreviewStats;
  duplicateMode: DuplicateMode;
  onDuplicateModeChange: (mode: DuplicateMode) => void;
  onCardOverride: (rowIndex: number, card: Card) => void;
  onImport: () => void;
  onBack: () => void;
  isLoading: boolean;
  deckInfo?: { name?: string; author?: string; source?: string } | null;
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
    py: 1,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    mt: 2,
  },
};

export function ImportPreviewStep({
  previewRows,
  stats,
  duplicateMode,
  onDuplicateModeChange,
  onCardOverride,
  onImport,
  onBack,
  isLoading,
  deckInfo,
}: ImportPreviewStepProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [printingSelectorRow, setPrintingSelectorRow] = useState<number | null>(null);

  const displayRows = showAll ? previewRows : previewRows.slice(0, PREVIEW_LIMIT);
  const hasMore = previewRows.length > PREVIEW_LIMIT;
  const canImport = stats.ready > 0 || previewRows.some((r) => r.customCardId);

  const handlePrintingSelect = (card: Card) => {
    if (printingSelectorRow !== null) {
      onCardOverride(printingSelectorRow, card);
      setPrintingSelectorRow(null);
    }
  };

  const getStatusChip = (row: PreviewRow) => {
    if (row.customCardId) {
      return (
        <Chip
          icon={<ReadyIcon />}
          label={t('import.custom')}
          color="info"
          size="small"
        />
      );
    }

    switch (row.status) {
      case 'ready':
        return (
          <Chip
            icon={<ReadyIcon />}
            label={t('import.readyLabel')}
            color="success"
            size="small"
          />
        );
      case 'not_found':
        return (
          <Chip
            icon={<ErrorIcon />}
            label={t('import.notFoundLabel')}
            color="error"
            size="small"
          />
        );
      case 'error':
        return (
          <Chip
            icon={<ErrorIcon />}
            label={t('import.error')}
            color="error"
            size="small"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={styles.container}>
      {/* Deck info from URL import */}
      {deckInfo && (deckInfo.name || deckInfo.author) && (
        <Alert severity="success" sx={{ mb: 1 }}>
          <Typography variant="body2">
            <strong>{deckInfo.name || t('import.decklist')}</strong>
            {deckInfo.author && ' ' + t('import.byAuthor', { author: deckInfo.author })}
            {deckInfo.source && ` (${deckInfo.source})`}
          </Typography>
        </Alert>
      )}

      {/* Stats summary */}
      <Box sx={styles.statsRow}>
        <Chip
          label={t('import.totalCards', { count: stats.total })}
          variant="outlined"
          sx={styles.statChip}
        />
        <Chip
          label={t('import.ready', { count: stats.ready })}
          color="success"
          variant="outlined"
          sx={styles.statChip}
        />
        {stats.notFound > 0 && (
          <Chip
            label={t('import.notFound', { count: stats.notFound })}
            color="error"
            variant="outlined"
            sx={styles.statChip}
          />
        )}
        {stats.errors > 0 && (
          <Chip
            label={t('import.errors', { count: stats.errors })}
            color="error"
            variant="outlined"
            sx={styles.statChip}
          />
        )}
      </Box>

      {/* Not found warning */}
      {stats.notFound > 0 && (
        <Alert severity="warning">
          {t('import.notFoundWarning', { count: stats.notFound })}
        </Alert>
      )}

      {/* Duplicate mode selector */}
      <Paper sx={styles.duplicateModeSection} elevation={0}>
        <FormControl component="fieldset">
          <FormLabel component="legend">
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('import.duplicateModeTitle')}
            </Typography>
          </FormLabel>
          <RadioGroup
            value={duplicateMode}
            onChange={(e) => onDuplicateModeChange(e.target.value as DuplicateMode)}
            row
          >
            <FormControlLabel
              value="add"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">{t('import.addToExisting')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('import.addToExistingHelp')}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="skip"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">{t('import.skipDuplicates')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('import.skipDuplicatesHelp')}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="replace"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2">{t('import.replaceExisting')}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('import.replaceExistingHelp')}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Paper>

      {/* Preview table */}
      <TableContainer component={Paper} sx={styles.tableContainer} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{t('import.cardName')}</TableCell>
              <TableCell align="center">{t('common.qty')}</TableCell>
              <TableCell align="center">{t('common.foil')}</TableCell>
              <TableCell align="center">{t('common.condition')}</TableCell>
              <TableCell align="center">{t('collection.forTrade')}</TableCell>
              <TableCell sx={styles.statusCell}>{t('import.status')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRows.map((row, index) => (
              <TableRow
                key={index}
                hover
                sx={{
                  cursor: row.status === 'not_found' ? 'pointer' : 'default',
                  bgcolor: row.status === 'not_found' ? 'error.50' : 'inherit',
                }}
                onClick={() => {
                  if (row.status === 'not_found' || row.status === 'ready') {
                    setPrintingSelectorRow(index);
                  }
                }}
              >
                <TableCell>
                  <Box sx={styles.cardCell}>
                    {(row.resolvedCard?.scryfallId || row.customCardId) && (
                      <Box sx={styles.cardImage}>
                        <CardImage
                          scryfallId={row.resolvedCard?.scryfallId || null}
                          name={row.name}
                          size="small"
                        />
                      </Box>
                    )}
                    <Box sx={styles.cardInfo}>
                      <Typography variant="body2" noWrap>
                        {row.name}
                      </Typography>
                      {row.resolvedCard && (
                        <Typography sx={styles.setInfo} noWrap>
                          {row.resolvedCard.setName} ({row.resolvedCard.setCode})
                        </Typography>
                      )}
                    </Box>
                    {(row.status === 'ready' || row.customCardId) && (
                      <IconButton
                        size="small"
                        sx={styles.changeButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintingSelectorRow(index);
                        }}
                        title={t('import.changePrinting')}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">{row.quantity}</TableCell>
                <TableCell align="center">{row.foilQuantity}</TableCell>
                <TableCell align="center">{row.condition}</TableCell>
                <TableCell align="center">{row.forTrade}</TableCell>
                <TableCell sx={styles.statusCell}>
                  {getStatusChip(row)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Show more button */}
      {hasMore && (
        <Box sx={styles.showMoreButton}>
          <Button
            startIcon={showAll ? <CollapseIcon /> : <ExpandIcon />}
            onClick={() => setShowAll(!showAll)}
            size="small"
          >
            {showAll
              ? t('import.showLess')
              : t('import.showAll', { count: previewRows.length })}
          </Button>
        </Box>
      )}

      {/* Actions */}
      <Box sx={styles.actions}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={isLoading}
        >
          {t('common.back')}
        </Button>
        <Button
          variant="contained"
          onClick={onImport}
          disabled={!canImport || isLoading}
        >
          {isLoading ? t('import.preparing') : t('import.importCards', { count: stats.ready })}
        </Button>
      </Box>

      {/* Printing selector modal */}
      <PrintingSelector
        cardName={printingSelectorRow !== null ? previewRows[printingSelectorRow]?.name : null}
        onSelect={handlePrintingSelect}
        onClose={() => setPrintingSelectorRow(null)}
      />
    </Box>
  );
}
