import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { requireAuth } from './auth.handlers';

export const favoritesHandlers = [
  // GET */api/favorites
  http.get('*/api/favorites', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const items = db.getFavorites(userId);
    const nftIds = db.getFavoriteIds(userId);

    return HttpResponse.json({ items, nftIds });
  }),

  // POST */api/favorites/:id
  http.post('*/api/favorites/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    // Simulação determinística de erro transitório para comprovar Rollback da Mutação Otimista
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

  // DELETE */api/favorites/:id
  http.delete('*/api/favorites/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    // Simulação determinística de erro transitório para comprovar Rollback da Mutação Otimista
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
