import { Box, keyframes } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { ManaSymbol } from './ManaSymbol';

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 0.6; }
`;

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 30,
  md: 50,
  lg: 80,
};

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  const pixelSize = sizeMap[size];
  const colors = ['W', 'U', 'B', 'R', 'G'];

  return (
    <Box
      sx={{
        position: 'relative',
        width: pixelSize,
        height: pixelSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          animation: `${rotate} 3s linear infinite`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {colors.map((c, i) => {
          const angle = (i * 360) / colors.length;
          const radius = pixelSize * 0.35;
          return (
            <ManaSymbol
              key={c}
              color={c}
              size={pixelSize * 0.3}
              sx={{
                position: 'absolute',
                transform: `rotate(${angle}deg) translateY(-${radius}px) rotate(-${angle}deg)`,
                animation: `${pulse} 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          );
        })}
      </Box>
      <Box
        sx={{
          width: pixelSize * 0.25,
          height: pixelSize * 0.25,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          filter: 'blur(8px)',
          opacity: 0.5,
          animation: `${pulse} 2s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

const pageStyles: SxProps<Theme> = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
};

export function LoadingPage() {
  return (
    <Box sx={pageStyles}>
      <LoadingSpinner size="lg" />
    </Box>
  );
}
