import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import {
  catalogQuerySchema,
  type CatalogQueryParams,
  type NFT,
  type NFTListResponse,
  type NftUpdatedEvent,
} from '../api/contracts';
import { JUNGLE_WS_URL } from '../mocks/socket/socketHandler';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogQueryParams => {
    const parsed = catalogQuerySchema.safeParse(search);
    if (parsed.success) {
      return parsed.data;
    }
    return {
      search: '',
      category: 'All',
      network: 'All',
      tab: 'all',
      sort: 'newest',
      page: 1,
      limit: 9,
    };
  },
  component: HomeDiscoveryPage,
});

const COLLECTION_FILTERS = [
  { name: 'Arte digital', count: 33 },
  { name: 'Fotografia', count: 12 },
  { name: 'Música', count: 65 },
  { name: 'Arte 3D', count: 39 },
  { name: 'Colecionáveis', count: 23 },
  { name: 'Generativo', count: 17 },
  { name: 'Jogos', count: 19 },
  { name: 'Assinaturas', count: 13 },
  { name: 'Utilidade', count: 18 },
];

const NETWORK_FILTERS = [
  { name: 'Ethereum', count: 119 },
  { name: 'Polygon', count: 78 },
  { name: 'Solana', count: 86 },
];

const HERO_SLIDES = [
  {
    id: 'nft-1',
    subtitle: 'Bem-vindo à Kurio',
    titleLine1: 'SEJA DONO DO FUTURO',
    titleLine2: 'DA ARTE DIGITAL',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    imageUrl: '/assets/nfts/emerald-ape.png',
    imageAlt: 'Emerald Ape #042 — Macaco com óculos escuros redondos e jaqueta verde',
  },
  {
    id: 'nft-2',
    subtitle: 'Coleção em Destaque',
    titleLine1: 'SANTUÁRIO NOMAD',
    titleLine2: 'EDIÇÃO GÊNESIS',
    description:
      'Obras digitais raras criadas com estética orgânica e benefícios exclusivos para colecionadores verificados na rede.',
    imageUrl: '/assets/nfts/sage-nomad-featured.png',
    imageAlt: 'Sage Nomad #009 — Macaco com chapéu bucket verde-oliva e moletom roxo',
  },
  {
    id: 'nft-3',
    subtitle: 'Curadoria Kurio',
    titleLine1: 'BARON SYNDICATE',
    titleLine2: 'ARTE 3D AUTORAL',
    description:
      'Retratos tridimensionais esculpidos com precisão, autenticidade verificada em blockchain e tiragem estritamente limitada.',
    imageUrl: '/assets/nfts/ivory-baron.png',
    imageAlt: 'Neon Vessel #552 — Macaco com blazer marfim e gola alta verde-escura',
  },
];

const EDITORIAL_POSTS = [
  {
    id: 'post-1',
    date: '12 de setembro',
    readTime: 'Leitura de 4 min',
    title: 'Como funciona a propriedade de NFTs',
    excerpt: 'Aprenda a autenticar, negociar e custodiar ativos digitais.',
    imageUrl: '/assets/nfts/ivory-baron.png',
  },
  {
    id: 'post-2',
    date: '15 de setembro',
    readTime: 'Leitura de 3 min',
    title: '10 artistas digitais para acompanhar',
    excerpt: 'Conheça criadores que moldam a estética e cultura digital.',
    imageUrl: '/assets/nfts/emerald-ape.png',
  },
  {
    id: 'post-3',
    date: '18 de setembro',
    readTime: 'Leitura de 5 min',
    title: 'Raridade, atributos e procedência',
    excerpt: 'Entenda camadas, procedência, listas de acesso e utilidades.',
    imageUrl: '/assets/nfts/sage-nomad-featured.png',
  },
  {
    id: 'post-4',
    date: '22 de setembro',
    readTime: 'Leitura de 4 min',
    title: 'Como proteger sua carteira',
    excerpt: 'Proteja sua carteira, seed phrase e sua identidade.',
    imageUrl: '/assets/nfts/golden-beat.png',
  },
];

