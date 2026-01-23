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

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
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

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    },
  });
  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setIsLoading(true);

    try {
      await registerUser(data.email, data.password, data.displayName);
      navigate('/collection');
    } catch {
      setError('Registration failed. Email may already be registered.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={styles.container}>
      <Paper sx={styles.card}>
        <Typography variant="h4" sx={styles.title}>
          Create Account
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2.5}>
            <Controller
              name="displayName"
              control={control}
              rules={{
                required: 'Display name is required',
                minLength: { value: 2, message: 'Must be at least 2 characters' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Display Name"
                  placeholder="Your name"
                  fullWidth
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message}
                />
              )}
            />

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
              rules={{
                required: 'Password is required',
                minLength: { value: 8, message: 'Must be at least 8 characters' },
              }}
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

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="password"
                  label="Confirm Password"
                  placeholder="********"
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
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Stack>
        </Box>

        <Typography sx={styles.footer}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login">
            Login
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
