import React, { createContext, useContext, useEffect, useState } from 'react';
import { wsClient } from '../api/websocket';
import { useAuthStore } from '../store/authStore';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('auth_token') || undefined;
      // Connect when authenticated
      wsClient.connect(token);
      setIsConnected(true); // Optimistic, ideally we'd track actual connection state from the class

      return () => {
        wsClient.disconnect();
        setIsConnected(false);
      };
    }
  }, [isAuthenticated]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};
