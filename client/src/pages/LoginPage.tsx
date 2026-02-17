import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Stack,
  keyframes, // Import keyframes
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../context/auth-context';

// Keyframes for animations
const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const drift = keyframes`
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 0.3; }
  50% { transform: translate(-45%, -55%) rotate(180deg) scale(1.5); opacity: 0.5; }
  100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); opacity: 0.3; }
`;

interface LoginForm {
  email: string;
  password: string;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 2,
  },
  card: {
    p: 4,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    textAlign: 'center',
    mb: 3,
    fontWeight: 700,
  },
  footer: {
    textAlign: 'center',
    mt: 3,
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
};

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from || '/collection';

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    setIsLoading(true);

    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      // Check if it's an axios error with a response
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosError.response?.status === 429) {
          setError(t('auth.tooManyAttempts'));
        } else if (axiosError.response?.data?.error) {
          setError(axiosError.response.data.error);
        } else {
          setError(t('auth.invalidCredentials'));
        }
      } else {
        setError(t('auth.invalidCredentials'));
      }
    } finally {
      setIsLoading(false);
    }
  };

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

      {/* Atmospheric Smoke/Fog Layers */}
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

      {/* The Vortex Core */}
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

      <Box sx={{ ...styles.container, zIndex: 10, position: 'relative' }}>    
        <Paper sx={styles.card}>
          <Typography variant="h4" sx={styles.title}>
            {t('auth.loginTitle')}
          </Typography>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2.5}>
              <Controller
                name="email"
                control={control}
                rules={{ required: t('auth.emailRequired') }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="email"
                    label={t('auth.email')}
                    placeholder={t('auth.emailPlaceholder')}
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                rules={{ required: t('auth.passwordRequired') }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    type="password"
                    label={t('auth.password')}
                    placeholder={t('auth.passwordPlaceholder')}
                    fullWidth
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />
                )}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>      
                <Link component={RouterLink} to="/forgot-password" variant="body2">
                  {t('auth.forgotPassword')}
                </Link>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={isLoading}
              >
                {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}     
              </Button>
            </Stack>
          </Box>

          <Typography sx={styles.footer}>
            {t('auth.noAccount')}{' '}
            <Link component={RouterLink} to="/register">
              {t('auth.registerNow')}
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
