import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Avatar,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Close as CloseIcon,
  DeleteForever as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/auth-context';
import { api } from '../../services/api';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const AVATARS = [
  { id: 'avatar-1', color: '#f44336', label: 'Red' },
  { id: 'avatar-2', color: '#2196f3', label: 'Blue' },
  { id: 'avatar-3', color: '#4caf50', label: 'Green' },
  { id: 'avatar-4', color: '#ffeb3b', label: 'Yellow' },
  { id: 'avatar-5', color: '#9c27b0', label: 'Purple' },
  { id: 'avatar-6', color: '#ff9800', label: 'Orange' },
  { id: 'avatar-7', color: '#795548', label: 'Brown' },
  { id: 'avatar-8', color: '#607d8b', label: 'Grey' },
];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatarId, setAvatarId] = useState(user?.avatarId || 'avatar-1');
  const [isPublic, setIsPublic] = useState(user?.isPublic || false);
  
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmCount, setDeleteConfirmCount] = useState(0);

  useEffect(() => {
    if (open && user) {
      setDisplayName(user.displayName);
      setAvatarId(user.avatarId || 'avatar-1');
      setIsPublic(user.isPublic);
      setEmail(user.email);
      setError(null);
      setSuccess(null);
      setCurrentPassword('');
      setNewPassword('');
    }
    // Only reset form when modal is opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const data: any = {
        displayName,
        avatarId,
        isPublic,
      };
      
      if (email !== user?.email || newPassword) {
        if (!currentPassword) {
          setError(t('settings.currentPasswordRequired', 'Current password is required to change email or password'));
          setIsLoading(false);
          return;
        }
        data.email = email;
        data.currentPassword = currentPassword;
        if (newPassword) data.newPassword = newPassword;
      }
      
      const response = await api.put('/auth/me', data);
      updateUser(response.data.data);
      setSuccess(t('settings.saveSuccess', 'Settings saved successfully'));
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || t('settings.saveError', 'Error saving settings'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublic = async (newVal: boolean) => {
    setIsPublic(newVal);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await api.put('/auth/me', { isPublic: newVal });
      updateUser(response.data.data);
      setSuccess(t('settings.visibilityUpdated', 'Binder visibility updated successfully'));
      
      // Clear success message after 3 seconds for better UX
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setIsPublic(!newVal);
      setError(err.response?.data?.error || t('settings.saveError', 'Error saving settings'));
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmCount < 1) {
      setDeleteConfirmCount(1);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await api.delete('/auth/me', { data: { password: deletePassword } });
      window.location.href = '/'; // Force reload and redirect to landing
    } catch (err: any) {
      setError(err.response?.data?.error || t('settings.deleteError', 'Error deleting account'));
      setDeleteConfirmCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('settings.title', 'User Settings')}
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            {t('settings.profile', 'Profile')}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              {t('settings.chooseAvatar', 'Choose Avatar')}
            </Typography>
            <Grid container spacing={1}>
              {AVATARS.map((av) => (
                <Grid key={av.id}>
                  <Box
                    onClick={() => setAvatarId(av.id)}
                    sx={{
                      cursor: 'pointer',
                      p: 0.5,
                      borderRadius: '50%',
                      border: 2,
                      borderColor: avatarId === av.id ? 'primary.main' : 'transparent',
                    }}
                  >
                    <Avatar sx={{ bgcolor: av.color }}>{displayName.charAt(0).toUpperCase()}</Avatar>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
          
          <TextField
            fullWidth
            label={t('settings.displayName', 'Display Name')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => handleTogglePublic(e.target.checked)}
                color="primary"
              />
            }
            label={t('settings.makePublic', 'Public Binder (Visible in Explore)')}
          />

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={async () => {
                try {
                  const response = await api.put('/auth/me', { tutorialProgress: {} });
                  updateUser(response.data.data);
                  onClose();
                } catch (err) {
                  console.error('Failed to reset tutorial', err);
                }
              }}
            >
              {t('settings.replayTutorial', 'Replay Tutorial')}
            </Button>
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom fontWeight="bold">
            {t('settings.account', 'Account')}
          </Typography>
          
          <TextField
            fullWidth
            label={t('settings.email', 'Email Address')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label={t('settings.newPassword', 'New Password (leave blank to keep current)')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          {(email !== user?.email || newPassword) && (
            <TextField
              fullWidth
              label={t('settings.currentPassword', 'Current Password (required for changes)')}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              error={!!error && !currentPassword}
              sx={{ mb: 2 }}
            />
          )}
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" color="error" gutterBottom fontWeight="bold">
            {t('settings.dangerZone', 'Danger Zone')}
          </Typography>
          
          {!showDeleteConfirm ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              {t('settings.deleteAccount', 'Remove Account')}
            </Button>
          ) : (
            <Box sx={{ p: 2, bgcolor: 'error.lighter', borderRadius: 1, border: 1, borderColor: 'error.main' }}>
              <Typography variant="body2" color="error" gutterBottom fontWeight="bold">
                {t('settings.deleteWarning', 'This action is permanent and cannot be undone.')}
              </Typography>
              
              <TextField
                fullWidth
                label={t('settings.confirmPasswordToDelete', 'Enter your password to confirm')}
                type="password"
                size="small"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                sx={{ mb: 2, mt: 1 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  onClick={handleDeleteAccount}
                  disabled={!deletePassword || isLoading}
                >
                  {deleteConfirmCount === 0 
                    ? t('settings.confirmDelete', 'Remove Account') 
                    : t('settings.confirmDeleteFinal', 'Are you ABSOLUTELY sure?')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmCount(0);
                    setDeletePassword('');
                  }}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={isLoading}>
          {t('common.close', 'Close')}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isLoading || !displayName}
          startIcon={isLoading && <CircularProgress size={20} color="inherit" />}
        >
          {t('settings.save', 'Save Changes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
