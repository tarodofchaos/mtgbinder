import { Link as RouterLink } from 'react-router-dom';
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
  const { user, logout, isAuthenticated } = useAuth();
  const { mode, toggleTheme } = useTheme();

  return (
    <AppBar position="static" elevation={0} sx={styles.appBar}>
      <Toolbar sx={styles.toolbar}>
        <Link component={RouterLink} to="/" sx={styles.logo}>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            MTG Binder
          </Typography>
        </Link>

        <Box sx={styles.actionsContainer}>
          <IconButton
            onClick={toggleTheme}
            aria-label="Toggle theme"
            color="inherit"
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>

          {isAuthenticated ? (
            <>
              <Typography sx={styles.userName}>{user?.displayName}</Typography>
              <Link
                component="button"
                onClick={logout}
                sx={styles.textLink}
              >
                Logout
              </Link>
            </>
          ) : (
            <>
              <Link component={RouterLink} to="/login" sx={styles.textLink}>
                Login
              </Link>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                size="small"
              >
                Register
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
