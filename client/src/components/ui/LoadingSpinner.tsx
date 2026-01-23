import { Box, CircularProgress } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 20,
  md: 40,
  lg: 60,
};

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  return <CircularProgress size={sizeMap[size]} />;
}

const pageStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '50vh',
};

export function LoadingPage() {
  return (
    <Box sx={pageStyles}>
      <LoadingSpinner size="lg" />
    </Box>
  );
}
