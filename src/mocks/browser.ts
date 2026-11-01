import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
import { socketHandler } from './socket/socketHandler';

export const worker = setupWorker(...handlers, socketHandler);

export async function enableMocking(): Promise<ServiceWorkerRegistration | undefined> {
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}
