import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { getUserIdFromRequest, requireAuth } from './auth.handlers';

function resolveFavoritesUser(request: Request): { userId: string; errorResponse?: Response } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = requireAuth(request);
    if (auth.errorResponse) return { userId: 'guest', errorResponse: auth.errorResponse };
    return { userId: auth.userId };
  }
  return { userId: getUserIdFromRequest(request) || 'guest' };
}

export const favoritesHandlers = [
  
  http.get('*/api/favorites', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveFavoritesUser(request);
    if (errorResponse) return errorResponse;

    const items = db.getFavorites(userId);
    const nftIds = db.getFavoriteIds(userId);

    return HttpResponse.json({ items, nftIds });
  }),

  
  http.post('*/api/favorites/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveFavoritesUser(request);
    if (errorResponse) return errorResponse;

    
    if (scenario.failFavorites) {
      return HttpResponse.json(
        { error: { code: 'TRANSIENT_FAILURE', message: 'Falha transitória ao favoritar NFT. Tente novamente.' } },
        { status: 500 }
      );
    }

    const nftId = String(params.id);

    const nft = db.findNFTById(nftId);
    if (!nft) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'NFT não encontrado' } },
        { status: 404 }
      );
    }

    const nftIds = db.addFavorite(userId, nftId);
    return HttpResponse.json({ success: true, nftIds }, { status: 201 });
  }),

  
  http.delete('*/api/favorites/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveFavoritesUser(request);
    if (errorResponse) return errorResponse;

    
    if (scenario.failFavorites) {
      return HttpResponse.json(
        { error: { code: 'TRANSIENT_FAILURE', message: 'Falha transitória ao remover favorito. Rollback ativado.' } },
        { status: 500 }
      );
    }

    const nftId = String(params.id);

    const nftIds = db.removeFavorite(userId, nftId);
    return HttpResponse.json({ success: true, nftIds });
  }),
];
