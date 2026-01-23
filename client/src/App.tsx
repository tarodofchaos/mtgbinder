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
import { CollectionPage } from './pages/CollectionPage';
import { WishlistPage } from './pages/WishlistPage';
import { TradePage } from './pages/TradePage';
import { TradeSessionPage } from './pages/TradeSessionPage';
import { SearchPage } from './pages/SearchPage';

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
    return <Navigate to="/login" replace />;
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

export default function App() {
  return (
    <Routes>
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
      <Route path="/" element={<Navigate to="/collection" replace />} />
      <Route path="*" element={<Navigate to="/collection" replace />} />
    </Routes>
  );
}
