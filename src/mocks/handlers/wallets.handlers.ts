import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { requireAuth } from './auth.handlers';
import type { CreateWalletRequest, UpdateWalletRequest } from '../../api/contracts';

export const walletHandlers = [
  // GET */api/wallets
  http.get('*/api/wallets', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const wallets = db.getWallets(userId);

    return HttpResponse.json({ items: wallets });
  }),

  // POST */api/wallets
  http.post('*/api/wallets', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const body = (await request.json()) as CreateWalletRequest;

    if (!body.address || !body.label || !body.network) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Campos obrigatórios ausentes.' } },
        { status: 400 }
      );
    }

    const newWallet = db.addWallet(userId, body);
    return HttpResponse.json(newWallet, { status: 201 });
  }),

  // PATCH */api/wallets/:id
  http.patch('*/api/wallets/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const walletId = String(params.id);
    const body = (await request.json()) as UpdateWalletRequest;

    const updated = db.updateWallet(userId, walletId, body);
    if (!updated) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Carteira não encontrada.' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(updated);
  }),

  // DELETE */api/wallets/:id
  http.delete('*/api/wallets/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const walletId = String(params.id);

    const wallets = db.getWallets(userId);
    const target = wallets.find((w) => w.id === walletId);

    if (target?.isPrimary && wallets.length > 1) {
      return HttpResponse.json(
        { error: { code: 'CANNOT_DELETE_PRIMARY', message: 'Não é possível excluir a carteira primária. Defina outra como primária antes.' } },
        { status: 400 }
      );
    }

    const success = db.deleteWallet(userId, walletId);
    if (!success) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Carteira não encontrada.' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ success: true });
  }),
];
