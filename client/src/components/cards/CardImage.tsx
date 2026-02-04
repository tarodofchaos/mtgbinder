import { useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import { BrokenImage as BrokenImageIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { getCardImageUrl } from '../../services/card-service';

interface CardImageProps {
  scryfallId: string | null;
  name: string;
  size?: 'small' | 'normal' | 'large';
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2,
    bgcolor: 'action.hover',
    aspectRatio: '488 / 680',
  },
  skeleton: {
    position: 'absolute',
    inset: 0,
    height: '100%',
  },
  errorContainer: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'text.secondary',
    p: 2,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 48,
    mb: 1,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.2s',
  },
};

export function CardImage({ scryfallId, name, size = 'normal' }: CardImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrl = getCardImageUrl(scryfallId, size);

  return (
    <Box sx={styles.container}>
      {isLoading && !hasError && (
        <Skeleton
          variant="rectangular"
          animation="wave"
          sx={styles.skeleton}
        />
      )}
      {hasError ? (
        <Box sx={styles.errorContainer}>
          <BrokenImageIcon sx={styles.errorIcon} />
          <Typography variant="caption">{name}</Typography>
        </Box>
      ) : (
        <Box
          component="img"
          src={imageUrl}
          alt={name}
          loading="lazy"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          sx={{
            ...styles.image,
            opacity: isLoading ? 0 : 1,
          }}
        />
      )}
    </Box>
  );
}
