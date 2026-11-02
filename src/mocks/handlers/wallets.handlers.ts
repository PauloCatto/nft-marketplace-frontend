import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { getUserIdFromRequest, requireAuth } from './auth.handlers';
import type { CreateWalletRequest, UpdateWalletRequest } from '../../api/contracts';

function resolveWalletUser(request: Request): { userId: string; errorResponse?: Response } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = requireAuth(request);
    if (auth.errorResponse) return { userId: 'user-kurio', errorResponse: auth.errorResponse };
    return { userId: auth.userId };
  }
  return { userId: getUserIdFromRequest(request) || 'user-kurio' };
}

export const walletHandlers = [
  
  http.get('*/api/wallets', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveWalletUser(request);
    if (errorResponse) return errorResponse;

    const wallets = db.getWallets(userId);

    return HttpResponse.json({ items: wallets });
  }),
  
  http.post('*/api/wallets', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveWalletUser(request);
    if (errorResponse) return errorResponse;

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
  
  http.patch('*/api/wallets/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveWalletUser(request);
    if (errorResponse) return errorResponse;

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
  
  http.delete('*/api/wallets/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveWalletUser(request);
    if (errorResponse) return errorResponse;

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
