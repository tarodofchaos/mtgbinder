import React, { useMemo, useEffect } from 'react';
import { Box, Typography, Button, keyframes } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Keyframes for animations
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const floatVortex = keyframes`
  0% { 
    transform: translate(var(--sx), var(--sy)) rotate(0deg) scale(0); 
    opacity: 0; 
  }
  15% { opacity: 1; }
  85% { opacity: 1; }
  100% { 
    transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(var(--ts)); 
    opacity: 0; 
  }
`;

const drift = keyframes`
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 0.3; }
  50% { transform: translate(-45%, -55%) rotate(180deg) scale(1.5); opacity: 0.5; }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); opacity: 0.3; }
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.03); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
`;

// Iconic card images - Now using local images for better reliability and performance
const STAPLE_CARDS = [
  { name: 'Black Lotus', filename: 'black-lotus.jpg' },
  { name: 'Sol Ring', filename: 'sol-ring.jpg' },
  { name: 'Lightning Bolt', filename: 'lightning-bolt.jpg' },
  { name: 'Counterspell', filename: 'counterspell.jpg' },
  { name: 'Birds of Paradise', filename: 'birds-of-paradise.jpg' },
  { name: 'Dark Ritual', filename: 'dark-ritual.jpg' },
  { name: 'Time Walk', filename: 'time-walk.jpg' },
  { name: 'Ancestral Recall', filename: 'ancestral-recall.jpg' },
  { name: 'Mox Emerald', filename: 'mox-emerald.jpg' },
  { name: 'Mox Jet', filename: 'mox-jet.jpg' },
  { name: 'Mox Pearl', filename: 'mox-pearl.jpg' },
  { name: 'Mox Ruby', filename: 'mox-ruby.jpg' },
  { name: 'Mox Sapphire', filename: 'mox-sapphire.jpg' },
  { name: 'Time Vault', filename: 'time-vault.jpg' },
  { name: 'Force of Will', filename: 'force-of-will.jpg' },
  { name: 'Brainstorm', filename: 'brainstorm.jpg' },
  { name: 'Tarmogoyf', filename: 'tarmogoyf.jpg' },
  { name: 'Jace, the Mind Sculptor', filename: 'jace-the-mind-sculptor.jpg' },
  { name: 'Cyclonic Rift', filename: 'cyclonic-rift.jpg' },
  { name: 'Rhystic Study', filename: 'rhystic-study.jpg' },
  { name: 'Smothering Tithe', filename: 'smothering-tithe.jpg' },
  { name: 'Teferi\'s Protection', filename: 'teferis-protection.jpg' },
  { name: 'Esper Sentinel', filename: 'esper-sentinel.jpg' },
  { name: 'Dockside Extortionist', filename: 'dockside-extortionist.jpg' },
  { name: 'Mana Crypt', filename: 'mana-crypt.jpg' },
  { name: 'The One Ring', filename: 'the-one-ring.jpg' },
];

const MANA_SYMBOLS = [
  { name: 'W', url: 'https://svgs.scryfall.io/card-symbols/W.svg' },
  { name: 'U', url: 'https://svgs.scryfall.io/card-symbols/U.svg' },
  { name: 'B', url: 'https://svgs.scryfall.io/card-symbols/B.svg' },
  { name: 'R', url: 'https://svgs.scryfall.io/card-symbols/R.svg' },
  { name: 'G', url: 'https://svgs.scryfall.io/card-symbols/G.svg' },
];

interface FloatingElementProps {
  delay: number;
  duration: number;
  type: 'card' | 'mana';
  index: number;
}

const FloatingElement: React.FC<FloatingElementProps> = ({ delay, duration, type, index }) => {
  const vars = useMemo(() => {
    // Randomized spawn point
    const spawnX = (Math.random() - 0.5) * 150;
    const spawnY = (Math.random() - 0.5) * 150;
    
    // Target is much further out
    const angle = Math.random() * Math.PI * 2;
    const distance = 900 + Math.random() * 900;

    return {
      sx: spawnX,
      sy: spawnY,
      tx: Math.cos(angle) * distance,
      ty: Math.sin(angle) * distance,
      tr: Math.random() * 1440 - 720,
      ts: 0.5 + Math.random() * 1.5,
    };
  }, []);

  const sx = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: type === 'card' ? 120 : 60,
    height: type === 'card' ? 168 : 60,
    marginLeft: type === 'card' ? -60 : -30,
    marginTop: type === 'card' ? -84 : -30,
    zIndex: 1,
    opacity: 0, // Ensure it's hidden before the animation starts
    willChange: 'transform, opacity',
    animation: `${floatVortex} ${duration}s infinite cubic-bezier(0.4, 0, 0.2, 1) both`,
    animationDelay: `${delay}s`,
    '--sx': `${vars.sx}px`,
    '--sy': `${vars.sy}px`,
    '--tx': `${vars.tx}px`,
    '--ty': `${vars.ty}px`,
    '--tr': `${vars.tr}deg`,
    '--ts': vars.ts,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: type === 'card' ? '8px' : '50%',
    overflow: 'hidden',
    boxShadow: '0 15px 45px rgba(0,0,0,0.9)',
    pointerEvents: 'none',
    border: type === 'mana' ? 'none' : '1px solid rgba(255,255,255,0.15)',
  };

  if (type === 'card') {
    const card = STAPLE_CARDS[index % STAPLE_CARDS.length];
    const imageUrl = `/images/landing/${card.filename}`;
    
    return (
      <Box sx={sx}>
        <img 
          src={imageUrl} 
          alt={card.name} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </Box>
    );
  } else {
    const mana = MANA_SYMBOLS[index % MANA_SYMBOLS.length];
    return (
      <Box sx={sx}>
        <img 
          src={mana.url} 
          alt={mana.name} 
          style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.6))' }}
          referrerPolicy="no-referrer"
        />
      </Box>
    );
  }
};

