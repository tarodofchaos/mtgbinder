import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Link as LinkIcon,
  Download as FetchIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface UrlImportTabProps {
  onFetch: (url: string) => Promise<void>;
  isLoading: boolean;
  error?: string | null;
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
  siteList: {
    py: 0,
  },
  siteItem: {
    py: 0.5,
  },
  exampleUrl: {
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    color: 'text.secondary',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 1,
  },
};

const SUPPORTED_SITES = [
  {
    name: 'Archidekt',
    example: 'https://archidekt.com/decks/12345',
  },
  {
    name: 'Moxfield',
    example: 'https://www.moxfield.com/decks/abc123',
  },
  {
    name: 'MTGGoldfish',
    example: 'https://www.mtggoldfish.com/deck/12345',
  },
];

export function UrlImportTab({ onFetch, isLoading, error }: UrlImportTabProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');

  const handleFetch = () => {
    if (url.trim()) {
      onFetch(url.trim());
    }
  };

  const isValidUrl = (input: string): boolean => {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && url.trim() && isValidUrl(url)) {
      handleFetch();
    }
  };

  return (
    <Box sx={styles.container}>
      <Alert severity="info" sx={styles.helpAlert}>
        <Typography variant="body2" fontWeight={500} gutterBottom>
          {t('import.supportedSites', 'Supported sites:')}
        </Typography>
        <List sx={styles.siteList} dense>
          {SUPPORTED_SITES.map((site) => (
            <ListItem key={site.name} sx={styles.siteItem} disableGutters>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={site.name}
                secondary={
                  <Typography variant="body2" sx={styles.exampleUrl}>
                    {site.example}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
      </Alert>

      <TextField
        fullWidth
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('import.urlPlaceholder', 'https://archidekt.com/decks/12345')}
        disabled={isLoading}
        InputProps={{
          startAdornment: <LinkIcon color="action" sx={{ mr: 1 }} />,
        }}
        helperText={t('import.enterDeckUrl', 'Enter the URL of the deck you want to import')}
      />

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <Box sx={styles.buttonGroup}>
        <Button
          variant="contained"
          startIcon={isLoading ? <CircularProgress size={20} /> : <FetchIcon />}
          onClick={handleFetch}
          disabled={!url.trim() || !isValidUrl(url) || isLoading}
        >
          {isLoading ? t('import.fetching', 'Fetching...') : t('import.fetchDeck', 'Fetch Deck')}
        </Button>
      </Box>
    </Box>
  );
}
