import { useEffect, useRef } from 'react';
import { Box, Paper } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
    bgcolor: 'white',
    borderRadius: 2,
  },
};

export function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
    }
  }, [value, size]);

  return (
    <Paper sx={styles.container} elevation={0}>
      <Box component="canvas" ref={canvasRef} />
    </Paper>
  );
}
