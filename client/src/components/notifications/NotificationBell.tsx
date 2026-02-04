import { useState, useEffect } from 'react';
import { IconButton, Badge, Menu, Box, Typography, Divider, Button } from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { notificationService } from '../../services/notification-service';
import { NotificationItem } from './NotificationItem';
import { useSocket } from '../../hooks/useSocket';

const styles: Record<string, SxProps<Theme>> = {
  iconButton: {
    color: 'text.primary',
  },
  menu: {
    maxWidth: 400,
    width: '100%',
  },
  menuPaper: {
    maxHeight: 500,
    width: 400,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    px: 2,
    py: 1.5,
    borderBottom: 1,
    borderColor: 'divider',
  },
  title: {
    fontWeight: 600,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    py: 6,
    px: 3,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    color: 'text.disabled',
    mb: 2,
  },
  notificationsList: {
    maxHeight: 400,
    overflow: 'auto',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    py: 1.5,
    borderTop: 1,
    borderColor: 'divider',
  },
};

export function NotificationBell() {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const queryClient = useQueryClient();
  const socket = useSocket();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', { unreadOnly: false }],
    queryFn: () => notificationService.getNotifications({ unreadOnly: false, pageSize: 10 }),
    enabled: !!anchorEl, // Only fetch when menu is open
  });

  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60000, // Refetch every minute
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    },
  });

  // Listen for real-time notifications via socket
  useEffect(() => {
    if (!socket) return;

    const handleNotification = () => {
      // Invalidate queries to refetch notifications
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetchUnreadCount();
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket, queryClient, refetchUnreadCount]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: string) => {
    deleteNotificationMutation.mutate(id);
  };

  const open = Boolean(anchorEl);
  const hasNotifications = (notifications?.data?.length ?? 0) > 0;

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={styles.iconButton}
        aria-label="notifications"
        aria-controls={open ? 'notification-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        id="notification-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: styles.menuPaper,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={styles.header}>
          <Typography variant="h6" sx={styles.title}>
            {t('notifications.title')}
          </Typography>
          {hasNotifications && unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              {t('notifications.markAllRead')}
            </Button>
          )}
        </Box>

        <Box sx={styles.notificationsList}>
          {!hasNotifications ? (
            <Box sx={styles.emptyState}>
              <NotificationsIcon sx={styles.emptyIcon} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t('notifications.noNotifications')}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {t('notifications.emptyStateDescription')}
              </Typography>
            </Box>
          ) : (
            notifications?.data.map((notification, index) => (
              <Box key={notification.id}>
                {index > 0 && <Divider />}
                <NotificationItem
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              </Box>
            ))
          )}
        </Box>
      </Menu>
    </>
  );
}
