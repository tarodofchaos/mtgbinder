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
  Avatar,
  keyframes,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { AVATARS } from '../components/layout/SettingsModal';

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

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  avatarId: string;
}

const styles: Record<string, SxProps<Theme>> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    px: 2,
    py: 4,
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

export function RegisterPage() {
  const { t } = useTranslation();
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from || '/collection';

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      avatarId: 'avatar-1',
    },
  });
  const password = watch('password');
  const selectedAvatarId = watch('avatarId');
  const displayName = watch('displayName');

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setIsLoading(true);

    try {
      await registerUser(data.email, data.password, data.displayName, data.avatarId);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(t('auth.registrationFailed'));
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
            // @ts-ignore
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
        // @ts-ignore
        animation: `${rotate} 30s infinite linear`,
        zIndex: 0,
        filter: 'blur(100px)',
      }} />

      <Box sx={{ ...styles.container, zIndex: 10, position: 'relative' }}>
        <Paper sx={styles.card}>
          <Typography variant="h4" sx={styles.title}>
            {t('auth.registerTitle')}
          </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
                {t('settings.chooseAvatar', 'Choose Avatar')}
              </Typography>
              <Grid container spacing={1} justifyContent="center">
                {AVATARS.map((av) => (
                  <Grid key={av.id}>
                    <Box
                      onClick={() => setValue('avatarId', av.id)}
                      sx={{
                        cursor: 'pointer',
                        p: 0.5,
                        borderRadius: '50%',
                        border: 2,
                        borderColor: selectedAvatarId === av.id ? 'primary.main' : 'transparent',
                      }}
                    >
                      <Avatar sx={{ bgcolor: av.color }}>
                        {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Controller
              name="displayName"
              control={control}
              rules={{
                required: t('auth.displayNameRequired'),
                minLength: { value: 2, message: t('auth.minLength', { count: 2 }) },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('auth.displayName')}
                  placeholder={t('auth.displayNamePlaceholder')}
                  fullWidth
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message}
                />
              )}
            />

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
              rules={{
                required: t('auth.passwordRequired'),
                minLength: { value: 8, message: t('auth.minLength', { count: 8 }) },
              }}
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

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: t('auth.confirmPasswordRequired'),
                validate: (value) => value === password || t('auth.passwordsDoNotMatch'),
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="password"
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.passwordPlaceholder')}
                  fullWidth
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                />
              )}
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? t('auth.creatingAccount') : t('auth.registerButton')}
            </Button>
          </Stack>
        </Box>

        <Typography sx={styles.footer}>
          {t('auth.hasAccount')}{' '}
          <Link component={RouterLink} to="/login">
            {t('header.login')}
          </Link>
        </Typography>
      </Paper>
    </Box>
    </Box>
  );
}
