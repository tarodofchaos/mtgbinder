import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
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

interface ForgotPasswordForm {
  email: string;
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
    mb: 2,
    fontWeight: 700,
  },
  description: {
    textAlign: 'center',
    mb: 3,
    color: 'text.secondary',
  },
  footer: {
    textAlign: 'center',
    mt: 3,
    color: 'text.secondary',
    fontSize: '0.875rem',
  },
};

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setError(null);
    setIsLoading(true);

    try {
      await forgotPassword(data.email);
      setIsSubmitted(true);
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

  if (isSubmitted) {
    return (
      <Box sx={styles.container}>
        <Paper sx={styles.card}>
          <Typography variant="h4" sx={styles.title}>
            {t('auth.forgotPasswordTitle')}
          </Typography>
          <Alert severity="success" sx={{ mb: 3 }}>
            {t('auth.resetLinkSent')}
          </Alert>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
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
          {t('auth.forgotPasswordTitle')}
        </Typography>
        <Typography variant="body2" sx={styles.description}>
          {t('auth.forgotPasswordDescription')}
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

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isLoading}
            >
              {isLoading ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
            </Button>
            
            <Button
              component={RouterLink}
              to="/login"
              variant="text"
              fullWidth
            >
              {t('common.back')} {t('header.login')}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
