import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../context/auth-context';
import { AVATARS } from '../components/layout/SettingsModal';

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
  avatarId: string;
  inviteCode: string;
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      avatarId: 'avatar-1',
      inviteCode: '',
    },
  });
  const password = watch('password');
  const selectedAvatarId = watch('avatarId');
  const displayName = watch('displayName');

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setIsLoading(true);

    try {
      await registerUser(data.email, data.password, data.displayName, data.avatarId, data.inviteCode);
      navigate('/collection');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(t('auth.inviteCodeRequired'));
      } else {
        setError(t('auth.registrationFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={styles.container}>
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

            <Controller
              name="inviteCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={t('auth.inviteCode')}
                  placeholder={t('auth.inviteCodePlaceholder')}
                  fullWidth
                  error={!!errors.inviteCode}
                  helperText={errors.inviteCode?.message}
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
  );
}