function formatPriceLabel(val: number): string {
  return val.toFixed(2).replace('.', ',');
}

function HomeDiscoveryPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();

  const activeCategory = searchParams.category || 'All';
  const activeNetwork = searchParams.network || 'All';
  const activeTab = searchParams.tab || 'all';
  const activeSort = searchParams.sort || 'newest';
  const activePage = Number(searchParams.page) || 1;
  const activeSearch = searchParams.search || '';

  const [heroIndex, setHeroIndex] = useState(0);
  const [minPriceInput, setMinPriceInput] = useState<number>(
    searchParams.minPrice ? Number(searchParams.minPrice) : 0.02
  );
  const [maxPriceInput, setMaxPriceInput] = useState<number>(
    searchParams.maxPrice ? Number(searchParams.maxPrice) : 12.5
  );

  // Sync local price inputs when URL changes externally (e.g. Back/Forward navigation)
  useEffect(() => {
    setMinPriceInput(searchParams.minPrice ? Number(searchParams.minPrice) : 0.02);
    setMaxPriceInput(searchParams.maxPrice ? Number(searchParams.maxPrice) : 12.5);
  }, [searchParams.minPrice, searchParams.maxPrice]);

  // Real-time Socket.IO reconciliation for catalog NFTs
  useEffect(() => {
    const socket = io(JUNGLE_WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('nft.updated', (event: NftUpdatedEvent) => {
      queryClient.setQueriesData<NFTListResponse>({ queryKey: ['nfts'] }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((nft) => {
            if (nft.id === event.nftId && event.version > (nft.version || 0)) {
              return {
                ...nft,
                version: event.version,
                priceEth: event.priceEth,
                isAvailable: event.isAvailable,
                availableEditions: event.availableEditions,
                updatedAt: event.updatedAt,
              };
            }
            return nft;
          }),
        };
      });
      toast.info(`Atualização em tempo real: preço/estoque de ${event.nftId} sincronizado.`);
    });

    socket.on('connect', () => {
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  // Fetch NFTs catalog with AbortSignal to cancel obsolete requests
  const {
    data: catalogData,
    isLoading,
    isError,
    refetch,
  } = useQuery<NFTListResponse>({
    queryKey: [
      'nfts',
      {
        search: activeSearch,
        category: activeCategory,
        network: activeNetwork,
        tab: activeTab,
        minPrice: searchParams.minPrice,
        maxPrice: searchParams.maxPrice,
        sort: activeSort,
        page: activePage,
        limit: 9,
      },
    ],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<NFTListResponse>('/nfts', {
        signal,
        params: {
          search: activeSearch || undefined,
          category: activeCategory !== 'All' ? activeCategory : undefined,
          network: activeNetwork !== 'All' ? activeNetwork : undefined,
          tab: activeTab !== 'all' ? activeTab : undefined,
          minPrice: searchParams.minPrice,
          maxPrice: searchParams.maxPrice,
          sort: activeSort,
          page: activePage,
          limit: 9,
        },
      });
      return res.data;
    },
  });

  // URL Filter Updaters (always reset page to 1 when filters change)
  const updateFilters = (partial: Partial<CatalogQueryParams>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...partial,
        page: partial.page !== undefined ? partial.page : 1,
      }),
    });
  };

  const handleApplyPriceRange = () => {
    const low = Math.min(minPriceInput, maxPriceInput);
    const high = Math.max(minPriceInput, maxPriceInput);
    updateFilters({
      minPrice: low.toFixed(2),
      maxPrice: high.toFixed(2),
      page: 1,
    });
  };

  const handleResetAllFilters = () => {
    setMinPriceInput(0.02);
    setMaxPriceInput(12.5);
    navigate({
      search: {
        search: '',
        category: 'All',
        network: 'All',
        tab: 'all',
        sort: 'newest',
        page: 1,
        limit: 9,
      },
    });
  };

  const activeHero = HERO_SLIDES[heroIndex] || HERO_SLIDES[0];
  const totalPages = Math.max(1, catalogData?.totalPages || 4);

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      {/* Figma Container: width 1440px, padding 16px 120px 24px */}
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-6 flex flex-col">
        {/* 1. HEADER */}
        <Header
          searchValue={activeSearch}
          onSearchSubmit={(query) => updateFilters({ search: query, page: 1 })}
        />

        {/* 2. HERO BANNER (24px below navbar border line, matching Figma screenshot) */}
        <section
          aria-label="Destaque principal"
          className="w-full mt-6 mb-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start"
        >
          {/* Left Text Column */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full pt-7 pb-4">
            <div className="flex flex-col items-start">
              <span className="text-[#C2B2A6] text-xs mb-3 tracking-wide">
                {activeHero.subtitle}
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-extrabold uppercase leading-[1.22] tracking-tight text-[#FAF5F0] mb-4">
                <span className="block">{activeHero.titleLine1}</span>
                <span className="block mt-1">{activeHero.titleLine2}</span>
              </h1>
              <p className="text-[#B5A395] text-xs leading-relaxed max-w-[490px] mb-7">
                {activeHero.description}
              </p>
              <button
                type="button"
                onClick={() => {
                  document.getElementById('catalogo-nfts')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-[11px] uppercase tracking-wider px-7 py-3 rounded-md transition-colors cursor-pointer"
              >
                EXPLORAR
              </button>
            </div>

            {/* Carousel Dots aligned to bottom-right of left column as in Figma */}
            <div
              role="tablist"
              aria-label="Slides em destaque"
              className="flex items-center justify-end gap-2 mt-6 lg:mt-8 pr-6"
            >
              {HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={heroIndex === idx}
                  aria-label={`Mostrar destaque ${idx + 1}: ${slide.titleLine1}`}
                  onClick={() => setHeroIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                    heroIndex === idx
                      ? 'bg-[#D1823C] scale-110'
                      : 'bg-[#D1823C]/40 hover:bg-[#D1823C]/75'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Right Artwork Column (397x397 matching frame-hero.png) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[397px] aspect-square rounded-[20px] overflow-hidden shadow-2xl">
              <img
                src={activeHero.imageUrl}
                alt={activeHero.imageAlt}
                width={397}
                height={397}
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* Remaining sections wrapped with consistent vertical spacing */}
        <div className="flex flex-col gap-16 lg:gap-20">

        {/* 3. MARKETPLACE SECTION: 1200 Fill x 1373 Hug (Sidebar aligned flush with 3x3 Grid) */}
        <section
          id="catalogo-nfts"
          aria-label="Catálogo de NFTs e Filtros"
          className="w-full flex flex-col"
        >
          {/* Main 2-Column Row: Sidebar stretches to the exact height of the 3x3 grid (Figma alignment) */}
          <div className="w-full flex flex-col lg:flex-row lg:items-stretch gap-6 lg:gap-8">
            {/* LEFT SIDEBAR: filter box grows; NFT em destaque bottom aligns with the 3rd row of the grid */}
            <aside className="w-full lg:w-[260px] shrink-0 flex flex-col gap-5">
              {/* Dark Filter Box */}
              <div className="bg-[#1F1510] border border-[#2C1E16] rounded-lg p-4 flex flex-col justify-between gap-5 lg:flex-1">
                {/* Coleções */}
                <div>
                  <h2 className="text-[#FAF5F0] font-bold text-xs mb-2.5">Coleções</h2>
                  <ul className="space-y-1.5">
                    {COLLECTION_FILTERS.map((col) => {
                      const isSelected = activeCategory.toLowerCase() === col.name.toLowerCase();
                      return (
                        <li key={col.name}>
                          <button
                            type="button"
                            onClick={() =>
                              updateFilters({
                                category: isSelected ? 'All' : col.name,
                                page: 1,
                              })
                            }
                            aria-pressed={isSelected}
                            className={`w-full flex items-center justify-between text-[11px] py-0.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-[#D1823C] font-bold'
                                : 'text-[#B5A395] hover:text-[#FAF5F0]'
                            }`}
                          >
                            <span>{col.name}</span>
                            <span
                              className={
                                isSelected ? 'text-[#D1823C] font-bold' : 'text-[#8C7A6B]'
                              }
                            >
                              ({col.count})
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Faixa de preço */}
                <div>
                  <h2 className="text-[#FAF5F0] font-bold text-xs mb-2.5">Faixa de preço</h2>
                  <div className="flex flex-col gap-2.5">
                    {/* Visual Dual-Thumb Track + Range Inputs */}
                    <div className="relative h-4 flex items-center">
                      <div className="w-full h-1 bg-[#3D2A1E] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#D1823C]"
                          style={{
                            marginLeft: `${Math.min(100, (minPriceInput / 12.5) * 100)}%`,
                            width: `${Math.max(
                              5,
                              ((maxPriceInput - minPriceInput) / 12.5) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        aria-label="Preço mínimo em ETH"
                        min={0.02}
                        max={12.5}
                        step={0.05}
                        value={minPriceInput}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMinPriceInput(Math.min(val, maxPriceInput));
                        }}
                        className="kurio-range absolute inset-0 w-full h-full"
                      />
                      <input
                        type="range"
                        aria-label="Preço máximo em ETH"
                        min={0.02}
                        max={12.5}
                        step={0.05}
                        value={maxPriceInput}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setMaxPriceInput(Math.max(val, minPriceInput));
                        }}
                        className="kurio-range absolute inset-0 w-full h-full"
                      />
                    </div>

                    <div className="text-[10px] text-[#C2B2A6]">
                      Preço: {formatPriceLabel(minPriceInput)} – {formatPriceLabel(maxPriceInput)} ETH
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyPriceRange}
                      className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-3.5 py-1 rounded w-fit transition-colors cursor-pointer"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                {/* Rede */}
                <div>
                  <h2 className="text-[#FAF5F0] font-bold text-xs mb-2.5">Rede</h2>
                  <ul className="space-y-1.5">
                    {NETWORK_FILTERS.map((net) => {
                      const isSelected = activeNetwork.toLowerCase() === net.name.toLowerCase();
                      return (
                        <li key={net.name}>
                          <button
                            type="button"
                            onClick={() =>
                              updateFilters({
                                network: isSelected ? 'All' : net.name,
                                page: 1,
                              })
                            }
                            aria-pressed={isSelected}
                            className={`w-full flex items-center justify-between text-[11px] py-0.5 transition-colors cursor-pointer ${
                              isSelected
                                ? 'text-[#D1823C] font-bold'
                                : 'text-[#B5A395] hover:text-[#FAF5F0]'
                            }`}
                          >
                            <span>{net.name}</span>
                            <span
                              className={
                                isSelected ? 'text-[#D1823C] font-bold' : 'text-[#8C7A6B]'
                              }
                            >
                              ({net.count})
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>

              {/* NFT EM DESTAQUE / OFERTA LIMITADA (image bottom flush with bottom of grid row 3) */}
              <div className="flex flex-col shrink-0">
                <span className="text-[#D1823C] font-extrabold text-sm uppercase tracking-wide">
                  NFT EM DESTAQUE
                </span>
                <span className="text-[#FAF5F0] font-bold text-xs uppercase tracking-wide text-center mt-1 mb-2.5">
                  OFERTA LIMITADA
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: '/mercado',
                      search: { id: 'nft-2' },
                    })
                  }
                  aria-label="Ver oferta limitada Sage Nomad #009"
                  className="w-full rounded-[14px] overflow-hidden hover:ring-2 hover:ring-[#D1823C] transition-all cursor-pointer"
                >
                  <img
                    src="/assets/nfts/sage-nomad-featured.png"
                    alt="NFT em destaque: Sage Nomad #009"
                    width={260}
                    height={305}
                    loading="lazy"
                    className="w-full aspect-[310/364] object-cover"
                  />
                </button>
              </div>
            </aside>

            {/* RIGHT CATALOG CONTENT (Starts immediately at top, matching Figma screenshot) */}
            <div className="flex-1 min-w-0 w-full flex flex-col justify-start gap-4">
              {/* Top Tabs & Sort Controls (Always on a single line at 100% zoom on desktop) */}
              <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center justify-between gap-2 pb-1">
                {/* Left Tabs (Single line with whitespace-nowrap) */}
                <div
                  role="tablist"
                  aria-label="Categorias de listagem"
                  className="flex items-center gap-3.5 shrink-0"
                >
                  {[
                    { id: 'all', label: 'Todos os NFTs' },
                    { id: 'new', label: 'Novos lançamentos' },
                    { id: 'trending', label: 'Em alta' },
                  ].map((tabItem) => {
                    const isActive = activeTab === tabItem.id;
                    return (
                      <button
                        key={tabItem.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() =>
                          updateFilters({
                            tab: tabItem.id as 'all' | 'new' | 'trending',
                            page: 1,
                          })
                        }
                        className={`relative pb-1.5 text-[11px] whitespace-nowrap font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'text-[#D1823C] font-bold'
                            : 'text-[#FAF5F0] hover:text-[#D1823C]'
                        }`}
                      >
                        {tabItem.label}
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D1823C]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Sort Dropdown */}
                <div className="flex items-center gap-1 text-[11px] text-[#C2B2A6] shrink-0 whitespace-nowrap">
                  <label htmlFor="catalog-sort-select" className="whitespace-nowrap">
                    Ordenar por:
                  </label>
                  <select
                    id="catalog-sort-select"
                    value={activeSort}
                    onChange={(e) =>
                      updateFilters({
                        sort: e.target.value as CatalogQueryParams['sort'],
                        page: 1,
                      })
                    }
                    className="bg-[#140D0A] text-[#FAF5F0] font-normal text-[11px] border-none rounded px-0.5 py-0.5 outline-none cursor-pointer"
                  >
                    <option value="newest">Listados recentemente</option>
                    <option value="price_asc">Menor preço (ETH)</option>
                    <option value="price_desc">Maior preço (ETH)</option>
                    <option value="popular">Mais populares</option>
                  </select>
                </div>
              </div>

              {/* LOADING STATE: Shimmer Skeletons preserving exact 3x3 layout dimensions */}
              {isLoading && (
                <div
                  aria-busy="true"
                  aria-label="Carregando catálogo de NFTs"
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-7 gap-y-9"
                >
                  {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx} className="flex flex-col">
                      <div className="w-full aspect-[193/223] skeleton-shimmer" />
                      <div className="h-4 w-2/3 rounded skeleton-shimmer mt-3" />
                      <div className="h-4 w-1/3 rounded skeleton-shimmer mt-2" />
                    </div>
                  ))}
                </div>
              )}

              {/* ERROR STATE */}
              {!isLoading && isError && (
                <div
                  role="alert"
                  className="bg-[#1F1510] border border-red-500/30 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4 my-4"
                >
                  <AlertCircle className="w-10 h-10 text-red-400" />
                  <div>
                    <h3 className="text-[#FAF5F0] font-bold text-base">
                      Falha ao carregar o catálogo de NFTs
                    </h3>
                    <p className="text-[#A8968A] text-xs mt-1 max-w-md">
                      Ocorreu um erro ao consultar a API. Verifique sua conexão ou tente novamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-5 py-2.5 rounded-md transition-colors cursor-pointer"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* EMPTY STATE */}
              {!isLoading && !isError && catalogData && catalogData.items.length === 0 && (
                <div className="bg-[#1F1510] border border-[#2E2018] rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4 my-4">
                  <p className="text-[#FAF5F0] font-bold text-base">
                    Nenhum NFT encontrado com os filtros selecionados
                  </p>
                  <p className="text-[#A8968A] text-xs max-w-md">
                    Experimente ajustar a faixa de preço, selecionar outra coleção ou limpar os filtros ativos.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-5 py-2.5 rounded-md transition-colors cursor-pointer"
                  >
                    Restaurar catálogo completo
                  </button>
                </div>
              )}

              {/* 3x3 NFT GRID (Clean cards without floating icons, matching Figma) */}
              {!isLoading && !isError && catalogData && catalogData.items.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-7 gap-y-9">
                  {catalogData.items.map((nft: NFT) => (
                    <article
                      key={nft.id}
                      data-testid={`nft-card-${nft.id}`}
                      className="flex flex-col group"
                    >
                      {/* Exact Figma Card Frame (193x223 proportion from frame-grid.png) */}
                      <div className="relative transition-transform duration-200 group-hover:-translate-y-1">
                        <div
                          onClick={() =>
                            navigate({
                              to: '/mercado',
                              search: { id: nft.id },
                            })
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate({
                                to: '/mercado',
                                search: { id: nft.id },
                              });
                            }
                          }}
                          aria-label={`Ver detalhes de ${nft.name}, preço ${nft.priceEth} ETH`}
                          className={`w-full aspect-[193/223] overflow-hidden relative cursor-pointer bg-[#24160F] ${
                            nft.id === 'nft-7' || nft.id === 'nft-8'
                              ? 'pt-[14px] pb-[14px] px-[8px] flex items-center justify-center'
                              : ''
                          }`}
                        >
                          <img
                            src={nft.imageUrl}
                            alt={`${nft.name} da coleção ${nft.collection}`}
                            width={193}
                            height={223}
                            loading="lazy"
                            className={
                              nft.id === 'nft-7' || nft.id === 'nft-8'
                                ? 'w-full h-full object-cover rounded-[12px]'
                                : 'w-full h-full object-cover'
                            }
                          />
                        </div>
                      </div>

                        {/* NFT Name & Price below frame (matches Figma where 8th card has empty caption space) */}
                        {nft.id !== 'nft-8' ? (
                          <>
                            <h3 className="text-[#FAF5F0] text-xs sm:text-[13px] font-medium mt-3 truncate">
                              {nft.name}
                            </h3>
                            <div className="flex items-center gap-2.5 mt-1 text-xs sm:text-[13px]">
                              <span className="text-[#D1823C] font-extrabold">
                                {nft.priceEth} ETH
                              </span>
                              {nft.originalPriceEth && (
                                <span className="text-[#9E8C7E] line-through font-normal">
                                  {nft.originalPriceEth} ETH
                                </span>
                              )}
                            </div>
                          </>
                      ) : (
                        <div aria-hidden="true" className="h-[44px] mt-3" />
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PAGINATION BAR (Aligned bottom-right below the 3x3 Grid & Oferta Limitada line, inside the 1200x1373 section) */}
          {!isLoading && !isError && catalogData && catalogData.totalPages > 0 && (
            <nav
              aria-label="Paginação do catálogo"
              className="flex items-center justify-end gap-2 pt-10"
            >
              {Array.from({ length: Math.min(4, totalPages) }, (_, idx) => {
                const pageNum = idx + 1;
                const isCurrent = activePage === pageNum;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    aria-current={isCurrent ? 'page' : undefined}
                    aria-label={`Página ${pageNum}`}
                    onClick={() => updateFilters({ page: pageNum })}
                    className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#D1823C] text-[#140D0A]'
                        : 'border border-[#4A3322] text-[#FAF5F0] hover:border-[#D1823C] hover:text-[#D1823C]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Próxima página"
                disabled={activePage >= totalPages}
                onClick={() => updateFilters({ page: Math.min(totalPages, activePage + 1) })}
                className="w-8 h-8 rounded border border-[#4A3322] text-[#FAF5F0] hover:border-[#D1823C] hover:text-[#D1823C] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </nav>
          )}
        </section>

        {/* 4. TWO PROMOTIONAL FEATURE BANNERS (Compact 168px height matching Figma screenshot) */}
        <section
          id="destaques-criadores"
          aria-label="Coleções e lançamentos em destaque"
          className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Left Banner */}
          <div className="bg-[#24160F] rounded-[10px] overflow-hidden flex flex-col sm:flex-row items-stretch justify-between sm:h-[168px]">
            <div className="w-full sm:w-[196px] sm:h-[168px] shrink-0 overflow-hidden">
              <img
                src="/assets/nfts/banner-left-ape.png"
                alt="Lançamentos gênesis de edição limitada"
                width={196}
                height={168}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col items-end text-right justify-center flex-1 px-5 py-3.5">
              <h2 className="text-[#FAF5F0] font-bold text-xs sm:text-[13px] leading-snug mb-1.5 whitespace-nowrap">
                Lançamentos gênesis
                <br />
                de edição limitada
              </h2>
              <p className="text-[#B5A395] text-[10.5px] leading-[1.45] mb-3 max-w-[240px]">
                Colecione edições escassas diretamente dos criadores antes da revelação pública.
              </p>
              <button
                type="button"
                onClick={() => {
                  updateFilters({ tab: 'new', page: 1 });
                  document.getElementById('catalogo-nfts')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-[5px] transition-colors cursor-pointer"
              >
                <span>Explorar</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          {/* Right Banner */}
          <div className="bg-[#24160F] rounded-[10px] overflow-hidden flex flex-col sm:flex-row items-stretch justify-between sm:h-[168px]">
            <div className="w-full sm:w-[196px] sm:h-[168px] shrink-0 overflow-hidden">
              <img
                src="/assets/nfts/banner-right-ape.png"
                alt="Arte digital selecionada e muito mais"
                width={196}
                height={168}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col items-end text-right justify-center flex-1 px-5 py-3.5">
              <h2 className="text-[#FAF5F0] font-bold text-xs sm:text-[13px] leading-snug mb-1.5 whitespace-nowrap">
                Arte digital selecionada
                <br />e muito mais
              </h2>
              <p className="text-[#B5A395] text-[10.5px] leading-[1.45] mb-3 max-w-[240px]">
                Explore novos artistas, coleções verificadas e obras digitais que definem a
              </p>
              <button
                type="button"
                onClick={() => {
                  updateFilters({ category: 'Arte digital', page: 1 });
                  document.getElementById('catalogo-nfts')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-[5px] transition-colors cursor-pointer"
              >
                <span>Explorar</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* 5. DIÁRIO DA CUNHAGEM (EDITORIAL SECTION) */}
        <section
          id="diario-cunhagem"
          aria-label="Diário da Cunhagem"
          className="w-full flex flex-col items-center"
        >
          <div className="text-center max-w-2xl mb-10">
            <h2 className="text-[#FAF5F0] font-bold text-xl sm:text-2xl mb-2.5">
              Diário da Cunhagem
            </h2>
            <p className="text-[#A8968A] text-xs sm:text-[13px]">
              Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {EDITORIAL_POSTS.map((post) => (
              <article
                key={post.id}
                className="bg-[#1F1510] border border-[#2C1E16] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#D1823C]/40 transition-colors"
              >
                <div>
                  <div className="w-full aspect-[4/3] overflow-hidden bg-[#140D0A]">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      width={280}
                      height={210}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="text-[#D1823C] text-[10px] font-medium">
                      {post.date} &nbsp;|&nbsp; {post.readTime}
                    </div>
                    <h3 className="text-[#FAF5F0] font-bold text-xs sm:text-[13px] leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-[#A8968A] text-[11px] leading-relaxed">{post.excerpt}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        `Artigo "${post.title}": páginas editoriais estão fora do escopo transacional da entrega.`
                      )
                    }
                    className="inline-flex items-center gap-1 text-[#C2B2A6] hover:text-[#D1823C] text-[11px] font-semibold transition-colors cursor-pointer"
                  >
                    <span>Ler mais</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* 6. FOOTER */}
        <Footer
          onSelectCategory={(category) => updateFilters({ category, page: 1 })}
        />
        </div>
      </div>
    </div>
  );
}
