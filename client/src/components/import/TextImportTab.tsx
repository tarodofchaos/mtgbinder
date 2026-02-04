import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ContentPaste as PasteIcon, Search as ParseIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface TextImportTabProps {
  onParse: (text: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
  targetType: 'collection' | 'wishlist';
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  helpAlert: {
    '& .MuiAlert-message': {
      width: '100%',
    },
  },
  formatExamples: {
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    bgcolor: 'action.hover',
    p: 1.5,
    borderRadius: 1,
    mt: 1,
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1,
  },
};

export function TextImportTab({ onParse, isLoading, error, targetType }: TextImportTabProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setText(clipboardText);
    } catch {
      // Clipboard access denied - user will have to paste manually
    }
  };

  const handleParse = () => {
    if (text.trim()) {
      onParse(text);
    }
  };

  const placeholder = targetType === 'collection'
    ? t('import.collectionTextPlaceholder', '4 Lightning Bolt\n2 Counterspell (MH2) 267\n1 Black Lotus *F*')
    : t('import.wishlistTextPlaceholder', '4 Lightning Bolt\n2x Counterspell\nBrainstorm x3');

  return (
    <Box sx={styles.container}>
      <Alert severity="info" sx={styles.helpAlert}>
        <Typography variant="body2" fontWeight={500} gutterBottom>
          {t('import.supportedFormats', 'Supported formats:')}
        </Typography>
        <Box sx={styles.formatExamples}>
          <Typography variant="body2" component="div">
            4 Lightning Bolt<br />
            4x Card Name<br />
            Card Name x4<br />
            4 Lightning Bolt (M10)<br />
            3 Verdant Catacombs (MH2) 260<br />
            {targetType === 'collection' && (
              <>1 Force of Will *F* <Typography component="span" color="text.secondary">{t('import.foilMarker', '(foil)')}</Typography></>
            )}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {t('import.sideboardNote', 'Sideboard markers (Sideboard:, SB:) are recognized.')}
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          startIcon={<PasteIcon />}
          onClick={handlePaste}
          disabled={isLoading}
        >
          {t('import.pasteFromClipboard', 'Paste from Clipboard')}
        </Button>
      </Box>

      <TextField
        multiline
        rows={12}
        fullWidth
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        helperText={t('import.pasteDecklist', 'Paste your decklist here')}
      />

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <Box sx={styles.buttonGroup}>
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <ParseIcon />}
          onClick={handleParse}
          disabled={!text.trim() || isLoading}
        >
          {isLoading ? t('common.loading', 'Loading...') : t('import.parseText', 'Parse Text')}
        </Button>
      </Box>
    </Box>
  );
}
