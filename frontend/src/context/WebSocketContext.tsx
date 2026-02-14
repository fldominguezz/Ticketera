import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
 connected: boolean;
 sendMessage: (action: string, room?: string, data?: any) => void;
 joinRoom: (room: string) => void;
 leaveRoom: (room: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
 const { user } = useAuth();
 const [connected, setConnected] = useState(false);
 const socketRef = useRef<WebSocket | null>(null);
 const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

 const connect = useCallback(() => {
  // Evitar múltiples conexiones concurrentes
  if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
   return;
  }

  const token = localStorage.getItem('access_token');
  if (!token) return;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  const wsUrl = `${protocol}//${host}/api/v1/ws/soc?token=${token}`;

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
   setConnected(true);
   if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
   }
  };

  ws.onmessage = (event) => {
   try {
    const data = JSON.parse(event.data);
    const customEvent = new CustomEvent('soc-notification', {
     detail: { type: data.type || 'generic', data: data.payload || data },
    });
    window.dispatchEvent(customEvent);
   } catch (e) {
    console.error('Error parsing WS message:', e);
   }
  };

  ws.onclose = () => {
   setConnected(false);
   socketRef.current = null;
   if (localStorage.getItem('access_token') && !reconnectTimeoutRef.current) {
    reconnectTimeoutRef.current = setTimeout(connect, 5000);
   }
  };

  ws.onerror = (error) => {
   console.error('WebSocket Error:', error);
   ws.close();
  };

  socketRef.current = ws;
 }, []);

 useEffect(() => {
  if (user) {
   connect();
  } else {
   if (socketRef.current) {
    socketRef.current.close();
    socketRef.current = null;
   }
  }

  return () => {
   if (socketRef.current) {
    socketRef.current.close();
    socketRef.current = null;
   }
   if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
   }
  };
 }, [user, connect]);

 const sendMessage = (action: string, room?: string, data?: any) => {
  if (socketRef.current?.readyState === WebSocket.OPEN) {
   socketRef.current.send(JSON.stringify({ action, room, ...data }));
  }
 };

 const joinRoom = (room: string) => sendMessage('join', room);
 const leaveRoom = (room: string) => sendMessage('leave', room);

 return (
  <WebSocketContext.Provider value={{ connected, sendMessage, joinRoom, leaveRoom }}>
   {children}
  </WebSocketContext.Provider>
 );
};

export const useWebSocket = () => {
 const context = useContext(WebSocketContext);
 if (!context) throw new Error('useWebSocket must be used within WebSocketProvider');
 return context;
};
