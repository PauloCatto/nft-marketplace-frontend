import { useEffect, useRef, useState, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { JUNGLE_WS_URL } from '../mocks/socket/socketHandler';
import type { NftUpdatedEvent, OrderUpdatedEvent } from '../api/contracts';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(JUNGLE_WS_URL, {
      transports: ['websocket'], 
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket>(getSocket());

  
  const versionsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      setIsConnected(true);
      setLastError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (err: Error) => {
      setLastError(err.message);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);

    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []);

  const onNftUpdated = useCallback((callback: (event: NftUpdatedEvent) => void) => {
    const socket = socketRef.current;

    const handler = (event: NftUpdatedEvent) => {
      
      const lastVersion = versionsRef.current.get(`nft:${event.nftId}`) || 0;
      if (event.version <= lastVersion) {
        return;
      }
      versionsRef.current.set(`nft:${event.nftId}`, event.version);
      callback(event);
    };

    socket.on('nft.updated', handler);
    return () => {
      socket.off('nft.updated', handler);
    };
  }, []);

  const onOrderUpdated = useCallback((callback: (event: OrderUpdatedEvent) => void) => {
    const socket = socketRef.current;

    const handler = (event: OrderUpdatedEvent) => {
      const lastVersion = versionsRef.current.get(`order:${event.orderId}`) || 0;
      if (event.version <= lastVersion) {
        return;
      }
      versionsRef.current.set(`order:${event.orderId}`, event.version);
      callback(event);
    };

    socket.on('order.updated', handler);
    return () => {
      socket.off('order.updated', handler);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    lastError,
    onNftUpdated,
    onOrderUpdated,
  };
}
