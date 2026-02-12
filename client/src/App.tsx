import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useAuth } from './context/auth-context';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { LoadingPage } from './components/ui/LoadingSpinner';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CollectionPage } from './pages/CollectionPage';
import { WishlistPage } from './pages/WishlistPage';
import { SetsPage } from './pages/SetsPage';
import { SetDetailPage } from './pages/SetDetailPage';
import { TradePage } from './pages/TradePage';
import { TradeSessionPage } from './pages/TradeSessionPage';
import { SearchPage } from './pages/SearchPage';
import { PublicTradesPage } from './pages/PublicTradesPage';
import LandingPage from './pages/LandingPage';

const styles: Record<string, SxProps<Theme>> = {
  root: {
    minHeight: '100vh',
    bgcolor: 'background.default',
  },
  main: {
    py: 3,
  },
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingPage />;
  }

  if (isAuthenticated) {
    return <Navigate to="/collection" replace />;
  }

  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={styles.root}>
      <Header />
      <Container component="main" maxWidth="lg" sx={styles.main}>
        {children}
      </Container>
      <BottomNav />
    </Box>
  );
}

function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={styles.root}>
      <Container component="main" maxWidth="lg" sx={styles.main}>
        {children}
      </Container>
    </Box>
  );
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Teaser Landing Page */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        }
      />

      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPasswordPage />
          </PublicRoute>
        }
      />

      {/* Truly public route - no auth check, accessible by anyone */}        
      <Route
        path="/binder/:shareCode"
        element={
          <MinimalLayout>
            <PublicTradesPage />
          </MinimalLayout>
        }
      />

      {/* Protected routes */}
      <Route
        path="/collection"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CollectionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wishlist"
        element={
          <ProtectedRoute>
            <AppLayout>
              <WishlistPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sets"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SetsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sets/:setCode"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SetDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trade"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TradePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trade/:code"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TradeSessionPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/search"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SearchPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route 
        path="*" 
        element={<Navigate to={isAuthenticated ? "/collection" : "/"} replace />} 
      />
    </Routes>
  );
}