export const LandingPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';

  // Load Ko-fi widget
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.kofiWidgetOverlay) {
        // @ts-ignore
        window.kofiWidgetOverlay.draw('tarodtraelacarpeta', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': '¿Nos Ayudas?',
          'floating-chat.donateButton.background-color': '#794bc4',
          'floating-chat.donateButton.text-color': '#fff'
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      const kofiWidget = document.getElementById('kofi-widget-overlay');
      if (kofiWidget) kofiWidget.remove();
      const kofiChat = document.querySelector('.kofi-floating-chat-container');
      if (kofiChat) kofiChat.remove();
    };
  }, []);

  return (
    <Box sx={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      bgcolor: '#030308',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Carbon fiber texture layer */}
      <Box sx={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
        opacity: 0.1,
        zIndex: 0,
      }} />

      {/* Atmospheric Smoke/Fog Layers - Enhanced with movement and more layers */}
      {[...Array(6)].map((_, i) => (
        <Box 
          key={`smoke-${i}`}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '250vw',
            height: '250vh',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${
              i % 3 === 0 ? 'rgba(63, 81, 181, 0.15)' : 
              i % 3 === 1 ? 'rgba(156, 39, 176, 0.12)' : 
              'rgba(0, 0, 0, 0.8)'
            } 0%, transparent 70%)`,
            filter: 'blur(120px)',
            animation: `${drift} ${60 + i * 20}s infinite alternate ease-in-out`,
            opacity: 0.4 + (i * 0.05),
            zIndex: 0,
          }} 
        />
      ))}

      {/* The Vortex Core - More intense */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '1400px',
        height: '1400px',
        borderRadius: '50%',
        background: 'conic-gradient(from 0deg, transparent, #3f51b5, transparent, #9c27b0, transparent, #3f51b5)',
        opacity: 0.2,
        animation: `${rotate} 30s infinite linear`,
        zIndex: 0,
        filter: 'blur(100px)',
      }} />

      {/* Floating Elements Container */}
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
        {[...Array(30)].map((_, i) => (
          <FloatingElement 
            key={`card-${i}`} 
            type="card" 
            index={i} 
            delay={i * 0.5} 
            duration={10 + Math.random() * 8} 
          />
        ))}
        {[...Array(20)].map((_, i) => (
          <FloatingElement 
            key={`mana-${i}`} 
            type="mana" 
            index={i} 
            delay={i * 0.8} 
            duration={8 + Math.random() * 6} 
          />
        ))}
      </Box>

      {/* Main Content */}
      <Box sx={{
        zIndex: 10,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        px: 4,
      }}>
        <Box sx={{ animation: `${pulse} 6s infinite ease-in-out` }}>
          <Typography variant="h1" sx={{
            fontWeight: 900,
            fontSize: { xs: '4.5rem', md: '9rem' },
            background: 'linear-gradient(135deg, #ffffff 10%, #3f51b5 50%, #9c27b0 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.06em',
            mb: 1,
            filter: 'drop-shadow(0 0 50px rgba(63, 81, 181, 0.6))',
            lineHeight: 1.1,
          }}>
            {isSpanish ? 'Trae la Carpeta' : 'Bring the Binder'}
          </Typography>
          <Typography variant="h5" sx={{ 
            color: 'rgba(255,255,255,1)', 
            fontWeight: 400,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontSize: { xs: '1rem', md: '1.8rem' },
            textShadow: '0 0 40px rgba(0,0,0,1)',
            mt: 2,
          }}>
            {isSpanish ? 'El futuro del intercambio' : 'The future of trading'}
          </Typography>
        </Box>

        <Button
          component={RouterLink}
          to="/login"
          variant="contained"
          size="medium"
          sx={{
            borderRadius: '100px',
            py: 2,
            px: 6,
            fontSize: '1.2rem',
            fontWeight: '800',
            bgcolor: '#fff',
            color: '#000',
            boxShadow: '0 0 30px rgba(255,255,255,0.4)',
            textTransform: 'none',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,1)',
              boxShadow: '0 0 50px rgba(255,255,255,0.7)',
              transform: 'scale(1.05) translateY(-3px)',
            },
            transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          {isSpanish ? 'Acceso Beta' : 'Beta Access'}
        </Button>
      </Box>

      {/* Footer Branding */}
      <Box sx={{
        position: 'absolute',
        bottom: 40,
        textAlign: 'center',
        zIndex: 10,
        width: '100%',
      }}>
        <Typography variant="caption" sx={{ 
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.25em',
          fontWeight: 900,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
        }}>
          © 2026 BRING THE BINDER • NO PHYSICAL BINDERS WERE HARMED
        </Typography>
      </Box>
    </Box>
  );
};
