import { useEffect, useState } from 'react';
import { createFileRoute, Link, stripSearchParams, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Search,
  SlidersHorizontal,
  Heart,
  Home,
  ShoppingCart,
  User,
  Scan,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, AUTH_TOKEN_KEY, isAuthenticated, triggerRequireAuth } from '../api/client';
import {
  catalogQuerySchema,
  type CartResponse,
  type CatalogQueryParams,
  type FavoritesResponse,
  type NFT,
  type NFTListResponse,
  type NftUpdatedEvent,
  type User as UserType,
} from '../api/contracts';
import { createJungleSocket } from '../mocks/socket/socketHandler';
import { db } from '../mocks/db';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';
import { AuthModal } from '../components/auth/AuthModal';
import { EditorialArticleModal } from '../components/home/EditorialArticleModal';
import {
  COLLECTION_FILTERS,
  EDITORIAL_POSTS,
  HERO_SLIDES,
  NETWORK_FILTERS,
  type EditorialPost,
} from '../constants/home.constants';

const defaultCatalogSearch: CatalogQueryParams = {
  search: '',
  category: 'All',
  network: 'All',
  tab: 'all',
  sort: 'newest',
  page: 1,
  limit: 9,
};

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): CatalogQueryParams => {
    const savedPrefs = db.getCatalogPreferences();
    const mergedSearch = {
      ...search,
      tab: search.tab !== undefined ? search.tab : savedPrefs.tab,
      sort: search.sort !== undefined ? search.sort : savedPrefs.sort,
      minPrice: search.minPrice !== undefined ? search.minPrice : savedPrefs.minPrice,
      maxPrice: search.maxPrice !== undefined ? search.maxPrice : savedPrefs.maxPrice,
    };
    const parsed = catalogQuerySchema.safeParse(mergedSearch);
    if (parsed.success) {
      return parsed.data;
    }
    return {
      ...defaultCatalogSearch,
      tab: savedPrefs.tab || 'all',
      sort: savedPrefs.sort || 'newest',
      minPrice: savedPrefs.minPrice,
      maxPrice: savedPrefs.maxPrice,
    };
  },
  search: {
    middlewares: [stripSearchParams(defaultCatalogSearch)],
  },
  component: HomeDiscoveryPage,
});

function formatPriceLabel(val: number): string {
  return val.toFixed(2).replace('.', ',');
}

