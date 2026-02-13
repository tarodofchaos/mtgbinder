import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Box,
  TextField,
  InputAdornment,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Search as SearchIcon } from '@mui/icons-material';
import axios from 'axios';
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
      const response = await axios.get<ApiResponse<PaginatedResponse<UserPublic>>>('/api/binder', {
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
            {data.data.map((user: UserPublic) => {
              const userAvatar = AVATARS.find(a => a.id === user.avatarId);
              return (
                <Grid key={user.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Card>
                    <CardActionArea component={RouterLink} to={`/binder/${user.shareCode}`}>
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
                        <Box>
                          <Typography variant="h6" noWrap>
                            {user.displayName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {t('explore.viewBinder', 'View Binder')}
                          </Typography>
                        </Box>
                      </CardContent>
                    </CardActionArea>
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
