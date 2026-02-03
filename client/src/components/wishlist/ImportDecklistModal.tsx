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
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { WishlistPriority } from '@mtg-binder/shared';
import { Modal } from '../ui/Modal';
import {
  importDecklistPreview,
  confirmDecklistImport,
  DecklistPreviewItem,
} from '../../services/wishlist-service';
import { CardImage } from '../cards/CardImage';

interface ImportDecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const styles: Record<string, SxProps<Theme>> = {
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
};

export function ImportDecklistModal({ isOpen, onClose, onSuccess }: ImportDecklistModalProps) {
  const [decklistText, setDecklistText] = useState('');
  const [priority, setPriority] = useState<WishlistPriority>(WishlistPriority.NORMAL);
  const [preview, setPreview] = useState<DecklistPreviewItem[] | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  const previewMutation = useMutation({
    mutationFn: () => importDecklistPreview(decklistText, priority),
    onSuccess: (data) => {
      setPreview(data.preview);
      setParseErrors(data.parseErrors);
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
    onClose();
  };

  const handlePreview = () => {
    previewMutation.mutate();
  };

  const handleConfirm = () => {
    confirmMutation.mutate();
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
      return 'Not found';
    }
    if (item.alreadyInWishlist) {
      return 'Already in wishlist';
    }
    return 'Ready to import';
  };

  const cardsToImport = preview?.filter(
    (item) => item.matchedCard && !item.alreadyInWishlist
  ).length || 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Decklist" size="xl">
      <Stack spacing={3}>
        {!preview ? (
          <>
            <Alert severity="info" sx={styles.helpText}>
              <Typography variant="body2" gutterBottom>
                <strong>Supported formats:</strong>
              </Typography>
              <Typography variant="body2" component="div">
                • 4 Lightning Bolt<br />
                • 4x Card Name<br />
                • Card Name x4<br />
                • 4 Lightning Bolt (M10) - with set code
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Sideboard markers (Sideboard:, SB:) will be ignored.
              </Typography>
            </Alert>

            <TextField
              label="Decklist"
              multiline
              rows={12}
              fullWidth
              value={decklistText}
              onChange={(e) => setDecklistText(e.target.value)}
              placeholder="4 Lightning Bolt&#10;3x Counterspell&#10;Brainstorm x2"
              helperText="Paste your decklist here"
            />

            <TextField
              select
              label="Default Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as WishlistPriority)}
              fullWidth
            >
              <MenuItem value={WishlistPriority.LOW}>Low</MenuItem>
              <MenuItem value={WishlistPriority.NORMAL}>Normal</MenuItem>
              <MenuItem value={WishlistPriority.HIGH}>High</MenuItem>
              <MenuItem value={WishlistPriority.URGENT}>Urgent</MenuItem>
            </TextField>

            {previewMutation.isError && (
              <Alert severity="error">
                Failed to parse decklist. Please check the format and try again.
              </Alert>
            )}

            <Box sx={styles.buttonGroup}>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handlePreview}
                disabled={!decklistText.trim() || previewMutation.isPending}
              >
                {previewMutation.isPending ? 'Parsing...' : 'Preview Import'}
              </Button>
            </Box>
          </>
        ) : (
          <>
            <Alert severity="info">
              <Typography variant="body2">
                Found {preview.length} cards. {cardsToImport} will be imported.
              </Typography>
            </Alert>

            {parseErrors.length > 0 && (
              <Alert severity="warning">
                <Typography variant="body2" fontWeight={500}>
                  Some lines could not be parsed:
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
                        ... and {parseErrors.length - 5} more
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
                    <TableCell>Card Name</TableCell>
                    <TableCell>Set</TableCell>
                    <TableCell align="center">Need</TableCell>
                    <TableCell align="center">Own</TableCell>
                    <TableCell>Status</TableCell>
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
                Failed to import cards. Please try again.
              </Alert>
            )}

            <Box sx={styles.buttonGroup}>
              <Button variant="outlined" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setPreview(null);
                  setParseErrors([]);
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirm}
                disabled={cardsToImport === 0 || confirmMutation.isPending}
              >
                {confirmMutation.isPending
                  ? 'Importing...'
                  : `Import ${cardsToImport} Cards`}
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Modal>
  );
}
