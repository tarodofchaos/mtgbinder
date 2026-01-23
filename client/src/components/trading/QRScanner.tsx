import { useEffect, useRef, useState } from 'react';
import { Box, Button, Alert, Stack } from '@mui/material';
import { CameraAlt as CameraIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

const styles: Record<string, SxProps<Theme>> = {
  scannerContainer: {
    width: '100%',
    maxWidth: 384,
    mx: 'auto',
    bgcolor: 'background.paper',
    borderRadius: 2,
    overflow: 'hidden',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
};

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setError(null);
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {
          // Ignore scan errors (no QR found in frame)
        }
      );
      setIsScanning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start camera';
      setError(message);
      onError?.(message);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Failed to stop scanner:', err);
      }
    }
  };

  return (
    <Stack spacing={2}>
      <Box
        id="qr-reader"
        sx={{
          ...styles.scannerContainer,
          minHeight: isScanning ? 300 : 0,
        }}
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={styles.buttonContainer}>
        {!isScanning ? (
          <Button
            variant="contained"
            onClick={startScanning}
            startIcon={<CameraIcon />}
          >
            Scan QR Code
          </Button>
        ) : (
          <Button variant="outlined" onClick={stopScanning}>
            Stop Scanning
          </Button>
        )}
      </Box>
    </Stack>
  );
}
