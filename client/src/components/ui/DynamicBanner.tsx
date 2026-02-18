import { Box, Typography, Skeleton } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useState, useEffect } from 'react';
import { BANNER_THEMES } from '../../constants/banner-themes';

interface DynamicBannerProps {
  title: string;
  subtitle?: string;
  /** Scryfall Set Code or specific card name/id to derive art from */
  context?: {
    setCode?: string;
    cardName?: string;
    scryfallId?: string;
    themeId?: string;
  };
  height?: number | string;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    position: 'relative',
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    mb: 4,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    transition: 'all 0.5s ease-in-out',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  image: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center 25%',
    transition: 'opacity 0.8s ease-in-out, transform 10s linear',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)',
    zIndex: 1,
  },
  content: {
    position: 'relative',
    zIndex: 2,
    p: { xs: 3, md: 5 },
  },
  title: {
    fontWeight: 800,
    color: 'white',
    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    fontFamily: "'Planewalker', serif",
    fontSize: { xs: '1.75rem', md: '3rem' },
    lineHeight: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    mt: 1,
    fontSize: { xs: '0.75rem', md: '1rem' },
  },
};

const DEFAULT_BANNER = BANNER_THEMES[0].imageUrl;

export function DynamicBanner({ title, subtitle, context, height = 300 }: DynamicBannerProps) {
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_BANNER);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchArt = async () => {
      setIsLoading(true);
      let url = DEFAULT_BANNER;

      // Priority 1: User-selected theme
      if (context?.themeId) {
        const theme = BANNER_THEMES.find(t => t.id === context.themeId);
        if (theme) url = theme.imageUrl;
      } 
      // Priority 2: Specific Scryfall ID
      else if (context?.scryfallId) {
        const dir1 = context.scryfallId.charAt(0);
        const dir2 = context.scryfallId.charAt(1);
        url = `https://cards.scryfall.io/art_crop/front/${dir1}/${dir2}/${context.scryfallId}.jpg`;
      } 
      // Priority 3: Set code art
      else if (context?.setCode) {
        try {
          const response = await fetch(`https://api.scryfall.com/cards/random?q=set:${context.setCode}+is:artcrop`);
          if (response.ok) {
            const data = await response.json();
            url = data.image_uris?.art_crop || DEFAULT_BANNER;
          }
        } catch (e) {
          console.error('Failed to fetch set art:', e);
        }
      }
      // Priority 4: Search term art
      else if (context?.cardName) {
        try {
          const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(context.cardName)}`);
          if (response.ok) {
            const data = await response.json();
            url = data.image_uris?.art_crop || DEFAULT_BANNER;
          }
        } catch (e) {
          console.error('Failed to fetch card art:', e);
        }
      }

      setImageUrl(url);
      setIsLoading(false);
      setTimeout(() => setIsAnimating(true), 100);
    };

    fetchArt();
  }, [context?.setCode, context?.cardName, context?.scryfallId, context?.themeId]);

  return (
    <Box sx={{ ...styles.container, height }}>
      {isLoading && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          sx={{ position: 'absolute', inset: 0, bgcolor: 'action.hover' }} 
        />
      )}
      
      <Box
        component="img"
        src={imageUrl}
        alt=""
        referrerPolicy="no-referrer"
        sx={{
          ...styles.image,
          opacity: isLoading ? 0 : 1,
          transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
        }}
      />
      
      <Box sx={styles.overlay} />
      
      <Box sx={styles.content}>
        <Typography variant="h2" sx={styles.title}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="subtitle1" sx={styles.subtitle}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
