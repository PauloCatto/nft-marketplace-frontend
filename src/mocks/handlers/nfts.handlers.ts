import { http, HttpResponse, delay } from 'msw';
import Decimal from 'decimal.js';
import { db } from '../db';
import { scenarios } from '../scenarios';

export const nftHandlers = [
  // GET */api/nfts
  http.get('*/api/nfts', async ({ request }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    if (scenario.simulateHttp500OnCatalog) {
      return HttpResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao consultar catálogo de NFTs' } },
        { status: 500 }
      );
    }

    if (scenario.emptyCatalog) {
      return HttpResponse.json({
        items: [],
        total: 0,
        page: 1,
        limit: 8,
        totalPages: 0,
      });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const category = url.searchParams.get('category') || 'All';
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const sort = url.searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '8', 10));

    let nfts = db.getNFTs();

    // Filtro por busca (nome, coleção ou criador)
    if (search) {
      nfts = nfts.filter(
        (nft) =>
          nft.name.toLowerCase().includes(search) ||
          nft.collection.toLowerCase().includes(search) ||
          nft.creator.name.toLowerCase().includes(search)
      );
    }

    // Filtro por categoria
    if (category && category !== 'All') {
      nfts = nfts.filter((nft) => nft.category.toLowerCase() === category.toLowerCase());
    }

    // Filtro por faixa de preço
    if (minPrice) {
      try {
        const minD = new Decimal(minPrice);
        nfts = nfts.filter((nft) => new Decimal(nft.priceEth).greaterThanOrEqualTo(minD));
      } catch {
        // Ignora filtro inválido
      }
    }
    if (maxPrice) {
      try {
        const maxD = new Decimal(maxPrice);
        nfts = nfts.filter((nft) => new Decimal(nft.priceEth).lessThanOrEqualTo(maxD));
      } catch {
        // Ignora filtro inválido
      }
    }

    // Ordenação
    nfts.sort((a, b) => {
      if (sort === 'price_asc') {
        return new Decimal(a.priceEth).minus(new Decimal(b.priceEth)).toNumber();
      }
      if (sort === 'price_desc') {
        return new Decimal(b.priceEth).minus(new Decimal(a.priceEth)).toNumber();
      }
      if (sort === 'popular') {
        return b.likesCount - a.likesCount;
      }
      // 'newest' default
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const total = nfts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const items = nfts.slice(startIndex, startIndex + limit);

    return HttpResponse.json({
      items,
      total,
      page,
      limit,
      totalPages,
    });
  }),

  // GET */api/nfts/:id
  http.get('*/api/nfts/:id', async ({ params }) => {
    const scenario = scenarios.get();
    if (scenario.latencyMs > 0) await delay(scenario.latencyMs);

    const { id } = params;
    const nft = db.findNFTById(String(id));

    if (!nft) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `NFT com identificador ${id} não encontrado` } },
        { status: 404 }
      );
    }

    return HttpResponse.json(nft);
  }),
];
