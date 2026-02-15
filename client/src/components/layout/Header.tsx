import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Avatar,
  ListItemIcon,
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { NotificationBell } from '../notifications/NotificationBell';
import { SettingsModal, AVATARS } from './SettingsModal';

const styles: Record<string, SxProps<Theme>> = {
  appBar: {
    bgcolor: 'background.paper',
    borderBottom: 1,
    borderColor: 'divider',
  },
  toolbar: {
    justifyContent: 'space-between',
  },
  logo: {
    color: 'primary.main',
    fontWeight: 700,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'none',
    },
  },
  actionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  iconButton: {
    color: 'text.primary',
  },
  userName: {
    color: 'text.secondary',
    fontSize: '0.875rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    '&:hover': {
      color: 'text.primary',
    },
  },
  textLink: {
    color: 'text.secondary',
    textDecoration: 'none',
    fontSize: '0.875rem',
    '&:hover': {
      color: 'text.primary',
    },
  },
};

export function Header() {
  const { t } = useTranslation();
  const { user, logout, isAuthenticated } = useAuth();
  const { mode, toggleTheme } = useTheme();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogoutClick = () => {
    handleMenuClose();
    setShowLogoutConfirm(true);
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    setShowSettings(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const userAvatar = AVATARS.find(a => a.id === user?.avatarId);

  return (
    <AppBar position="static" elevation={0} sx={styles.appBar}>
      <Toolbar sx={styles.toolbar}>
        <Link component={RouterLink} to="/" sx={styles.logo}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {t('header.title')}
          </Typography>
        </Link>

        <Box sx={styles.actionsContainer}>
          <IconButton
            onClick={toggleTheme}
            aria-label={t('header.toggleTheme')}
            sx={styles.iconButton}
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {isAuthenticated ? (
            <>
              <NotificationBell />
              <Box id="user-menu-button" onClick={handleMenuOpen} sx={styles.userName}>
                <Avatar 
                  sx={{ 
                    width: 32, 
                    height: 32, 
                    bgcolor: userAvatar?.color || 'primary.main',
                    fontSize: '0.875rem'
                  }}
                >
                  {user?.displayName.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  {user?.displayName}
                </Typography>
              </Box>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem onClick={handleSettingsClick}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  {t('header.settings', 'Settings')}
                </MenuItem>
                <MenuItem onClick={handleLogoutClick}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  {t('header.logout')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Link component={RouterLink} to="/login" sx={styles.textLink}>
                {t('header.login')}
              </Link>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                size="small"
              >
                {t('header.register')}
              </Button>
            </>
          )}
        </Box>
      </Toolbar>

      <SettingsModal 
        open={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Logout confirmation dialog */}
      <Dialog open={showLogoutConfirm} onClose={handleLogoutCancel}>
        <DialogTitle>{t('header.logoutConfirmTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('header.logoutConfirmMessage')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLogoutCancel}>{t('common.cancel')}</Button>
          <Button onClick={handleLogoutConfirm} variant="contained" color="primary">
            {t('header.logout')}
          </Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
}
