import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '../context/auth-context';
import { initializeSocket, disconnectSocket, subscribeToSocket, getSocket } from '../services/socket-service';

export function useSocket(): Socket | null {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(getSocket());

  useEffect(() => {
    // Only connect if authenticated and token exists
    if (!isAuthenticated || !token) {
      disconnectSocket();
      return;
    }

    // Initialize or get existing socket
    initializeSocket(token);

    // Subscribe to socket changes (connect/disconnect/init)
    const unsubscribe = subscribeToSocket((newSocket) => {
      setSocket(newSocket);
    });

    return () => {
      unsubscribe();
    };
  }, [token, isAuthenticated]);

  return socket;
}
