import { http, HttpResponse, delay } from 'msw';
import Decimal from 'decimal.js';
import { db, type CatalogPreferences } from '../db';
import { scenarios } from '../scenarios';

const CATEGORY_ALIASES: Record<string, string[]> = {
  'arte digital': ['arte digital', 'art'],
  art: ['arte digital', 'art'],
  fotografia: ['fotografia', 'photography'],
  photography: ['fotografia', 'photography'],
  jogos: ['jogos', 'gaming'],
  gaming: ['jogos', 'gaming'],
  'colecionáveis': ['colecionáveis', 'collectibles'],
  collectibles: ['colecionáveis', 'collectibles'],
  generativa: ['generativa', 'generativo'],
  generativo: ['generativa', 'generativo'],
};

export const nftHandlers = [

  http.get('*/api/nfts', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 220);

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
        limit: 9,
        totalPages: 0,
      });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase().trim() || '';
    const category = url.searchParams.get('category') || 'All';
    const network = url.searchParams.get('network') || 'All';
    const tab = url.searchParams.get('tab') || 'all';
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const sort = url.searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '9', 10));

    let nfts = db.getNFTs();

    if (tab === 'new') {
      nfts = nfts.filter((nft) => Boolean(nft.isNewLaunch));
    } else if (tab === 'trending') {
      nfts = nfts.filter((nft) => Boolean(nft.isTrending));
    }

    if (search) {
      nfts = nfts.filter((nft) => {
        const name = (nft.name || '').toLowerCase();
        const collection = (nft.collection || '').toLowerCase();
        const creator = (nft.creator?.name || '').toLowerCase();
        const category = (nft.category || '').toLowerCase();
        const network = (nft.network || '').toLowerCase();
        const description = (nft.description || '').toLowerCase();
        return (
          name.includes(search) ||
          collection.includes(search) ||
          creator.includes(search) ||
          category.includes(search) ||
          network.includes(search) ||
          description.includes(search)
        );
      });
    }

    if (category && category !== 'All') {
      const catLower = category.toLowerCase();
      const allowed = CATEGORY_ALIASES[catLower] || [catLower];
      nfts = nfts.filter((nft) => allowed.includes(nft.category.toLowerCase()));
    }

    if (network && network !== 'All') {
      nfts = nfts.filter((nft) => (nft.network || 'Ethereum').toLowerCase() === network.toLowerCase());
    }

    if (minPrice) {
      try {
        const minD = new Decimal(minPrice.replace(',', '.'));
        nfts = nfts.filter((nft) => new Decimal(nft.priceEth).greaterThanOrEqualTo(minD));
      } catch {

      }
    }
    if (maxPrice) {
      try {
        const maxD = new Decimal(maxPrice.replace(',', '.'));
        nfts = nfts.filter((nft) => new Decimal(nft.priceEth).lessThanOrEqualTo(maxD));
      } catch {

      }
    }

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

      if (minPrice && Number(minPrice.replace(',', '.')) > 0.05) {
        return new Decimal(a.priceEth).minus(new Decimal(b.priceEth)).toNumber();
      }
      if (maxPrice && Number(maxPrice.replace(',', '.')) < 12.4) {
        return new Decimal(b.priceEth).minus(new Decimal(a.priceEth)).toNumber();
      }

      const numA = parseInt(a.id.replace('nft-', ''), 10) || 999;
      const numB = parseInt(b.id.replace('nft-', ''), 10) || 999;
      return numA - numB;
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

  http.get('*/api/nfts/preferences', async () => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 120);
    return HttpResponse.json(db.getCatalogPreferences());
  }),

  http.put('*/api/nfts/preferences', async ({ request }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 150);
    const body = (await request.json()) as Partial<CatalogPreferences>;
    const updated = db.updateCatalogPreferences(body);
    return HttpResponse.json(updated);
  }),

  http.get('*/api/nfts/:id', async ({ params }) => {
    const scenario = scenarios.get();
    await delay(scenario.latencyMs > 0 ? scenario.latencyMs : 220);

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
