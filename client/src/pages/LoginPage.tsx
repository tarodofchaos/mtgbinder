import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Stack,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from '../context/auth-context';

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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      navigate('/collection');
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={styles.container}>
      <Paper sx={styles.card}>
        <Typography variant="h4" sx={styles.title}>
          Login to MTG Binder
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2.5}>
            <Controller
              name="email"
              control={control}
              rules={{ required: 'Email is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="email"
                  label="Email"
                  placeholder="your@email.com"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{ required: 'Password is required' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="password"
                  label="Password"
                  placeholder="********"
                  fullWidth
                  error={!!errors.password}
                  helperText={errors.password?.message}
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
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </Stack>
        </Box>

        <Typography sx={styles.footer}>
          Don't have an account?{' '}
          <Link component={RouterLink} to="/register">
            Register
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
