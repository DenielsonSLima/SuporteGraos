
import React, { createContext, useContext, useEffect, useState } from 'react';
import { wsService } from '../services/websocket';

interface WebSocketContextData {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (channel: string, data: any) => void;
  subscribe: (channel: string, callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextData>({} as WebSocketContextData);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    wsService.connect();
    setIsConnected(true);

    const unsubscribe = wsService.subscribe('system', (data) => {
      setLastMessage(data);
      if (data.type === 'pong') setIsConnected(true);
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
      setIsConnected(false);
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ 
      isConnected, 
      lastMessage, 
      sendMessage: wsService.send.bind(wsService),
      subscribe: wsService.subscribe.bind(wsService)
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return context;
};
