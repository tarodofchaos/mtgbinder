import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TradeMessage } from '@mtg-binder/shared';
import { getTradeMessages } from '../../services/trade-service';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../context/auth-context';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const styles: Record<string, SxProps<Theme>> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    p: 2,
    borderBottom: 1,
    borderColor: 'divider',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    p: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  },
  messageRow: {
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
  },
  myMessageRow: {
    display: 'flex',
    gap: 1,
    alignItems: 'flex-start',
    flexDirection: 'row-reverse',
  },
  myMessage: {
    maxWidth: '70%',
    p: 1.5,
    borderRadius: 2,
    wordBreak: 'break-word',
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
  },
  theirMessage: {
    maxWidth: '70%',
    p: 1.5,
    borderRadius: 2,
    wordBreak: 'break-word',
    bgcolor: 'action.selected',
    // In dark mode, action.selected might be translucent. Force visible text color.
    color: (theme: Theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#1f2937',
    border: '1px solid',
    borderColor: 'divider',
  },
  messageText: {
    fontSize: '0.875rem',
    mb: 0.5,
    color: 'inherit', // Inherit from parent bubble
  },
  messageTime: {
    fontSize: '0.75rem',
    opacity: 0.7,
    color: 'inherit',
  },
  typingIndicator: {
    fontSize: '0.75rem',
    color: 'text.secondary',
    fontStyle: 'italic',
    p: 1,
  },
  inputContainer: {
    p: 2,
    borderTop: 1,
    borderColor: 'divider',
    display: 'flex',
    gap: 1,
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'text.secondary',
  },
};

interface TradeChatPanelProps {
  sessionCode: string;
  partnerName: string;
}

export function TradeChatPanel({ sessionCode, partnerName }: TradeChatPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState<TradeMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['tradeMessages', sessionCode],
    queryFn: () => getTradeMessages(sessionCode),
    enabled: !!sessionCode,
    refetchOnWindowFocus: false,
  });

  // Use a ref to track if initial messages have been loaded to prevent overwriting
  const initialLoadedRef = useRef(false);

  // Reset state when sessionCode changes
  useEffect(() => {
    setMessages([]);
    initialLoadedRef.current = false;
  }, [sessionCode]);

  useEffect(() => {
    if (initialMessages && !initialLoadedRef.current) {
      setMessages(initialMessages);
      initialLoadedRef.current = true;
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: TradeMessage) => {
      // Avoid duplicate messages if they arrive via query and socket simultaneously
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    const handleTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setIsPartnerTyping(data.isTyping);
      }
    };

    socket.on('trade-message', handleNewMessage);
    socket.on('trade-typing', handleTyping);

    return () => {
      socket.off('trade-message', handleNewMessage);
      socket.off('trade-typing', handleTyping);
    };
  }, [socket, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isPartnerTyping]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);

    if (!socket) return;

    socket.emit('trade-typing', { sessionCode, isTyping: true });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('trade-typing', { sessionCode, isTyping: false });
    }, 1000);
  };

  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !socket) return;

    socket.emit('trade-message', {
      sessionCode,
      content: trimmed,
    });

    setInputValue('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('trade-typing', { sessionCode, isTyping: false });
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Paper sx={styles.container}>
        <Box sx={styles.emptyState}>
          <LoadingSpinner />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={styles.container}>
      <Box sx={styles.header}>
        <Typography variant="h6" fontWeight={600}>
          {t('chat.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('chat.tradingWith', { name: partnerName })}
        </Typography>
      </Box>

      <Box ref={messagesContainerRef} sx={styles.messagesContainer}>
        {messages.length === 0 ? (
          <Box sx={styles.emptyState}>
            <Typography variant="body2">
              {t('chat.noMessages')}
            </Typography>
          </Box>
        ) : (
          messages.map((message) => {
            const isMyMessage = message.senderId === user?.id;

            return (
              <Box
                key={message.id}
                sx={isMyMessage ? styles.myMessageRow : styles.messageRow}
              >
                {!isMyMessage && (
                  <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem' }}>
                    {getInitials(message.sender?.displayName || partnerName)}
                  </Avatar>
                )}
                <Box sx={isMyMessage ? styles.myMessage : styles.theirMessage}>
                  <Typography sx={styles.messageText}>{message.content}</Typography>
                  <Typography sx={styles.messageTime}>
                    {formatTime(message.createdAt)}
                  </Typography>
                </Box>
                {isMyMessage && (
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      fontSize: '0.875rem',
                      bgcolor: 'primary.main',
                    }}
                  >
                    {getInitials(user?.displayName || 'You')}
                  </Avatar>
                )}
              </Box>
            );
          })
        )}
        {isPartnerTyping && (
          <Typography sx={styles.typingIndicator}>
            {t('chat.typing', { name: partnerName })}
          </Typography>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={styles.inputContainer}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('chat.placeholder')}
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          disabled={!socket}
          inputProps={{ maxLength: 1000 }}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || !socket}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}