function getMobileCardArtwork(nft: NFT, index: number): string {
  if (nft.id === 'nft-1') return '/assets/nfts/emerald-ape.png';
  if (nft.id === 'nft-2') return '/assets/nfts/card-4.png';
  if (nft.id === 'nft-3') return '/assets/nfts/ivory-baron.png';
  if (nft.id === 'nft-4' || index === 3) return '/assets/nfts/golden-beat.png';
  return nft.imageUrl;
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
  const [selectedArticle, setSelectedArticle] = useState<EditorialPost | null>(null);
  const [mobileSearchInput, setMobileSearchInput] = useState(activeSearch);
  const [isMobileSearchFocused, setIsMobileSearchFocused] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileAuthOpen, setIsMobileAuthOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'catalog' | 'favorites'>('catalog');
  const [minPriceInput, setMinPriceInput] = useState<number>(
    searchParams.minPrice ? Number(searchParams.minPrice) : 0.02
  );
  const [maxPriceInput, setMaxPriceInput] = useState<number>(
    searchParams.maxPrice ? Number(searchParams.maxPrice) : 12.5
  );

  const nextHeroSlide = () => setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevHeroSlide = () =>
    setHeroIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const hasToken =
    typeof window !== 'undefined' && Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY));

  const { data: sessionData } = useQuery<{ user: UserType }>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<{ user: UserType }>('/auth/me');
      return res.data;
    },
    enabled: hasToken,
    retry: false,
  });

  const { data: cartData } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await apiClient.get<CartResponse>('/cart');
      return res.data;
    },
    enabled: Boolean(sessionData?.user),
  });

  const mobileCartCount = sessionData?.user ? (cartData?.itemCount ?? 0) : 0;

  const { data: favoritesData } = useQuery<FavoritesResponse>({
    queryKey: ['favorites'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<FavoritesResponse>('/favorites', { signal });
      return res.data;
    },
  });

  useQuery({
    queryKey: ['nfts', 'preferences'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get('/nfts/preferences', { signal });
      return res.data;
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ nftId, isFav }: { nftId: string; isFav: boolean }) => {
      if (isFav) {
        const res = await apiClient.delete<{ success: boolean; nftIds: string[] }>(
          `/favorites/${nftId}`
        );
        return res.data;
      }
      const res = await apiClient.post<{ success: boolean; nftIds: string[] }>(
        `/favorites/${nftId}`
      );
      return res.data;
    },
    onMutate: async ({ nftId, isFav }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData<FavoritesResponse>(['favorites']);
      const foundNft = catalogData?.items.find((item) => item.id === nftId);
      queryClient.setQueryData<FavoritesResponse>(['favorites'], (old) => {
        const prevIds = old?.nftIds || [];
        const prevItems = old?.items || [];
        if (isFav) {
          return {
            nftIds: prevIds.filter((id) => id !== nftId),
            items: prevItems.filter((item) => item.id !== nftId),
          };
        }
        return {
          nftIds: [...prevIds, nftId],
          items: foundNft ? [...prevItems, foundNft] : prevItems,
        };
      });
      return { previousFavorites };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      toast.error('Falha ao atualizar favoritos. Estado anterior restaurado (Rollback).');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  useEffect(() => {
    setMinPriceInput(searchParams.minPrice ? Number(searchParams.minPrice) : 0.02);
    setMaxPriceInput(searchParams.maxPrice ? Number(searchParams.maxPrice) : 12.5);
    setMobileSearchInput(searchParams.search || '');
  }, [searchParams.minPrice, searchParams.maxPrice, searchParams.search]);

  useEffect(() => {
    const trimmed = mobileSearchInput.trim();
    if (trimmed === activeSearch.trim()) return;
    const timer = window.setTimeout(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: trimmed,
          page: 1,
        }),
        replace: true,
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [mobileSearchInput, activeSearch, navigate]);

  useEffect(() => {
    const socket = createJungleSocket();

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

  const {
    data: catalogData,
    isLoading,
    isFetching,
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

  const updateFilters = (partial: Partial<CatalogQueryParams>) => {
    if (
      partial.tab !== undefined ||
      partial.sort !== undefined ||
      partial.minPrice !== undefined ||
      partial.maxPrice !== undefined
    ) {
      const nextPrefs = {
        ...(partial.tab !== undefined ? { tab: partial.tab } : {}),
        ...(partial.sort !== undefined ? { sort: partial.sort } : {}),
        ...(partial.minPrice !== undefined ? { minPrice: partial.minPrice } : {}),
        ...(partial.maxPrice !== undefined ? { maxPrice: partial.maxPrice } : {}),
      };
      db.updateCatalogPreferences(nextPrefs);
      void apiClient.put('/nfts/preferences', nextPrefs);
    }

    return navigate({
      search: (prev) => ({
        ...prev,
        ...partial,
        page: partial.page !== undefined ? partial.page : 1,
      }),
      resetScroll: false,
    });
  };

  const scrollToCatalog = () => {
    window.requestAnimationFrame(() => {
      document.getElementById('catalogo-nfts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleExploreFeaturedNft = (nftId: string) => {
    navigate({ to: '/market', search: { id: nftId } });
  };

  const handleExploreNewLaunches = async () => {
    await updateFilters({ tab: 'new', sort: 'newest', page: 1 });
    toast.info('Exibindo os lançamentos gênesis mais recentes.');
    scrollToCatalog();
  };

  const handleExploreDigitalArt = async () => {
    await updateFilters({ category: 'Arte digital', page: 1 });
    toast.info('Exibindo NFTs da coleção Arte digital.');
    scrollToCatalog();
  };

  const handleApplyPriceRange = () => {
    const low = Math.min(minPriceInput, maxPriceInput);
    const high = Math.max(minPriceInput, maxPriceInput);
    updateFilters({
      minPrice: low.toFixed(2),
      maxPrice: high.toFixed(2),
      page: 1,
    });
    void refetch();
    toast.success(`Faixa de preço aplicada: ${formatPriceLabel(low)} – ${formatPriceLabel(high)} ETH`);
  };

  const handleResetAllFilters = () => {
    setMinPriceInput(0.02);
    setMaxPriceInput(12.5);
    const resetPrefs = {
      tab: 'all' as const,
      sort: 'newest' as const,
      minPrice: undefined,
      maxPrice: undefined,
    };
    db.updateCatalogPreferences(resetPrefs);
    void apiClient.put('/nfts/preferences', resetPrefs);
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
  const items = Array.isArray(catalogData?.items) ? catalogData.items : [];
  const leftColumnItems = items.filter((_, idx) => idx % 2 === 0);
  const rightColumnItems = items.filter((_, idx) => idx % 2 === 1);

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="md:hidden flex flex-col min-h-screen pb-28 px-4 pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            (document.activeElement as HTMLElement | null)?.blur();
            setIsMobileSearchFocused(false);
            updateFilters({ search: mobileSearchInput.trim(), page: 1 });
          }}
          className="flex items-center gap-3"
        >
          <div className="flex-1 h-11 bg-[#22150E] border border-[#332016] focus-within:border-[#D1823C] rounded-[12px] px-3.5 flex items-center gap-2.5 transition-colors">
            <Search className="w-4 h-4 text-[#C68E5D] shrink-0" />
            <input
              type="text"
              enterKeyHint="search"
              spellCheck={false}
              value={mobileSearchInput}
              onFocus={() => setIsMobileSearchFocused(true)}
              onBlur={() => setIsMobileSearchFocused(false)}
              onChange={(e) => setMobileSearchInput(e.target.value)}
              placeholder="Explorar coleções"
              className="w-full bg-transparent text-[16px] leading-none text-[#FAF5F0] placeholder-[#C68E5D] outline-none focus-visible:!outline-none"
            />
            {mobileSearchInput && (
              <button
                type="button"
                aria-label="Limpar busca mobile"
                onClick={() => {
                  setMobileSearchInput('');
                  updateFilters({ search: '', page: 1 });
                }}
                className="text-[#C68E5D] hover:text-[#FAF5F0] p-0.5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Filtrar coleções"
            onClick={() => {
              (document.activeElement as HTMLElement | null)?.blur();
              setIsMobileSearchFocused(false);
              setIsMobileFilterOpen((prev) => !prev);
            }}
            className="w-11 h-11 rounded-[12px] bg-[#C87D3B] hover:bg-[#D1823C] text-[#140D0A] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
          </button>
        </form>

        {isMobileFilterOpen && (
          <div className="mt-3 bg-[#1F1510] border border-[#3D2A1E] rounded-2xl p-4 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2C1E16] pb-2.5">
              <span className="text-xs font-extrabold text-[#FAF5F0] uppercase tracking-wider">
                Filtrar Catálogo
              </span>
              <button
                type="button"
                aria-label="Fechar filtros mobile"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-6 h-6 rounded-full bg-[#2A1C15] text-[#C2B2A6] hover:text-[#FAF5F0] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#C2B2A6]">Categoria</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'All', label: 'Todas' },
                  { id: 'Arte digital', label: 'Arte digital' },
                  { id: 'Colecionáveis', label: 'Colecionáveis' },
                  { id: 'Música', label: 'Música' },
                  { id: 'Fotografia', label: 'Fotografia' },
                  { id: 'Jogos', label: 'Jogos' },
                ].map((cat) => {
                  const isSelected = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() =>
                        updateFilters({
                          category: cat.id as CatalogQueryParams['category'],
                          page: 1,
                        })
                      }
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${isSelected
                          ? 'bg-[#D1823C] text-[#140D0A] font-bold'
                          : 'bg-[#140D0A] border border-[#2C1E16] text-[#C2B2A6]'
                        }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold text-[#C2B2A6]">Ordenar por</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'newest', label: 'Mais recentes' },
                  { id: 'price_asc', label: 'Menor preço' },
                  { id: 'price_desc', label: 'Maior preço' },
                ].map((sortOpt) => {
                  const isSelected = activeSort === sortOpt.id;
                  return (
                    <button
                      key={sortOpt.id}
                      type="button"
                      onClick={() =>
                        updateFilters({
                          sort: sortOpt.id as CatalogQueryParams['sort'],
                          page: 1,
                        })
                      }
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-colors cursor-pointer ${isSelected
                          ? 'bg-[#D1823C] text-[#140D0A] font-bold'
                          : 'bg-[#140D0A] border border-[#2C1E16] text-[#C2B2A6]'
                        }`}
                    >
                      {sortOpt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#C2B2A6]">Faixa de preço</span>
                <span className="text-[11px] font-bold text-[#D1823C]">
                  {formatPriceLabel(minPriceInput)} – {formatPriceLabel(maxPriceInput)} ETH
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Todos', min: 0.02, max: 12.5 },
                  { label: 'Até 1 ETH', min: 0.02, max: 1.0 },
                  { label: '1–3 ETH', min: 1.0, max: 3.0 },
                  { label: '3+ ETH', min: 3.0, max: 12.5 },
                ].map((preset) => {
                  const isActivePreset =
                    Math.abs(minPriceInput - preset.min) < 0.05 &&
                    Math.abs(maxPriceInput - preset.max) < 0.05;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPriceInput(preset.min);
                        setMaxPriceInput(preset.max);
                      }}
                      className={`py-1.5 rounded-lg text-[10.5px] font-semibold transition-colors cursor-pointer ${isActivePreset
                          ? 'bg-[#D1823C]/20 border border-[#D1823C] text-[#D1823C] font-bold'
                          : 'bg-[#140D0A] border border-[#2C1E16] text-[#C2B2A6]'
                        }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              <div className="relative h-5 flex items-center mt-1">
                <div className="w-full h-1.5 bg-[#3D2A1E] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#D1823C]"
                    style={{
                      marginLeft: `${Math.min(100, (minPriceInput / 12.5) * 100)}%`,
                      width: `${Math.max(5, ((maxPriceInput - minPriceInput) / 12.5) * 100)}%`,
                    }}
                  />
                </div>
                <input
                  type="range"
                  aria-label="Preço mínimo mobile em ETH"
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
                  aria-label="Preço máximo mobile em ETH"
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
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2C1E16]">
              <button
                type="button"
                onClick={() => {
                  handleResetAllFilters();
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-2 rounded-lg border border-[#3D2A1E] text-[#C2B2A6] hover:text-[#FAF5F0] text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyPriceRange();
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-2 rounded-lg bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs transition-colors cursor-pointer"
              >
                Aplicar
              </button>
            </div>
          </div>
        )}

        <section
          aria-label="Destaque principal mobile"
          className="mt-4 rounded-[20px] p-4 pb-3 relative overflow-hidden bg-gradient-to-br from-[#3F2617] via-[#4D2E1B] to-[#26160D] border border-[#4D301D] transition-all duration-300"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -top-10 w-44 h-44 rounded-full bg-[#6B3F23]/30 blur-xl"
          />
          <div className="relative z-10 flex items-center justify-between gap-2.5">
            <div className="flex-1 min-w-0">
              <span className="text-[10.5px] text-[#E8D7C8] block mb-1">
                {activeHero.subtitle}
              </span>
              <h1 className="text-[14px] font-extrabold uppercase leading-[1.28] text-[#FAF5F0] tracking-tight">
                {activeHero.titleLine1}
                <br />
                {activeHero.titleLine2}
              </h1>
              <p className="text-[10px] leading-[1.42] text-[#C8AE99] mt-1.5 mb-2.5 line-clamp-2">
                {activeHero.description}
              </p>
              <button
                type="button"
                onClick={() => handleExploreFeaturedNft(activeHero.id)}
                className="inline-flex items-center gap-2 text-[#D1823C] font-extrabold text-[10.5px] uppercase tracking-wider cursor-pointer"
              >
                <span>EXPLORAR</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            <div className="relative w-[132px] h-[136px] shrink-0">
              <div className="w-[114px] h-[116px] ml-auto rounded-[14px] overflow-hidden shadow-lg bg-[#24160F]">
                <img
                  src={activeHero.mobileMainImage}
                  alt={activeHero.imageAlt}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              </div>
              <div className="absolute bottom-0 left-1 w-[52px] h-[54px] rounded-[11px] overflow-hidden shadow-md ring-2 ring-[#3B2314] bg-[#24160F]">
                <img
                  src={activeHero.mobileOverlapImage}
                  alt="Prévia de coleção secundária"
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between mt-3 pt-1 border-t border-[#4D301D]/50">
            <button
              type="button"
              aria-label="Slide anterior"
              onClick={prevHeroSlide}
              className="p-1 text-[#C8AE99] hover:text-[#D1823C] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-center gap-2">
              {HERO_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  onClick={() => setHeroIndex(idx)}
                  className={`transition-all cursor-pointer ${heroIndex === idx ? 'w-5 h-1.5 bg-[#D1823C] rounded-full' : 'w-1.5 h-1.5 bg-[#D1823C]/50 rounded-full'
                    }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Próximo slide"
              onClick={nextHeroSlide}
              className="p-1 text-[#C8AE99] hover:text-[#D1823C] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <div
          role="tablist"
          aria-label="Categorias de listagem mobile"
          className="mt-5 flex items-center justify-between gap-2"
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
                className={`relative pb-1.5 text-[12px] whitespace-nowrap font-medium transition-colors cursor-pointer ${isActive ? 'text-[#D1823C] font-bold' : 'text-[#FAF5F0]'
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

        {isFetching && (
          <div className="mt-4 py-6 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-[#D1823C] animate-spin" />
            <span className="text-xs text-[#C2B2A6]">Atualizando catálogo...</span>
          </div>
        )}

        {mobileView === 'favorites' ? (
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2C1E16]">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 fill-[#D1823C] text-[#D1823C]" />
                <h2 className="text-[#FAF5F0] font-bold text-sm">Meus Favoritos</h2>
                <span className="text-[#D1823C] text-xs font-bold">
                  ({favoritesData?.items?.length || 0})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileView('catalog')}
                className="text-[11px] text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
              >
                Voltar ao catálogo
              </button>
            </div>

            {(!favoritesData?.items || favoritesData.items.length === 0) ? (
              <div className="bg-[#1F1510] border border-[#2C1E16] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 my-4">
                <Heart className="w-10 h-10 text-[#4D301D]" />
                <p className="text-[#FAF5F0] font-bold text-xs">Nenhum NFT favoritado ainda</p>
                <p className="text-[#A8968A] text-[11px] max-w-[220px]">
                  Navegue pelo catálogo e toque no ícone de coração para salvar seus NFTs favoritos aqui.
                </p>
                <button
                  type="button"
                  onClick={() => setMobileView('catalog')}
                  className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-4 py-2 rounded-md transition-colors cursor-pointer mt-1"
                >
                  Explorar catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 items-start">
                {favoritesData.items.map((favNft) => (
                  <article key={favNft.id} className="flex flex-col">
                    <div className="bg-[#23150E] rounded-[16px] p-2 relative">
                      <button
                        type="button"
                        aria-label={`Remover ${favNft.name} dos favoritos`}
                        onClick={(e) => {
                          e.stopPropagation();
                          favoriteMutation.mutate({
                            nftId: favNft.id,
                            isFav: true,
                          });
                        }}
                        className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-[#24160F]/90 border border-[#4A3222] flex items-center justify-center text-[#D1823C] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      >
                        <Heart className="w-3.5 h-3.5 fill-[#D1823C] text-[#D1823C]" />
                      </button>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate({ to: '/market', search: { id: favNft.id } })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate({ to: '/market', search: { id: favNft.id } });
                          }
                        }}
                        className="w-full aspect-[150/174] rounded-[12px] overflow-hidden cursor-pointer"
                      >
                        <img
                          src={favNft.imageUrl}
                          alt={favNft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <h3 className="text-[#FAF5F0] text-[12px] font-medium mt-2 truncate px-0.5">
                      {favNft.name}
                    </h3>
                    <span className="text-[#D1823C] font-extrabold text-[12px] mt-0.5 px-0.5">
                      {favNft.priceEth} ETH
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3.5 items-start">
            <div className="flex flex-col gap-4">
              {leftColumnItems.map((nft, colIdx) => {
                const globalIdx = colIdx * 2;
                const isFav = Boolean(favoritesData?.nftIds?.includes(nft.id));
                const showRareBadge = nft.id === 'nft-3' || colIdx === 1;

                return (
                  <article key={nft.id} className="flex flex-col">
                    <div className="bg-[#23150E] rounded-[16px] p-2 relative">
                      <button
                        type="button"
                        aria-label={isFav ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAuthenticated()) {
                            triggerRequireAuth({
                              message: 'Faça login na sua conta para favoritar este NFT.',
                              onSuccess: () =>
                                favoriteMutation.mutate({
                                  nftId: nft.id,
                                  isFav: Boolean(favoritesData?.nftIds?.includes(nft.id)),
                                }),
                            });
                            return;
                          }
                          favoriteMutation.mutate({
                            nftId: nft.id,
                            isFav: Boolean(favoritesData?.nftIds?.includes(nft.id)),
                          });
                        }}
                        className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-[#24160F]/90 border border-[#4A3222] flex items-center justify-center text-[#D1823C] cursor-pointer"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFav
                              ? 'fill-[#D1823C] text-[#D1823C]'
                              : 'text-[#D1823C]'
                            }`}
                        />
                      </button>

                      {showRareBadge && (
                        <span className="absolute top-3.5 left-0 z-10 bg-[#C87D3B] text-[#140D0A] font-bold text-[10px] uppercase px-3 py-1 rounded-r-[4px]">
                          RARO
                        </span>
                      )}

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate({ to: '/market', search: { id: nft.id } })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate({ to: '/market', search: { id: nft.id } });
                          }
                        }}
                        className="w-full aspect-[150/174] rounded-[12px] overflow-hidden cursor-pointer"
                      >
                        <img
                          src={getMobileCardArtwork(nft, globalIdx)}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <h3 className="text-[#FAF5F0] text-[12px] font-medium mt-2 truncate px-0.5">
                      {nft.name}
                    </h3>
                    <span className="text-[#D1823C] font-extrabold text-[12px] mt-0.5 px-0.5">
                      {nft.priceEth} ETH
                    </span>
                  </article>
                );
              })}
            </div>

            <div className="flex flex-col gap-4 mt-5">
              {rightColumnItems.map((nft, colIdx) => {
                const globalIdx = colIdx * 2 + 1;
                const isFav = Boolean(favoritesData?.nftIds?.includes(nft.id));

                return (
                  <article key={nft.id} className="flex flex-col">
                    <div className="bg-[#23150E] rounded-[16px] p-2 relative">
                      <button
                        type="button"
                        aria-label={isFav ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isAuthenticated()) {
                            triggerRequireAuth({
                              message: 'Faça login na sua conta para favoritar este NFT.',
                              onSuccess: () =>
                                favoriteMutation.mutate({
                                  nftId: nft.id,
                                  isFav: Boolean(favoritesData?.nftIds?.includes(nft.id)),
                                }),
                            });
                            return;
                          }
                          favoriteMutation.mutate({
                            nftId: nft.id,
                            isFav: Boolean(favoritesData?.nftIds?.includes(nft.id)),
                          });
                        }}
                        className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-[#24160F]/90 border border-[#4A3222] flex items-center justify-center text-[#D1823C] cursor-pointer"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${isFav
                              ? 'fill-[#D1823C] text-[#D1823C]'
                              : 'text-[#D1823C]'
                            }`}
                        />
                      </button>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate({ to: '/market', search: { id: nft.id } })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate({ to: '/market', search: { id: nft.id } });
                          }
                        }}
                        className="w-full aspect-[150/174] rounded-[12px] overflow-hidden cursor-pointer"
                      >
                        <img
                          src={getMobileCardArtwork(nft, globalIdx)}
                          alt={nft.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <h3 className="text-[#FAF5F0] text-[12px] font-medium mt-2 truncate px-0.5">
                      {nft.name}
                    </h3>
                    <span className="text-[#D1823C] font-extrabold text-[12px] mt-0.5 px-0.5">
                      {nft.priceEth} ETH
                    </span>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <nav
          aria-label="Navegação inferior mobile"
          className={`fixed bottom-0 left-0 right-0 z-40 h-[72px] bg-[#22150E] rounded-t-[26px] border-t border-[#332016] px-7 items-center justify-between shadow-[0_-8px_24px_rgba(0,0,0,0.45)] ${isMobileSearchFocused ? 'hidden' : 'flex'
            }`}
        >
          <div className="flex items-center gap-10">
            <button
              type="button"
              aria-label="Início"
              onClick={() => {
                setMobileView('catalog');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`p-1.5 transition-colors cursor-pointer ${mobileView === 'catalog' ? 'text-[#D1823C]' : 'text-[#C8A992] hover:text-[#D1823C]'
                }`}
            >
              <Home className={`w-5 h-5 ${mobileView === 'catalog' ? 'fill-[#D1823C]' : ''}`} />
            </button>
            <button
              type="button"
              aria-label="Favoritos"
              onClick={() => {
                if (!isAuthenticated()) {
                  triggerRequireAuth({
                    message: 'Faça login na sua conta para visualizar seus favoritos.',
                    onSuccess: () => setMobileView('favorites'),
                  });
                  return;
                }
                setMobileView('favorites');
              }}
              className={`p-1.5 transition-colors cursor-pointer relative ${mobileView === 'favorites' ? 'text-[#D1823C]' : 'text-[#C8A992] hover:text-[#D1823C]'
                }`}
            >
              <Heart className={`w-5 h-5 ${mobileView === 'favorites' ? 'fill-[#D1823C]' : ''}`} />
              {(favoritesData?.nftIds?.length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D1823C] text-[#140D0A] text-[9px] font-extrabold flex items-center justify-center">
                  {favoritesData?.nftIds?.length}
                </span>
              )}
            </button>
          </div>

          <div className="relative -top-6">
            <button
              type="button"
              aria-label="Explorar NFT em destaque"
              onClick={() => navigate({ to: '/market', search: { id: 'nft-1' } })}
              className="w-14 h-14 rounded-full bg-[#D1823C]/85 backdrop-blur-md border border-[#E5A467]/40 shadow-[0_6px_22px_rgba(209,130,60,0.5)] flex items-center justify-center text-[#FAF5F0] cursor-pointer"
            >
              <Scan className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-10">
            {sessionData?.user ? (
              <Link
                to="/cart"
                aria-label={`Carrinho de compras com ${mobileCartCount} ${mobileCartCount === 1 ? 'item' : 'itens'
                  }`}
                className="relative text-[#C8A992] hover:text-[#D1823C] p-1.5 transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                {mobileCartCount > 0 && (
                  <span
                    data-testid="mobile-cart-badge-count"
                    className="absolute -top-1 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#D1823C] text-[#140D0A] text-[10px] font-extrabold flex items-center justify-center leading-none"
                  >
                    {mobileCartCount}
                  </span>
                )}
              </Link>
            ) : (
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-label="Carrinho desabilitado — faça login para acessar"
                  className="text-[#C8A992]/35 p-1.5 cursor-not-allowed"
                >
                  <ShoppingCart className="w-5 h-5" />
                </button>
                <div
                  role="tooltip"
                  className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute bottom-full right-0 mb-3 w-56 bg-[#1F1510] border border-[#3D2A1E] rounded-lg p-2.5 shadow-xl z-50 text-left"
                >
                  <p className="text-[10.5px] font-bold text-[#D1823C]">Login necessário</p>
                  <p className="text-[10px] text-[#C2B2A6] mt-0.5">
                    Entre na sua conta para acessar o carrinho.
                  </p>
                </div>
              </div>
            )}
            <button
              type="button"
              aria-label="Perfil"
              onClick={() => {
                if (sessionData?.user) {
                  navigate({ to: '/profile' });
                } else {
                  setIsMobileAuthOpen(true);
                }
              }}
              className="text-[#C8A992] hover:text-[#D1823C] p-1.5 transition-colors cursor-pointer"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </nav>

        <AuthModal
          isOpen={isMobileAuthOpen}
          initialMode="login"
          onClose={() => setIsMobileAuthOpen(false)}
        />
      </div>

      <div className="hidden md:flex max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-6 flex-col">
        <Header
          searchValue={activeSearch}
          onSearchSubmit={(query) => updateFilters({ search: query, page: 1 })}
        />

        <section
          aria-label="Destaque principal"
          className="w-full mt-6 mb-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start"
        >
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
                onClick={() => handleExploreFeaturedNft(activeHero.id)}
                aria-label={`Explorar ${activeHero.imageAlt.split(' —')[0]}`}
                className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-[11px] uppercase tracking-wider px-7 py-3 rounded-md transition-colors cursor-pointer"
              >
                EXPLORAR
              </button>
            </div>

            <div
              role="tablist"
              aria-label="Slides em destaque"
              className="flex items-center justify-end gap-3 mt-6 lg:mt-8 pr-6"
            >
              <button
                type="button"
                aria-label="Slide anterior"
                onClick={prevHeroSlide}
                className="w-7 h-7 rounded-full bg-[#1F1510] border border-[#3D2A1E] hover:border-[#D1823C] text-[#C2B2A6] hover:text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                {HERO_SLIDES.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={heroIndex === idx}
                    aria-label={`Mostrar destaque ${idx + 1}: ${slide.titleLine1}`}
                    onClick={() => setHeroIndex(idx)}
                    className={`transition-all cursor-pointer ${heroIndex === idx
                        ? 'w-6 h-2 bg-[#D1823C] rounded-full'
                        : 'w-2 h-2 rounded-full bg-[#D1823C]/40 hover:bg-[#D1823C]/75'
                      }`}
                  />
                ))}
              </div>
              <button
                type="button"
                aria-label="Próximo slide"
                onClick={nextHeroSlide}
                className="w-7 h-7 rounded-full bg-[#1F1510] border border-[#3D2A1E] hover:border-[#D1823C] text-[#C2B2A6] hover:text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[397px] aspect-square rounded-[20px] overflow-hidden shadow-2xl relative group bg-[#24160F]">
              <img
                src={activeHero.imageUrl}
                alt={activeHero.imageAlt}
                width={397}
                height={397}
                fetchPriority="high"
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11px] font-bold text-[#FAF5F0] truncate">
                  {activeHero.titleLine1} {activeHero.titleLine2}
                </span>
                <span className="text-[10.5px] text-[#D1823C] font-semibold shrink-0">
                  {heroIndex + 1} / {HERO_SLIDES.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-16 lg:gap-20">
          <section
            id="catalogo-nfts"
            aria-label="Catálogo de NFTs e Filtros"
            className="w-full flex flex-col"
          >
            <div className="w-full flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
              <aside className="w-full lg:w-[260px] shrink-0 flex flex-col gap-6">
                <div className="bg-[#1F1510] border border-[#2C1E16] rounded-xl p-4 sm:p-5 flex flex-col gap-4">
                  <div>
                    <h2 className="text-[#FAF5F0] font-bold text-xs mb-2">Coleções</h2>
                    <ul className="space-y-1">
                      {COLLECTION_FILTERS.map((col) => (
                        <li
                          key={col.name}
                          className="w-full flex items-center justify-between text-[11px] py-0.5 text-[#B5A395] select-none hover:text-[#FAF5F0] transition-colors"
                        >
                          <span>{col.name}</span>
                          <span className="text-[#8C7A6B]">({col.count})</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h2 className="text-[#FAF5F0] font-bold text-xs mb-2">Faixa de preço</h2>
                    <div className="flex flex-col gap-2">
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
                        Preço: {formatPriceLabel(minPriceInput)} – {formatPriceLabel(maxPriceInput)}{' '}
                        ETH
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyPriceRange}
                        disabled={isFetching}
                        className="inline-flex items-center gap-1.5 bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-70 text-[#140D0A] font-bold text-[11px] px-3.5 py-1 rounded w-fit transition-colors cursor-pointer"
                      >
                        {isFetching && <Loader2 className="w-3 h-3 animate-spin" />}
                        <span>{isFetching ? 'Aplicando...' : 'Aplicar'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-[#FAF5F0] font-bold text-xs mb-2">Rede</h2>
                    <ul className="space-y-1">
                      {NETWORK_FILTERS.map((net) => (
                        <li
                          key={net.name}
                          className="w-full flex items-center justify-between text-[11px] py-0.5 text-[#B5A395] select-none hover:text-[#FAF5F0] transition-colors"
                        >
                          <span>{net.name}</span>
                          <span className="text-[#8C7A6B]">({net.count})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col items-center text-center shrink-0">
                  <span className="text-[#D1823C] font-extrabold text-[12.5px] uppercase tracking-wider block">
                    NFT EM DESTAQUE
                  </span>
                  <span className="text-[#FAF5F0] font-bold text-[11px] uppercase tracking-wider block mt-0.5 mb-2.5">
                    OFERTA LIMITADA
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: '/market',
                        search: { id: 'nft-2' },
                      })
                    }
                    aria-label="Ver oferta limitada Sage Nomad #009"
                    className="w-full rounded-[16px] overflow-hidden hover:ring-2 hover:ring-[#D1823C] transition-all cursor-pointer shadow-lg"
                  >
                    <img
                      src="/assets/nfts/sage-nomad-featured.png"
                      alt="NFT em destaque: Sage Nomad #009"
                      width={260}
                      height={290}
                      loading="lazy"
                      className="w-full aspect-[260/290] max-h-[285px] object-cover rounded-[16px]"
                    />
                  </button>
                </div>
              </aside>

              <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center justify-between gap-2 pb-1">
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
                          className={`relative pb-1.5 text-[11px] whitespace-nowrap font-medium transition-colors cursor-pointer ${isActive
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

                {(activeSearch ||
                  activeCategory !== 'All' ||
                  activeNetwork !== 'All' ||
                  Boolean(searchParams.minPrice) ||
                  Boolean(searchParams.maxPrice)) && (
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1F1510] border border-[#2C1E16] rounded-lg px-3.5 py-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="text-[#9A8473]">
                          {catalogData?.total ?? 0}{' '}
                          {(catalogData?.total ?? 0) === 1 ? 'NFT encontrado' : 'NFTs encontrados'}:
                        </span>
                        {activeSearch && (
                          <button
                            type="button"
                            onClick={() => updateFilters({ search: '', page: 1 })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2B1B12] border border-[#432919] text-[#FAF5F0] hover:border-[#D1823C] transition-colors cursor-pointer"
                          >
                            <span>Busca: &ldquo;{activeSearch}&rdquo;</span>
                            <X className="w-3 h-3 text-[#D1823C]" />
                          </button>
                        )}
                        {(searchParams.minPrice || searchParams.maxPrice) && (
                          <button
                            type="button"
                            onClick={() => {
                              setMinPriceInput(0.02);
                              setMaxPriceInput(12.5);
                              const clearedPrice = { minPrice: undefined, maxPrice: undefined };
                              db.updateCatalogPreferences(clearedPrice);
                              void apiClient.put('/nfts/preferences', clearedPrice);
                              navigate({
                                search: (prev) => ({
                                  ...prev,
                                  minPrice: undefined,
                                  maxPrice: undefined,
                                  page: 1,
                                }),
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2B1B12] border border-[#432919] text-[#FAF5F0] hover:border-[#D1823C] transition-colors cursor-pointer"
                          >
                            <span>
                              Preço: {formatPriceLabel(Number(searchParams.minPrice || 0.02))} –{' '}
                              {formatPriceLabel(Number(searchParams.maxPrice || 12.5))} ETH
                            </span>
                            <X className="w-3 h-3 text-[#D1823C]" />
                          </button>
                        )}
                        {activeCategory !== 'All' && (
                          <button
                            type="button"
                            onClick={() => updateFilters({ category: 'All', page: 1 })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2B1B12] border border-[#432919] text-[#FAF5F0] hover:border-[#D1823C] transition-colors cursor-pointer"
                          >
                            <span>Coleção: {activeCategory}</span>
                            <X className="w-3 h-3 text-[#D1823C]" />
                          </button>
                        )}
                        {activeNetwork !== 'All' && (
                          <button
                            type="button"
                            onClick={() => updateFilters({ network: 'All', page: 1 })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2B1B12] border border-[#432919] text-[#FAF5F0] hover:border-[#D1823C] transition-colors cursor-pointer"
                          >
                            <span>Rede: {activeNetwork}</span>
                            <X className="w-3 h-3 text-[#D1823C]" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleResetAllFilters}
                        className="text-[11px] font-semibold text-[#D1823C] hover:underline cursor-pointer"
                      >
                        Limpar tudo
                      </button>
                    </div>
                  )}

                {(isLoading || isFetching) && (
                  <div
                    aria-busy="true"
                    aria-label="Carregando catálogo de NFTs"
                    className="py-12 flex flex-col items-center justify-center gap-3 bg-[#1F1510]/60 border border-[#2C1E16] rounded-xl"
                  >
                    <Loader2 className="w-8 h-8 text-[#D1823C] animate-spin" />
                    <span className="text-xs font-semibold text-[#C2B2A6]">
                      Carregando catálogo de NFTs...
                    </span>
                  </div>
                )}

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
                        Ocorreu um erro ao consultar a API. Verifique sua conexão ou tente
                        novamente.
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

                {!isLoading && !isError && catalogData && items.length === 0 && (
                  <div className="bg-[#1F1510] border border-[#2E2018] rounded-xl p-12 flex flex-col items-center justify-center text-center gap-4 my-4">
                    <p className="text-[#FAF5F0] font-bold text-base">
                      Nenhum NFT encontrado com os filtros selecionados
                    </p>
                    <p className="text-[#A8968A] text-xs max-w-md">
                      Experimente ajustar a faixa de preço, selecionar outra coleção ou limpar os
                      filtros ativos.
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

                {!isLoading && !isError && catalogData && items.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-5 lg:gap-x-6 gap-y-4 lg:gap-y-5">
                    {items.map((nft: NFT) => {
                      const isDesktopFav = Boolean(favoritesData?.nftIds?.includes(nft.id));
                      return (
                        <article
                          key={nft.id}
                          data-testid={`nft-card-${nft.id}`}
                          className="flex flex-col group"
                        >
                          <div className="relative transition-transform duration-200 group-hover:-translate-y-1">
                            <button
                              type="button"
                              aria-label={
                                isDesktopFav
                                  ? `Remover ${nft.name} dos favoritos`
                                  : `Favoritar ${nft.name}`
                              }
                              aria-pressed={isDesktopFav}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isAuthenticated()) {
                                  triggerRequireAuth({
                                    message: 'Faça login para salvar seus NFTs favoritos.',
                                    onSuccess: () =>
                                      favoriteMutation.mutate({
                                        nftId: nft.id,
                                        isFav: Boolean(favoritesData?.nftIds?.includes(nft.id)),
                                      }),
                                  });
                                  return;
                                }
                                favoriteMutation.mutate({
                                  nftId: nft.id,
                                  isFav: Boolean(favoritesData?.nftIds?.includes(nft.id)),
                                });
                              }}
                              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-[#24160F]/90 hover:bg-[#140D0A] border border-[#4A3222] hover:border-[#D1823C] flex items-center justify-center text-[#D1823C] transition-all cursor-pointer"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${isDesktopFav
                                    ? 'fill-[#D1823C] text-[#D1823C]'
                                    : 'text-[#D1823C]'
                                  }`}
                              />
                            </button>

                            <div
                              onClick={() =>
                                navigate({
                                  to: '/market',
                                  search: { id: nft.id },
                                })
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  navigate({
                                    to: '/market',
                                    search: { id: nft.id },
                                  });
                                }
                              }}
                              aria-label={`Ver detalhes de ${nft.name}, preço ${nft.priceEth} ETH`}
                              className="w-full aspect-square max-h-[200px] overflow-hidden relative cursor-pointer bg-[#24160F] rounded-[14px]"
                            >
                              <img
                                src={nft.imageUrl}
                                alt={`${nft.name} da coleção ${nft.collection}`}
                                width={193}
                                height={223}
                                loading="lazy"
                                className="w-full h-full object-cover rounded-[14px]"
                              />
                            </div>
                          </div>

                          {nft.id !== 'nft-8' ? (
                            <>
                              <h3 className="text-[#FAF5F0] text-xs sm:text-[13px] font-medium mt-2.5 truncate">
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
                            <div aria-hidden="true" className="h-[44px] mt-2.5" />
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}

                {!isLoading && !isError && catalogData && catalogData.totalPages > 0 && (
                  <nav
                    aria-label="Paginação do catálogo"
                    className="flex items-center justify-end gap-2 pt-4"
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
                          className={`w-8 h-8 rounded text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${isCurrent
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
              </div>
            </div>
          </section>

          <section
            id="destaques-criadores"
            aria-label="Coleções e lançamentos em destaque"
            className="w-full flex flex-col gap-8"
          >
            <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    onClick={handleExploreNewLaunches}
                    className="inline-flex items-center gap-1.5 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-[5px] transition-colors cursor-pointer"
                  >
                    <span>Explorar</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

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
                    onClick={handleExploreDigitalArt}
                    className="inline-flex items-center gap-1.5 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-[5px] transition-colors cursor-pointer"
                  >
                    <span>Explorar</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            id="diario-cunhagem"
            aria-label="Diário da Cunhagem"
            className="w-full flex flex-col items-center gap-10"
          >
            <div className="w-full flex flex-col items-center">
              <div className="text-center max-w-2xl mb-6">
                <h2 className="text-[#FAF5F0] font-bold text-xl sm:text-2xl mb-2">
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
                        onClick={() => setSelectedArticle(post)}
                        className="inline-flex items-center gap-1 text-[#C2B2A6] hover:text-[#D1823C] text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <span>Ler mais</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <Footer onSelectCategory={(category) => updateFilters({ category, page: 1 })} />
        </div>
      </div>

      <EditorialArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />
    </div>
  );
}
