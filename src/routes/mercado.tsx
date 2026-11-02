import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Heart, Search, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { apiClient } from '../api/client';
import type {
  CartResponse,
  FavoritesResponse,
  NFT,
  NFTListResponse,
  NftUpdatedEvent,
} from '../api/contracts';
import { JUNGLE_WS_URL } from '../mocks/socket/socketHandler';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

const marketSearchSchema = z.object({
  id: z.string().optional(),
});

export type MarketSearchParams = Partial<z.infer<typeof marketSearchSchema>>;

export const Route = createFileRoute('/mercado')({
  validateSearch: (search: Record<string, unknown>): MarketSearchParams => {
    const parsed = marketSearchSchema.safeParse(search);
    if (parsed.success) {
      return parsed.data;
    }
    return {};
  },
  component: MarketDetailPage,
});

const EDITION_OPTIONS = [
  { id: '1/1', label: '1/1' },
  { id: '1/10', label: '1/10' },
  { id: '1/50', label: '1/50' },
  { id: 'ABERTA', label: 'ABERTA' },
];

const COLLECTOR_REVIEWS = [
  {
    id: 'rev-1',
    author: 'LucasM.eth',
    rating: 5,
    date: 'Há 2 dias',
    comment:
      'Acabamento impecável na arte em alta resolução e metadados verificados instantaneamente no IPFS.',
  },
  {
    id: 'rev-2',
    author: 'HelenaVortex',
    rating: 5,
    date: 'Há 5 dias',
    comment:
      'Uma das peças mais icônicas da coleção Kurio Editions. A iluminação esmeralda nos óculos é incrível.',
  },
  {
    id: 'rev-3',
    author: '0x94A...82F1',
    rating: 5,
    date: 'Há 1 semana',
    comment:
      'Procedência on-chain transparente e comunidade muito ativa nos lançamentos exclusivos.',
  },
];

const MAIS_DESTA_COLECAO_ITEMS = [
  {
    id: 'nft-4',
    name: 'Cosmic Bloom #118',
    priceEth: '1.29',
    imageUrl: '/assets/nfts/card-4.png',
  },
  {
    id: 'nft-5',
    name: 'Violet Nomad #314',
    priceEth: '1.39',
    imageUrl: '/assets/nfts/card-5.png',
  },
  {
    id: 'nft-6',
    name: 'Ivory Baron #088',
    priceEth: '1.79',
    imageUrl: '/assets/nfts/card-6.png',
  },
  {
    id: 'nft-7',
    name: 'Golden Beat #207',
    priceEth: '0.99',
    imageUrl: '/assets/nfts/card-9.png',
  },
  {
    id: 'nft-9',
    name: 'Golden Signal #160',
    priceEth: '0.39',
    imageUrl: '/assets/nfts/card-9.png',
  },
];

function MarketDetailPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { id: activeNftId = 'nft-1' } = Route.useSearch();

  const [selectedEdition, setSelectedEdition] = useState<string>('1/50');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedThumbIndex, setSelectedThumbIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  const [carouselDot, setCarouselDot] = useState<number>(1); // Middle dot active as in Figma
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

  // Reset quantity and thumb selection when changing NFT
  useEffect(() => {
    setQuantity(1);
    setSelectedThumbIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeNftId]);

  // Fetch Primary NFT Details
  const {
    data: nft,
    isLoading,
    isError,
    refetch,
  } = useQuery<NFT>({
    queryKey: ['nft', activeNftId],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<NFT>(`/nfts/${activeNftId}`, { signal });
      return res.data;
    },
  });

  // Fetch Catalog List for "Mais desta coleção"
  const { data: catalogData } = useQuery<NFTListResponse>({
    queryKey: ['nfts', 'related-collection'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<NFTListResponse>('/nfts', {
        signal,
        params: { page: 1, limit: 12 },
      });
      return res.data;
    },
  });

  // Fetch Favorites for Optimistic Toggle
  const { data: favoritesData } = useQuery<FavoritesResponse>({
    queryKey: ['favorites'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<FavoritesResponse>('/favorites', { signal });
      return res.data;
    },
  });

  const isFavorited = Boolean(favoritesData?.nftIds?.includes(activeNftId));

  // Real-time Socket.IO subscription for price & inventory changes
  useEffect(() => {
    const socket = io(JUNGLE_WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('nft.updated', (event: NftUpdatedEvent) => {
      if (event.nftId === activeNftId) {
        queryClient.setQueryData<NFT>(['nft', activeNftId], (oldNft) => {
          if (!oldNft || event.version <= (oldNft.version || 0)) return oldNft;
          return {
            ...oldNft,
            version: event.version,
            priceEth: event.priceEth,
            isAvailable: event.isAvailable,
            availableEditions: event.availableEditions,
            updatedAt: event.updatedAt,
          };
        });
        toast.info(`Preço/estoque de ${event.nftId} atualizado em tempo real.`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeNftId, queryClient]);

  // Optimistic Favorite Mutation with Rollback
  const favoriteMutation = useMutation({
    mutationFn: async (currentlyFav: boolean) => {
      if (currentlyFav) {
        const res = await apiClient.delete<{ success: boolean; nftIds: string[] }>(
          `/favorites/${activeNftId}`
        );
        return res.data;
      } else {
        const res = await apiClient.post<{ success: boolean; nftIds: string[] }>(
          `/favorites/${activeNftId}`
        );
        return res.data;
      }
    },
    onMutate: async (currentlyFav: boolean) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData<FavoritesResponse>(['favorites']);

      queryClient.setQueryData<FavoritesResponse>(['favorites'], (old) => {
        const prevIds = old?.nftIds || [];
        const prevItems = old?.items || [];
        if (currentlyFav) {
          return {
            nftIds: prevIds.filter((id) => id !== activeNftId),
            items: prevItems.filter((item) => item.id !== activeNftId),
          };
        }
        return {
          nftIds: [...prevIds, activeNftId],
          items: nft ? [...prevItems, nft] : prevItems,
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
    onSuccess: (_data, currentlyFav) => {
      toast.success(
        currentlyFav ? 'Removido da sua lista de favoritos.' : 'NFT adicionado aos favoritos!'
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  // Add to Cart Mutation ("COMPRAR")
  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<CartResponse>('/cart/items', {
        nftId: activeNftId,
        quantity,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      toast.success(
        `${quantity}x ${nft?.name || 'NFT'} (${selectedEdition}) adicionado ao carrinho!`
      );
      navigate({ to: '/carrinho' });
    },
    onError: () => {
      navigate({ to: '/carrinho' });
    },
  });

  // Resolve main high-res artwork for the hero preview
  const getMainArtworkUrl = (item?: NFT): string => {
    if (!item) return '/assets/nfts/emerald-ape.png';
    if (item.id === 'nft-1') return '/assets/nfts/emerald-ape.png';
    if (item.id === 'nft-2' || item.id === 'nft-4' || item.id === 'nft-5') {
      return '/assets/nfts/sage-nomad-featured.png';
    }
    if (item.id === 'nft-3' || item.id === 'nft-6') {
      return '/assets/nfts/ivory-baron.png';
    }
    if (item.id === 'nft-7' || item.id === 'nft-8' || item.id === 'nft-9') {
      return '/assets/nfts/golden-beat.png';
    }
    return item.imageUrl;
  };

  // Resolve token number (e.g., "#042" -> "#0042" as in Figma "ID do token: #0042")
  const getTokenNumberLabel = (item?: NFT): string => {
    if (!item) return '#0042';
    const match = item.name.match(/#(\d+)/);
    if (match) {
      return `#${match[1].padStart(4, '0')}`;
    }
    return '#0042';
  };

  // Build "Mais desta coleção" 5 cards matching Figma screenshot exactly
  const relatedNfts = MAIS_DESTA_COLECAO_ITEMS;

  const mainArtwork = getMainArtworkUrl(nft);
  const maxAvailable = Math.max(1, nft?.availableEditions || 10);

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      {/* Figma Container: width 1440px, padding 16px 120px 24px */}
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-6 flex flex-col">
        {/* 1. HEADER */}
        <Header />

        {/* 2. BREADCRUMB: Início / Mercado */}
        <nav aria-label="Breadcrumb" className="mt-5 mb-4 text-xs flex items-center gap-1.5">
          <Link to="/" className="text-[#FAF5F0] font-bold hover:text-[#D1823C] transition-colors">
            Início
          </Link>
          <span aria-hidden="true" className="text-[#8C7A6B]">
            /
          </span>
          <span className="text-[#A8968A]">Mercado</span>
        </nav>

        {/* LOADING SKELETON */}
        {isLoading && (
          <div
            aria-busy="true"
            aria-label="Carregando detalhes do NFT"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16"
          >
            <div className="lg:col-span-6 flex gap-4">
              <div className="flex flex-col gap-3 w-[84px] shrink-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-[84px] h-[84px] rounded-lg skeleton-shimmer" />
                ))}
              </div>
              <div className="flex-1 aspect-square rounded-xl skeleton-shimmer" />
            </div>
            <div className="lg:col-span-6 flex flex-col gap-4">
              <div className="h-8 w-2/3 rounded skeleton-shimmer" />
              <div className="h-5 w-1/2 rounded skeleton-shimmer" />
              <div className="h-20 w-full rounded skeleton-shimmer mt-2" />
              <div className="h-10 w-1/2 rounded skeleton-shimmer mt-2" />
              <div className="h-12 w-full rounded skeleton-shimmer mt-2" />
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {!isLoading && isError && (
          <div
            role="alert"
            className="bg-[#1F1510] border border-red-500/30 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4 my-8"
          >
            <AlertCircle className="w-10 h-10 text-red-400" />
            <div>
              <h2 className="text-[#FAF5F0] font-bold text-base">
                Não foi possível carregar os detalhes deste NFT
              </h2>
              <p className="text-[#A8968A] text-xs mt-1 max-w-md">
                Verifique sua conexão ou tente recarregar o ativo selecionado.
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

        {/* 3. NFT HERO PRODUCT SECTION */}
        {!isLoading && !isError && nft && (
          <>
            <section
              aria-label={`Detalhes de ${nft.name}`}
              className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-9 items-start mb-14"
            >
              {/* LEFT GALLERY: 4 Vertical Thumbnails + Main Artwork with Zoom Icon */}
              <div className="lg:col-span-6 flex flex-col-reverse sm:flex-row gap-3.5 items-stretch">
                {/* 4 Vertical Thumbnails */}
                <div
                  role="tablist"
                  aria-label="Miniaturas da obra"
                  className="flex sm:flex-col gap-3 shrink-0 justify-between"
                >
                  {[0, 1, 2, 3].map((thumbIdx) => {
                    const isSelected = selectedThumbIndex === thumbIdx;
                    return (
                      <button
                        key={thumbIdx}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={`Visualizar ângulo ${thumbIdx + 1} de ${nft.name}`}
                        onClick={() => setSelectedThumbIndex(thumbIdx)}
                        className={`w-[74px] h-[74px] sm:w-[82px] sm:h-[82px] rounded-[8px] p-1.5 bg-[#24160F] overflow-hidden transition-all cursor-pointer ${isSelected
                          ? 'ring-2 ring-[#D1823C]'
                          : 'opacity-85 hover:opacity-100 hover:ring-1 hover:ring-[#D1823C]/50'
                          }`}
                      >
                        <img
                          src={mainArtwork}
                          alt={`${nft.name} miniatura ${thumbIdx + 1}`}
                          width={82}
                          height={82}
                          className="w-full h-full object-cover rounded-[5px]"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Main Artwork Frame */}
                <div className="flex-1 bg-[#24160F] rounded-[10px] p-3.5 relative flex items-center justify-center">
                  {/* Top-Right Magnifying Glass Button */}
                  <button
                    type="button"
                    onClick={() => setIsZoomModalOpen(true)}
                    aria-label="Ampliar imagem do NFT"
                    className="absolute top-5 right-5 z-10 w-7 h-7 rounded-full bg-[#140D0A]/80 hover:bg-[#140D0A] text-[#FAF5F0] hover:text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-full aspect-square rounded-[10px] overflow-hidden">
                    <img
                      src={mainArtwork}
                      alt={nft.name}
                      width={350}
                      height={350}
                      fetchPriority="high"
                      className="w-full h-full object-cover transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT INFO COLUMN */}
              <div className="lg:col-span-6 flex flex-col">
                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#FAF5F0] tracking-tight">
                  {nft.name}
                </h1>

                {/* Price + Star Rating Row with subtle bottom border */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mt-1.5 border-b border-[#2C1E16]">
                  <span className="text-[#D1823C] font-extrabold text-sm sm:text-base">
                    {nft.priceEth} ETH
                  </span>

                  <div className="flex items-center gap-2">
                    <div
                      aria-label="Classificação 5 de 5 estrelas"
                      className="flex items-center gap-0.5 text-[#D1823C] text-xs"
                    >
                      <span>★</span>
                      <span>★</span>
                      <span>★</span>
                      <span>★</span>
                      <span>★</span>
                    </div>
                    <span className="text-[#C2B2A6] text-[11px]">
                      19 avaliações de colecionadores
                    </span>
                  </div>
                </div>

                {/* Sobre este NFT */}
                <div className="mt-3.5">
                  <h2 className="text-[#FAF5F0] font-bold text-xs mb-1.5">Sobre este NFT:</h2>
                  <p className="text-[#B5A395] text-[11px] leading-[1.55]">
                    Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado
                    na {nft.network || 'Ethereum'}, com arte desbloqueável e acesso para
                    colecionadores.
                  </p>
                </div>

                {/* Edição Selector */}
                <div className="mt-3.5">
                  <h2 className="text-[#FAF5F0] font-bold text-xs mb-2">Edição:</h2>
                  <div
                    role="radiogroup"
                    aria-label="Selecionar edição"
                    className="flex flex-wrap items-center gap-2"
                  >
                    {EDITION_OPTIONS.map((ed) => {
                      const isSelected = selectedEdition === ed.id;
                      return (
                        <button
                          key={ed.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setSelectedEdition(ed.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-colors cursor-pointer ${isSelected
                            ? 'border border-[#D1823C] text-[#D1823C] bg-[#D1823C]/10'
                            : 'border border-transparent text-[#8C7A6B] hover:text-[#FAF5F0]'
                            }`}
                        >
                          {ed.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity Controls + COMPRAR + Favoritar Row */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  {/* Left Quantity Pill Buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-6 h-8 rounded-full bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <span
                      data-testid="nft-detail-quantity"
                      className="text-[#FAF5F0] font-bold text-xs min-w-[16px] text-center"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                      className="w-6 h-8 rounded-full bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={!nft.isAvailable || addToCartMutation.isPending}
                      onClick={() => addToCartMutation.mutate()}
                      className="bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-50 text-[#140D0A] font-extrabold text-[11px] uppercase tracking-wider px-6 py-2.5 rounded-[5px] transition-colors cursor-pointer"
                    >
                      {addToCartMutation.isPending ? 'ADICIONANDO...' : 'COMPRAR'}
                    </button>

                    <button
                      type="button"
                      aria-pressed={isFavorited}
                      onClick={() => favoriteMutation.mutate(isFavorited)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[5px] border text-[11px] font-semibold transition-colors cursor-pointer ${isFavorited
                        ? 'border-[#D1823C] bg-[#D1823C]/15 text-[#D1823C]'
                        : 'border-[#5C3D28] hover:border-[#D1823C] text-[#C2B2A6] hover:text-[#FAF5F0]'
                        }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isFavorited ? 'fill-[#D1823C] text-[#D1823C]' : 'text-[#C2B2A6]'
                          }`}
                      />
                      <span>Favoritar</span>
                    </button>
                  </div>
                </div>

                {/* Metadata Lines */}
                <div className="mt-4 space-y-1 text-[11px] text-[#8C7A6B]">
                  <div>
                    ID do token: <span className="text-[#B5A395]">{getTokenNumberLabel(nft)}</span>
                  </div>
                  <div>
                    Coleção: <span className="text-[#B5A395]">Kurio Apes</span>
                  </div>
                  <div>
                    Atributos: <span className="text-[#B5A395]">Óculos, Esmeralda, Raro</span>
                  </div>
                </div>

                {/* Share Row */}
                <div className="mt-2.5 flex items-center gap-2.5 text-[11px] text-[#FAF5F0] font-semibold">
                  <span>Compartilhar este NFT:</span>
                  <div className="flex items-center gap-2 text-[#FAF5F0]">
                    {/* LinkedIn */}
                    <button
                      type="button"
                      aria-label="Compartilhar no LinkedIn"
                      onClick={() => toast.success('Link copiado para compartilhar no LinkedIn!')}
                      className="hover:text-[#D1823C] transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
                      </svg>
                    </button>

                    {/* Email */}
                    <button
                      type="button"
                      aria-label="Compartilhar por E-mail"
                      onClick={() => toast.success('Link copiado para compartilhar por e-mail!')}
                      className="hover:text-[#D1823C] transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5 stroke-current fill-none"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </button>

                    {/* Twitter */}
                    <button
                      type="button"
                      aria-label="Compartilhar no Twitter"
                      onClick={() => toast.success('Link copiado para compartilhar no Twitter!')}
                      className="hover:text-[#D1823C] transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. TABS SECTION: Detalhes do NFT | Avaliações de colecionadores (19) */}
            <section aria-label="Informações técnicas e avaliações" className="w-full mb-16">
              <div
                role="tablist"
                aria-label="Abas de detalhes do NFT"
                className="flex items-center gap-6 border-b border-[#2C1E16] mb-5"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'details'}
                  onClick={() => setActiveTab('details')}
                  className={`relative pb-2.5 text-xs font-bold transition-colors cursor-pointer ${activeTab === 'details'
                    ? 'text-[#D1823C]'
                    : 'text-[#FAF5F0] hover:text-[#D1823C]'
                    }`}
                >
                  Detalhes do NFT
                  {activeTab === 'details' && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D1823C]"
                    />
                  )}
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'reviews'}
                  onClick={() => setActiveTab('reviews')}
                  className={`relative pb-2.5 text-xs font-medium transition-colors cursor-pointer ${activeTab === 'reviews'
                    ? 'text-[#D1823C] font-bold'
                    : 'text-[#FAF5F0] hover:text-[#D1823C]'
                    }`}
                >
                  Avaliações de colecionadores (19)
                  {activeTab === 'reviews' && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D1823C]"
                    />
                  )}
                </button>
              </div>

              {activeTab === 'details' ? (
                <div className="space-y-4 text-[11px] leading-[1.65] text-[#B5A395]">
                  <p>
                    {nft.name} é uma obra digital {selectedEdition} finalizada à mão da coleção
                    Kurio Editions. Cada atributo fica armazenado nos metadados do token e
                    verificado na {nft.network || 'Ethereum'}. A obra explora identidade, movimento
                    e luz em um mundo digital sem fronteiras.
                  </p>
                  <p>
                    A propriedade inclui a arte em alta resolução, lançamentos exclusivos para
                    colecionadores e um registro permanente de procedência registrada na rede. Nova
                    Sato recebe 5% de direitos autorais nas vendas secundárias, apoiando novos
                    trabalhos e lançamentos da comunidade.
                  </p>

                  <div>
                    <h3 className="text-[#FAF5F0] font-bold text-xs mb-0.5">Rede:</h3>
                    <p>
                      Cunhado na {nft.network || 'Ethereum'} com procedência imutável e metadados
                      armazenados no IPFS.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[#FAF5F0] font-bold text-xs mb-0.5">Contrato:</h3>
                    <p>
                      Direitos autorais do criador: 5% nas vendas secundárias, pagos
                      automaticamente pelos mercados compatíveis.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-[#FAF5F0] font-bold text-xs mb-0.5">Direitos autorais:</h3>
                    <p>0x7A42...19E8 - Contrato inteligente ERC-721 verificado.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {COLLECTOR_REVIEWS.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-[#1F1510] border border-[#2C1E16] rounded-lg p-4 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[#FAF5F0] font-bold text-xs">{rev.author}</span>
                        <span className="text-[#8C7A6B] text-[10px]">{rev.date}</span>
                      </div>
                      <div className="text-[#D1823C] text-xs">{'★'.repeat(rev.rating)}</div>
                      <p className="text-[#B5A395] text-[11px] leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 5. MAIS DESTA COLEÇÃO (5-Card Row + 3 Carousel Dots) */}
            <section aria-label="Mais desta coleção" className="w-full mb-20">
              <div className="border-b border-[#2C1E16] pb-2 mb-6">
                <h2 className="text-[#D1823C] font-bold text-xs">Mais desta coleção</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                {relatedNfts.map((item) => (
                  <article key={item.id} className="flex flex-col group">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        navigate({
                          search: { id: item.id },
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate({ search: { id: item.id } });
                        }
                      }}
                      aria-label={`Ver detalhes de ${item.name}, ${item.priceEth} ETH`}
                      className="w-full aspect-[193/223] overflow-hidden relative cursor-pointer bg-[#24160F] transition-transform duration-200 group-hover:-translate-y-1"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        width={193}
                        height={223}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <h3 className="text-[#FAF5F0] text-xs font-medium mt-2.5 truncate">
                      {item.name}
                    </h3>
                    <div className="text-[#D1823C] font-extrabold text-xs mt-0.5">
                      {item.priceEth} ETH
                    </div>
                  </article>
                ))}
              </div>

              {/* 3 Dots Pagination (Middle filled, outer outlined matching Figma) */}
              <div
                role="tablist"
                aria-label="Navegação da coleção"
                className="flex items-center justify-center gap-2 mt-8"
              >
                {[0, 1, 2].map((dotIdx) => {
                  const isCurrent = carouselDot === dotIdx;
                  return (
                    <button
                      key={dotIdx}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`Página ${dotIdx + 1} da coleção`}
                      onClick={() => setCarouselDot(dotIdx)}
                      className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${isCurrent
                        ? 'bg-[#D1823C]'
                        : 'border border-[#D1823C] bg-transparent hover:bg-[#D1823C]/40'
                        }`}
                    />
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* 6. FOOTER */}
        <Footer
          onSelectCategory={(category) =>
            navigate({
              to: '/',
              search: {
                search: '',
                category,
                network: 'All',
                tab: 'all',
                sort: 'newest',
                page: 1,
                limit: 9,
              },
            })
          }
        />
      </div>

      {/* LIGHTBOX ZOOM MODAL */}
      {isZoomModalOpen && nft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização ampliada de ${nft.name}`}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsZoomModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-[#24160F] border border-[#422D1D] rounded-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Fechar visualização ampliada"
              onClick={() => setIsZoomModalOpen(false)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#140D0A]/80 text-[#FAF5F0] hover:text-[#D1823C] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={mainArtwork}
              alt={nft.name}
              className="w-full aspect-square object-cover rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
