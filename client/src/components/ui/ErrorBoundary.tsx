import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 3,
          }}
        >
          <Container maxWidth="sm">
            <Paper
              elevation={3}
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'error.main',
              }}
            >
              <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h4" gutterBottom>
                Oops! Something went wrong.
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                We're sorry for the inconvenience. A technical error occurred that prevented the page from loading correctly.
              </Typography>
              
              {import.meta.env.DEV && this.state.error && (
                <Box
                  sx={{
                    mb: 4,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    textAlign: 'left',
                    overflowX: 'auto',
                  }}
                >
                  <Typography variant="caption" component="pre" sx={{ color: 'error.main', fontFamily: 'monospace' }}>
                    {this.state.error.toString()}
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={this.handleReset}
                sx={{ minWidth: 200 }}
              >
                Reload Application
              </Button>
            </Paper>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}
