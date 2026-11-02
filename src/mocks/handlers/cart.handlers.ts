import { http, HttpResponse, delay } from 'msw';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { getUserIdFromRequest, requireAuth } from './auth.handlers';

function resolveCartUser(request: Request): { userId: string | undefined; errorResponse?: Response } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = requireAuth(request);
    if (auth.errorResponse) return { userId: undefined, errorResponse: auth.errorResponse };
    return { userId: auth.userId };
  }
  return { userId: getUserIdFromRequest(request) || undefined };
}

export const cartHandlers = [
  
  http.get('*/api/cart', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveCartUser(request);
    if (errorResponse) return errorResponse;

    const items = db.getCart(userId);
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

    return HttpResponse.json({ items, itemCount });
  }),
  
  http.post('*/api/cart/items', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveCartUser(request);
    if (errorResponse) return errorResponse;

    const body = (await request.json()) as { nftId?: string; quantity?: number };

    if (!body.nftId) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'nftId é obrigatório' } },
        { status: 400 }
      );
    }

    const { cart, error } = db.addToCart(userId, body.nftId, body.quantity || 1);
    if (error) {
      return HttpResponse.json(
        { error: { code: 'AVAILABILITY_CONFLICT', message: error } },
        { status: 409 }
      );
    }

    const itemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
    return HttpResponse.json({ items: cart, itemCount });
  }),
  
  http.patch('*/api/cart/items/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveCartUser(request);
    if (errorResponse) return errorResponse;

    const nftId = String(params.id);
    const body = (await request.json()) as { quantity?: number };

    if (body.quantity === undefined || body.quantity < 0) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Quantidade inválida' } },
        { status: 400 }
      );
    }

    const cart = db.updateCartQuantity(userId, nftId, body.quantity);
    const itemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
    return HttpResponse.json({ items: cart, itemCount });
  }),
  
  http.delete('*/api/cart/items/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveCartUser(request);
    if (errorResponse) return errorResponse;

    const nftId = String(params.id);

    const cart = db.removeFromCart(userId, nftId);
    const itemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
    return HttpResponse.json({ items: cart, itemCount });
  }),
  
  http.post('*/api/cart/merge', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const auth = requireAuth(request);
    if (auth.errorResponse) return auth.errorResponse;
    const { userId } = auth;

    const { mergedCart, removedUnavailable } = db.mergeGuestCart(userId);
    const itemCount = mergedCart.reduce((acc, i) => acc + i.quantity, 0);

    return HttpResponse.json({
      items: mergedCart,
      itemCount,
      removedUnavailable,
    });
  }),
  
  http.post('*/api/cart/quote', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 200);

    const { userId, errorResponse } = resolveCartUser(request);
    if (errorResponse) return errorResponse;

    if (scenario.priceChangedInCart) {
      return HttpResponse.json(
        {
          error: {
            code: 'PRICE_CHANGED_CONFLICT',
            message: 'O preço de um ou mais itens no carrinho foi atualizado em tempo real.',
            details: {
              updatedItems: [{ nftId: 'nft-2', oldPrice: '0.125', newPrice: '0.180' }],
            },
          },
        },
        { status: 409 }
      );
    }

    let couponCode: string | undefined;

    try {
      const body = (await request.json()) as { couponCode?: string };
      couponCode = body?.couponCode;
    } catch {
      
    }

    const { quote, error } = db.calculateQuote(userId, couponCode);

    if (error === 'CUPOM_INVALIDO') {
      return HttpResponse.json(
        { error: { code: 'INVALID_COUPON', message: 'Cupom de desconto inválido ou inexistente.' } },
        { status: 400 }
      );
    }
    if (error === 'CUPOM_EXPIRADO') {
      return HttpResponse.json(
        { error: { code: 'EXPIRED_COUPON', message: 'Este cupom de desconto expirou.' } },
        { status: 400 }
      );
    }

    return HttpResponse.json(quote);
  }),
];
