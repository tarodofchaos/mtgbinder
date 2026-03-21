import { Box, Typography, Skeleton } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useState, useEffect, useRef } from 'react';
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
    transition: 'opacity 1.5s ease-in-out, transform 10s linear',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
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

const DEFAULT_BANNER = BANNER_THEMES[0].imageUrls[0];

export function DynamicBanner({ title, subtitle, context, height = 300 }: DynamicBannerProps) {
  const [currentImage, setCurrentImage] = useState<string>(DEFAULT_BANNER);
  const [nextImage, setNextImage] = useState<string | null>(null);
  const [showNext, setShowNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const carouselInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchArt = async () => {
      setIsLoading(true);
      let urls: string[] = [DEFAULT_BANNER];

      // Priority 1: User-selected theme
      if (context?.themeId) {
        const theme = BANNER_THEMES.find(t => t.id === context.themeId);
        if (theme) {
          urls = theme.imageUrls;
        }
      } 
      // Priority 2: Specific Scryfall ID
      else if (context?.scryfallId) {
        const dir1 = context.scryfallId.charAt(0);
        const dir2 = context.scryfallId.charAt(1);
        urls = [`https://cards.scryfall.io/art_crop/front/${dir1}/${dir2}/${context.scryfallId}.jpg`];
      } 
      // Priority 3: Set code art
      else if (context?.setCode) {
        try {
          const response = await fetch(`https://api.scryfall.com/cards/random?q=set:${context.setCode}+is:artcrop`);
          if (response.ok) {
            const data = await response.json();
            if (data.image_uris?.art_crop) urls = [data.image_uris.art_crop];
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
            if (data.image_uris?.art_crop) urls = [data.image_uris.art_crop];
          }
        } catch (e) {
          console.error('Failed to fetch card art:', e);
        }
      }

      setCurrentImage(urls[0]);
      setNextImage(null);
      setShowNext(false);
      setIsLoading(false);
      setTimeout(() => setIsAnimating(true), 100);

      // Carousel effect if multiple images
      if (urls.length > 1) {
        let index = 0;
        if (carouselInterval.current) clearInterval(carouselInterval.current);
        
        carouselInterval.current = setInterval(() => {
          index = (index + 1) % urls.length;
          const nextUrl = urls[index];
          
          setNextImage(nextUrl);
          setShowNext(true);
          
          // After fade transition completes, swap current and next
          setTimeout(() => {
            setCurrentImage(nextUrl);
            setShowNext(false);
          }, 1500); // Matches transition duration
        }, 10000); // 10 seconds
      } else {
        if (carouselInterval.current) clearInterval(carouselInterval.current);
      }
    };

    fetchArt();
    
    return () => {
      if (carouselInterval.current) clearInterval(carouselInterval.current);
    };
  }, [context?.setCode, context?.cardName, context?.scryfallId, context?.themeId]);

  return (
    <Box sx={{ ...styles.container, height }}>
      {isLoading && (
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          sx={{ position: 'absolute', inset: 0, bgcolor: 'action.hover', zIndex: 0 }} 
        />
      )}
      
      {/* Current Background Layer */}
      <Box
        component="img"
        src={currentImage}
        alt=""
        referrerPolicy="no-referrer"
        sx={{
          ...styles.image,
          opacity: isLoading ? 0 : 1,
          transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
          zIndex: 0,
        }}
      />

      {/* Next Image Layer (for cross-fade) */}
      {nextImage && (
        <Box
          component="img"
          src={nextImage}
          alt=""
          referrerPolicy="no-referrer"
          sx={{
            ...styles.image,
            opacity: showNext ? 1 : 0,
            transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
            zIndex: 0,
          }}
        />
      )}
      
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
