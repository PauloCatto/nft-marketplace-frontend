import { ws } from 'msw';
import { toSocketIo } from '@mswjs/socket.io-binding';
import Decimal from 'decimal.js';
import { db } from '../db';
import type { NftUpdatedEvent, OrderUpdatedEvent } from '../../api/contracts';

export const JUNGLE_WS_URL = 'wss://api.jungle.io';

export const jungleWs = ws.link(/socket\.io/);


const activeClients = new Set<ReturnType<typeof toSocketIo>>();

export const socketHandler = jungleWs.addEventListener('connection', (connection) => {
  const io = toSocketIo(connection);
  activeClients.add(io);

  connection.client.addEventListener('close', () => {
    activeClients.delete(io);
  });

  io.client.on('ping', () => {
    io.client.emit('pong', { timestamp: new Date().toISOString() });
  });

  
  io.client.on('trigger-nft-update', (_event, customPayload) => {
    const payload: NftUpdatedEvent = (customPayload as NftUpdatedEvent) || {
      nftId: 'nft-1',
      version: 2,
      priceEth: '0.500',
      isAvailable: true,
      availableEditions: 6,
      updatedAt: new Date().toISOString(),
    };
    emitMockNftUpdated(payload);
  });
});

export function emitMockNftUpdated(event: NftUpdatedEvent): void {
  
  const priceUsd = new Decimal(event.priceEth).times('3000').toFixed(2);
  db.updateNFT(event.nftId, {
    version: event.version,
    priceEth: event.priceEth,
    priceUsd,
    isAvailable: event.isAvailable,
    availableEditions: event.availableEditions,
    updatedAt: event.updatedAt,
  });

  for (const io of activeClients) {
    try {
      io.client.emit('nft.updated', event);
    } catch {
      activeClients.delete(io);
    }
  }
}

export function emitMockOrderUpdated(event: OrderUpdatedEvent): void {
  if (event.status === 'CONFIRMED' || event.status === 'REJECTED') {
    db.updateOrderStatus(event.orderId, event.status);
  }

  for (const io of activeClients) {
    try {
      io.client.emit('order.updated', event);
    } catch {
      activeClients.delete(io);
    }
  }
}
