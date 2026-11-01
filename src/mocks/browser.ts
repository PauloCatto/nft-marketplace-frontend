import { setupWorker } from 'msw/browser'

export const worker = setupWorker()

export async function enableMocking(): Promise<ServiceWorkerRegistration | undefined> {
  // Always enable MSW in dev and demo builds as required by the challenge specification
  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
