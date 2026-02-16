import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { QRCodeDisplay } from '../trading/QRCodeDisplay';

interface ShareWishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareCode: string;
}

export function ShareWishlistModal({
  isOpen,
  onClose,
  shareCode,
}: ShareWishlistModalProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const publicWishlistUrl = `${window.location.origin}/wishlist/${shareCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicWishlistUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreview = () => {
    window.open(publicWishlistUrl, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('trade.shareMyTrades')} // I'll reuse some trade translations or add specific ones
      size="md"
    >
      <Stack spacing={3} alignItems="center">
        <Typography color="text.secondary" textAlign="center">
          {t('publicWishlist.subtitle')}
        </Typography>

        <QRCodeDisplay value={publicWishlistUrl} size={200} />

        <Box textAlign="center" sx={{ width: '100%' }}>
          <Typography
            sx={{
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              color: 'primary.main',
              wordBreak: 'break-all',
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 1,
              mb: 1,
            }}
          >
            {publicWishlistUrl}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('trade.linkNeverExpires')}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: '100%' }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<CopyIcon />}
            onClick={handleCopy}
          >
            {copied ? t('common.copied') : t('common.copyLink')}
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<ViewIcon />}
            onClick={handlePreview}
          >
            {t('common.preview')}
          </Button>
        </Stack>
      </Stack>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }}>
          {t('common.copied')}
        </Alert>
      </Snackbar>
    </Modal>
  );
}
