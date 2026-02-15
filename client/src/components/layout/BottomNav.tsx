import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import {
  Inventory2 as CollectionIcon,
  FavoriteBorder as WishlistIcon,
  Public as ExploreIcon,
  SwapHoriz as TradeIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pb: 'env(safe-area-inset-bottom)',
  },
  nav: {
    bgcolor: 'background.paper',
    backdropFilter: 'blur(12px)',
    borderTop: 1,
    borderColor: 'divider',
    height: 64,
  },
  action: {
    minWidth: 'auto',
    py: 1,
    color: 'text.secondary',
    // Fix mobile touch feedback causing visual glitch
    WebkitTapHighlightColor: 'transparent',
    transition: 'all 0.2s ease-in-out',
    '&:active': {
      opacity: 0.7,
    },
    '&.Mui-selected': {
      color: 'primary.main',
      '& .MuiSvgIcon-root': {
        transform: 'scale(1.2) translateY(-2px)',
        filter: 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.4))',
      },
    },
    // Ensure label stays visible
    '& .MuiBottomNavigationAction-label': {
      opacity: 1,
      transition: 'none',
      fontSize: '0.75rem',
      fontWeight: 500,
      '&.Mui-selected': {
        fontSize: '0.75rem',
      },
    },
    '& .MuiSvgIcon-root': {
      transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },
};

const navItems = [
  { path: '/collection', labelKey: 'nav.collection', icon: <CollectionIcon /> },
  { path: '/wishlist', labelKey: 'nav.wishlist', icon: <WishlistIcon /> },
  { path: '/explore', labelKey: 'nav.explore', icon: <ExploreIcon /> },
  { path: '/trade', labelKey: 'nav.trade', icon: <TradeIcon /> },
  { path: '/search', labelKey: 'nav.search', icon: <SearchIcon /> },
];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue = navItems.findIndex((item) =>
    location.pathname.startsWith(item.path)
  );

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    navigate(navItems[newValue].path);
  };

  return (
    <Paper sx={styles.container} elevation={3}>
      <BottomNavigation
        value={currentValue}
        onChange={handleChange}
        showLabels
        sx={styles.nav}
      >
        {navItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            id={`nav-${item.path.substring(1)}`}
            label={t(item.labelKey)}
            icon={item.icon}
            sx={styles.action}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
