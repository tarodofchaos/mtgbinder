import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Avatar,
  Box,
  TextField,
  InputAdornment,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Search as SearchIcon,
  Storefront as StorefrontIcon,
  Favorite as WishlistIcon,
} from '@mui/icons-material';
import { api } from '../services/api';
import { Link as RouterLink } from 'react-router-dom';
import type { UserPublic, ApiResponse, PaginatedResponse } from '@mtg-binder/shared';
import { AVATARS } from '../components/layout/SettingsModal';

export function ExplorePage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const { data, isLoading, error } = useQuery({
    queryKey: ['explore', page, search],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PaginatedResponse<UserPublic>>>('/binder', {
        params: { page, pageSize, search },
      });
      return response.data.data;
    },
  });

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, pb: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
        {t('explore.title', 'Explore Binders')}
      </Typography>

      <Box sx={{ mb: 4 }}>
        <TextField
          id="explore-search"
          fullWidth
          variant="outlined"
          placeholder={t('explore.searchPlaceholder', 'Search users...')}
          value={search}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          {t('explore.error', 'Error loading public binders')}
        </Alert>
      ) : !data || !data.data || data.data.length === 0 ? (
        <Alert severity="info" sx={{ mb: 4 }}>
          {t('explore.noResults', 'No public binders found')}
        </Alert>
      ) : (
        <>
          <Grid container spacing={3}>
            {data.data.map((user: UserPublic, index: number) => {
              const userAvatar = AVATARS.find(a => a.id === user.avatarId);
              return (
                <Grid key={user.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card id={index === 0 ? 'explore-user-card-0' : undefined}>
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: userAvatar?.color || 'primary.main',
                        }}
                      >
                        {user.displayName.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h6" noWrap>
                          {user.displayName}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={0.5}>
                          <Tooltip title={t('explore.viewBinder')}>
                            <IconButton
                              component={RouterLink}
                              to={`/binder/${user.shareCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="medium"
                              sx={{ 
                                p: { xs: 1.5, sm: 1 },
                                color: 'primary.main'
                              }}
                            >
                              <StorefrontIcon sx={{ fontSize: { xs: 28, sm: 20 } }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('wishlist.title')}>
                            <IconButton
                              component={RouterLink}
                              to={`/wishlist/${user.shareCode}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="medium"
                              sx={{ 
                                p: { xs: 1.5, sm: 1 },
                                color: 'secondary.main'
                              }}
                            >
                              <WishlistIcon sx={{ fontSize: { xs: 28, sm: 20 } }} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {data.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={data.totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
