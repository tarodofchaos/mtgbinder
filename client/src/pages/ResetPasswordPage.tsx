import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../context/auth-context';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
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
};

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError(t('auth.invalidResetToken'));
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || t('errors.generic'));
      } else {
        setError(t('errors.generic'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Box sx={styles.container}>
        <Paper sx={styles.card}>
          <Alert severity="error">{t('auth.invalidResetToken')}</Alert>
          <Button
            onClick={() => navigate('/login')}
            sx={{ mt: 2 }}
            fullWidth
          >
            {t('common.back')} {t('header.login')}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      <Paper sx={styles.card}>
        <Typography variant="h4" sx={styles.title}>
          {t('auth.resetPasswordTitle')}
        </Typography>

        {success ? (
          <Alert severity="success">
            {t('auth.passwordResetSuccess')}
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2.5}>
              <Controller
                name="password"
                control={control}
                rules={{ 
                  required: t('auth.passwordRequired'),
                  minLength: { value: 8, message: t('auth.minLength', { count: 8 }) }
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
                  validate: (value) => value === password || t('auth.passwordsDoNotMatch')
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
                {isLoading ? t('auth.resettingPassword') : t('auth.resetPasswordButton')}
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
