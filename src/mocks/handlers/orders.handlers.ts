import { http, HttpResponse, delay } from 'msw';
import Decimal from 'decimal.js';
import { db } from '../db';
import { scenarios } from '../scenarios';
import { getUserIdFromRequest, requireAuth } from './auth.handlers';
import type { CreateOrderRequest } from '../../api/contracts';

function hashPayload(payload: unknown): string {
  return JSON.stringify(payload);
}

function resolveOrderUser(request: Request): { userId: string; errorResponse?: Response } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const auth = requireAuth(request);
    if (auth.errorResponse) return { userId: 'guest', errorResponse: auth.errorResponse };
    return { userId: auth.userId };
  }
  return { userId: getUserIdFromRequest(request) || 'guest' };
}

export const orderHandlers = [
  // POST */api/orders
  http.post('*/api/orders', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveOrderUser(request);
    if (errorResponse) return errorResponse;

    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (!idempotencyKey) {
      return HttpResponse.json(
        { error: { code: 'MISSING_IDEMPOTENCY_KEY', message: 'Cabeçalho Idempotency-Key é obrigatório.' } },
        { status: 400 }
      );
    }

    const body = (await request.json()) as CreateOrderRequest;

    if (!body.quoteId || !body.walletAddress || !body.network) {
      return HttpResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Dados incompletos para criação do pedido.' } },
        { status: 400 }
      );
    }

    const payloadHash = hashPayload(body);

    // 1. Verifica idempotência primeiro (para que replays da mesma chave não falhem por estoque consumido na 1ª tentativa)
    const existingIdempotent = db.findIdempotentOrder(idempotencyKey);
    if (existingIdempotent) {
      if (existingIdempotent.payloadHash !== payloadHash) {
        return HttpResponse.json(
          {
            error: {
              code: 'IDEMPOTENCY_CONFLICT',
              message: 'A chave de idempotência já foi utilizada anteriormente com um payload diferente.',
            },
          },
          { status: 409 }
        );
      }
      return HttpResponse.json(existingIdempotent.order, { status: 200 });
    }

    // 2. Recupera a cotação original (preservando quoteId e cupom aplicado)
    const savedQuote = db.getQuoteById(body.quoteId);
    if (!savedQuote) {
      return HttpResponse.json(
        { error: { code: 'QUOTE_NOT_FOUND', message: 'Cotação inválida ou não encontrada. Solicite uma nova cotação.' } },
        { status: 400 }
      );
    }

    if (new Date(savedQuote.expiresAt) < new Date()) {
      return HttpResponse.json(
        { error: { code: 'QUOTE_EXPIRED', message: 'A cotação expirou. Atualize o resumo do pedido.' } },
        { status: 409 }
      );
    }

    // 3. Cenários determinísticos de conflito (409)
    if (scenario.editionSoldOut) {
      return HttpResponse.json(
        {
          error: {
            code: 'AVAILABILITY_CONFLICT',
            message: 'Uma ou mais edições selecionadas esgotaram antes da confirmação.',
          },
        },
        { status: 409 }
      );
    }

    if (scenario.priceChangedInCart) {
      return HttpResponse.json(
        {
          error: {
            code: 'PRICE_CHANGED_CONFLICT',
            message: 'O preço de um ou mais itens foi alterado desde a geração da cotação.',
          },
        },
        { status: 409 }
      );
    }

    // 4. Valida disponibilidade e preço atual de cada item da cotação no banco
    for (const item of savedQuote.items) {
      const currentNft = db.findNFTById(item.nftId);
      if (!currentNft || !currentNft.isAvailable || currentNft.availableEditions < item.quantity) {
        return HttpResponse.json(
          {
            error: {
              code: 'AVAILABILITY_CONFLICT',
              message: `Estoque insuficiente ou item indisponível: ${item.name}`,
              details: { nftId: item.nftId, availableEditions: currentNft?.availableEditions ?? 0 },
            },
          },
          { status: 409 }
        );
      }

      if (!new Decimal(currentNft.priceEth).equals(new Decimal(item.priceEth))) {
        return HttpResponse.json(
          {
            error: {
              code: 'PRICE_CHANGED_CONFLICT',
              message: `O preço do NFT "${item.name}" mudou de ${item.priceEth} ETH para ${currentNft.priceEth} ETH.`,
              details: {
                updatedItems: [{ nftId: item.nftId, oldPrice: item.priceEth, newPrice: currentNft.priceEth }],
              },
            },
          },
          { status: 409 }
        );
      }
    }

    if (scenario.orderTimeout) {
      db.createOrder({
        userId,
        idempotencyKey,
        payloadHash,
        quotation: savedQuote,
        walletAddress: body.walletAddress,
        network: body.network,
        shouldFailPayment: false,
      });

      return HttpResponse.json(
        { error: { code: 'GATEWAY_TIMEOUT', message: 'A requisição excedeu o tempo limite do gateway.' } },
        { status: 504 }
      );
    }

    const result = db.createOrder({
      userId,
      idempotencyKey,
      payloadHash,
      quotation: savedQuote,
      walletAddress: body.walletAddress,
      network: body.network,
      shouldFailPayment: scenario.paymentFailed,
    });

    const status = result.isReplay ? 200 : 201;
    return HttpResponse.json(result.order, { status });
  }),

  // GET */api/orders/:id
  http.get('*/api/orders/:id', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveOrderUser(request);
    if (errorResponse) return errorResponse;

    const { id } = params;
    const order = db.findOrderById(String(id));

    if (!order || (order.userId !== userId && order.userId !== 'guest')) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `Pedido ${id} não encontrado.` } },
        { status: 404 }
      );
    }

    return HttpResponse.json(order);
  }),

  // GET */api/orders/:id/receipt
  http.get('*/api/orders/:id/receipt', async ({ request, params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { userId, errorResponse } = resolveOrderUser(request);
    if (errorResponse) return errorResponse;

    const { id } = params;
    const order = db.findOrderById(String(id));

    if (!order || (order.userId !== userId && order.userId !== 'guest') || !order.receipt) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `Recibo para o pedido ${id} não disponível.` } },
        { status: 404 }
      );
    }

    return HttpResponse.json(order.receipt);
  }),
];
