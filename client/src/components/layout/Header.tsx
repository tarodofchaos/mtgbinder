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
} from '@mui/material';
import {
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../../context/auth-context';
import { useTheme } from '../../context/theme-context';
import { NotificationBell } from '../notifications/NotificationBell';

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
              <Typography sx={styles.userName}>{user?.displayName}</Typography>
              <Link
                component="button"
                onClick={logout}
                sx={styles.textLink}
              >
                {t('header.logout')}
              </Link>
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
    </AppBar>
  );
}
