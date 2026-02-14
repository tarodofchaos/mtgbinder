import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Box,
  CircularProgress,
  Typography,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { CardAutocompleteResult } from '@mtg-binder/shared';
import { autocompleteCards } from '../../services/card-service';
import { useTranslation } from 'react-i18next';

interface CardSearchProps {
  onSelect: (card: CardAutocompleteResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    zIndex: 1300,
    width: '100%',
    mt: 0.5,
    maxHeight: 320,
    overflow: 'auto',
    top: '100%',
    left: 0,
  },
  listItem: {
    '&.Mui-selected': {
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      '&:hover': {
        bgcolor: 'primary.dark',
      },
    },
  },
  emptyState: {
    p: 2,
    textAlign: 'center',
    color: 'text.secondary',
  },
};

export function CardSearch({ onSelect, placeholder, autoFocus }: CardSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['cardAutocomplete', query],
    queryFn: () => autocompleteCards(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure the modal/dialog transition has finished
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (card: CardAutocompleteResult) => {
    onSelect(card);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <Box sx={styles.container}>
      <TextField
        inputRef={inputRef}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(e.target.value.length >= 2);
        }}
        onFocus={() => setIsOpen(query.length >= 2)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || t('search.searchForCard')}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: isLoading ? (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ) : null,
          },
        }}
      />

      {isOpen && results.length > 0 && (
        <Paper sx={styles.dropdown} elevation={8}>
          <List disablePadding>
            {results.map((card, index) => (
              <ListItemButton
                key={card.id}
                selected={index === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(card)}
                sx={styles.listItem}
              >
                <ListItemText primary={card.name} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <Paper sx={styles.dropdown} elevation={8}>
          <Typography sx={styles.emptyState}>{t('search.noCardsFound')}</Typography>
        </Paper>
      )}
    </Box>
  );
}
