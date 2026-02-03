import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/auth-context';

let socketInstance: Socket | null = null;

export function useSocket(): Socket | null {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(socketInstance);

  useEffect(() => {
    // Only connect if authenticated and token exists
    if (!isAuthenticated || !token) {
      // Disconnect existing socket if user logged out
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        setSocket(null);
      }
      return;
    }

    // Reuse existing socket if already connected
    if (socketInstance?.connected) {
      setSocket(socketInstance);
      return;
    }

    // Create new socket connection
    // In dev mode, use relative path to benefit from Vite proxy
    // In production, the client and server are on the same origin
    const newSocket = io({
      auth: {
        token,
      },
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socketInstance = newSocket;
    setSocket(newSocket);

    return () => {
      // Don't disconnect on component unmount, keep connection alive
      // Socket will be disconnected when user logs out
    };
  }, [token, isAuthenticated]);

  return socket;
}
