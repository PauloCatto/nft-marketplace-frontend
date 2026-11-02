import { ws } from 'msw';
import Decimal from 'decimal.js';
import { db } from '../db';
import type { NftUpdatedEvent, OrderUpdatedEvent } from '../../api/contracts';

export const JUNGLE_WS_URL = 'wss://api.jungle.io';

export const jungleWs = ws.link(/api\.jungle\.io|socket\.io/);

const socketBus = new EventTarget();

export const socketHandler = jungleWs.addEventListener('connection', () => {});

export interface JungleSocketClient {
  on(event: 'nft.updated', listener: (payload: NftUpdatedEvent) => void): void;
  on(event: 'order.updated', listener: (payload: OrderUpdatedEvent) => void): void;
  on(event: 'connect', listener: () => void): void;
  disconnect(): void;
}

export function createJungleSocket(): JungleSocketClient {
  const cleanups: Array<() => void> = [];

  return {
    on(
      event: 'nft.updated' | 'order.updated' | 'connect',
      listener: ((payload: NftUpdatedEvent) => void) | ((payload: OrderUpdatedEvent) => void) | (() => void)
    ) {
      if (event === 'connect') {
        const timer = window.setTimeout(() => {
          (listener as () => void)();
        }, 10);
        cleanups.push(() => window.clearTimeout(timer));
        return;
      }

      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        (listener as (payload: unknown) => void)(customEvent.detail);
      };
      socketBus.addEventListener(event, handler);
      cleanups.push(() => socketBus.removeEventListener(event, handler));
    },
    disconnect() {
      while (cleanups.length > 0) {
        const fn = cleanups.pop();
        fn?.();
      }
    },
  };
}

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

  socketBus.dispatchEvent(new CustomEvent('nft.updated', { detail: event }));
}

export function emitMockOrderUpdated(event: OrderUpdatedEvent): void {
  if (event.status === 'CONFIRMED' || event.status === 'REJECTED') {
    db.updateOrderStatus(event.orderId, event.status);
  }

  socketBus.dispatchEvent(new CustomEvent('order.updated', { detail: event }));
}
