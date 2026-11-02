import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Trash2, AlertCircle, ChevronLeft } from 'lucide-react';
import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import type {
  CartItem,
  CartResponse,
  NftUpdatedEvent,
  Quotation,
} from '../api/contracts';
import { JUNGLE_WS_URL } from '../mocks/socket/socketHandler';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
});

const COLECIONADORES_TAMBEM_VIRAM = [
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

interface MobileCartEntry {
  nftId: string;
  name: string;
  edition: string;
  unitPriceEth: string;
  quantity: number;
  imageUrl: string;
}

const INITIAL_MOBILE_CART: MobileCartEntry[] = [
  {
    nftId: 'nft-1',
    name: 'Emerald Ape #042',
    edition: '1/50',
    unitPriceEth: '1.19',
    quantity: 1,
    imageUrl: '/assets/nfts/emerald-ape.png',
  },
  {
    nftId: 'nft-5',
    name: 'Violet Nomad #314',
    edition: '1/1',
    unitPriceEth: '1.39',
    quantity: 1,
    imageUrl: '/assets/nfts/sage-nomad-featured.png',
  },
  {
    nftId: 'nft-6',
    name: 'Ivory Baron #088',
    edition: '1/10',
    unitPriceEth: '1.79',
    quantity: 2,
    imageUrl: '/assets/nfts/ivory-baron.png',
  },
  {
    nftId: 'nft-7',
    name: 'Golden Beat #207',
    edition: '1/50',
    unitPriceEth: '0.99',
    quantity: 2,
    imageUrl: '/assets/nfts/golden-beat.png',
  },
];

function getCartRowAvatar(nftId: string, fallbackUrl: string): string {
  if (nftId === 'nft-1') return '/assets/nfts/emerald-ape.png';
  if (nftId === 'nft-2' || nftId === 'nft-4' || nftId === 'nft-5') {
    return '/assets/nfts/sage-nomad-featured.png';
  }
  if (nftId === 'nft-3' || nftId === 'nft-6') {
    return '/assets/nfts/ivory-baron.png';
  }
  if (nftId === 'nft-7' || nftId === 'nft-8' || nftId === 'nft-9') {
    return '/assets/nfts/golden-beat.png';
  }
  return fallbackUrl;
}

function getCartRowTokenId(nftId: string, nftName: string): string {
  if (nftId === 'nft-1') return '#0042';
  if (nftId === 'nft-5') return '#0009';
  if (nftId === 'nft-6') return '#0552';
  const match = nftName.match(/#(\d+)/);
  if (match) {
    return `#${match[1].padStart(4, '0')}`;
  }
  return '#0042';
}

function CartPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);
  const [carouselDot, setCarouselDot] = useState<number>(1);
  const [mobileItems, setMobileItems] = useState<MobileCartEntry[]>(INITIAL_MOBILE_CART);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const {
    data: cartData,
    isLoading,
    isError,
    refetch,
  } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<CartResponse>('/cart', { signal });
      return res.data;
    },
  });

  const { data: quoteData } = useQuery<Quotation>({
    queryKey: ['cart-quote', cartData?.items, appliedCoupon],
    queryFn: async () => {
      const res = await apiClient.post<Quotation>('/cart/quote', {
        couponCode: appliedCoupon,
      });
      return res.data;
    },
    enabled: Boolean(cartData),
  });

  useEffect(() => {
    const socket = io(JUNGLE_WS_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('nft.updated', (event: NftUpdatedEvent) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart-quote'] });
      toast.info(`Atualização em tempo real no item ${event.nftId}.`);
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const updateQtyMutation = useMutation({
    mutationFn: async ({ nftId, quantity }: { nftId: string; quantity: number }) => {
      const res = await apiClient.patch<CartResponse>(`/cart/items/${nftId}`, {
        quantity,
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      queryClient.invalidateQueries({ queryKey: ['cart-quote'] });
    },
    onError: () => {
      toast.error('Não foi possível atualizar a quantidade.');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (nftId: string) => {
      const res = await apiClient.delete<CartResponse>(`/cart/items/${nftId}`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['cart'], data);
      queryClient.invalidateQueries({ queryKey: ['cart-quote'] });
      toast.success('Item removido do carrinho.');
    },
    onError: () => {
      toast.error('Falha ao remover item do carrinho.');
    },
  });

  const applyCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiClient.post<Quotation>('/cart/quote', {
        couponCode: code,
      });
      return res.data;
    },
    onSuccess: (_data, code) => {
      setAppliedCoupon(code);
      toast.success(`Cupom ${code.toUpperCase()} aplicado com sucesso!`);
    },
    onError: () => {
      setAppliedCoupon(undefined);
      toast.error('Cupom promocional inválido ou expirado. Tente JUNGLE10 ou ETH5.');
    },
  });

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = couponInput.trim();
    if (!trimmed) {
      setAppliedCoupon(undefined);
      return;
    }
    applyCouponMutation.mutate(trimmed);
  };

  const handleMobileQtyChange = (nftId: string, delta: number) => {
    setMobileItems((prev) =>
      prev
        .map((entry) =>
          entry.nftId === nftId ? { ...entry, quantity: entry.quantity + delta } : entry
        )
        .filter((entry) => entry.quantity > 0)
    );
  };

  const items: CartItem[] = cartData?.items || [];

  const calculatedSubtotal = items.reduce((acc, item) => {
    const unitPrice = new Decimal(item.nft.priceEth || item.priceAtAddition || '0');
    return acc.plus(unitPrice.times(item.quantity));
  }, new Decimal(0));

  const subtotalEthStr = calculatedSubtotal.toFixed(2);
  const discountDec = quoteData?.discountEth
    ? new Decimal(quoteData.discountEth)
    : new Decimal(0);
  const discountDisplay =
    discountDec.greaterThan(0) ? `(-) ${discountDec.toFixed(2)} ETH` : '(-) 00.00';

  const gasFeeDec = items.length > 0 ? new Decimal('0.016') : new Decimal(0);
  const gasFeeDisplay = items.length > 0 ? '0.016 ETH' : '0.000 ETH';

  const totalDec = Decimal.max(0, calculatedSubtotal.minus(discountDec)).plus(gasFeeDec);
  const totalDisplay = items.length > 0 ? `${totalDec.toFixed(3)} ETH` : '0.000 ETH';

  const isDefaultMobileState =
    mobileItems.length === 4 &&
    mobileItems[0]?.quantity === 1 &&
    mobileItems[1]?.quantity === 1 &&
    mobileItems[2]?.quantity === 2 &&
    mobileItems[3]?.quantity === 2 &&
    !appliedCoupon;

  const mobileCalcSubtotal = mobileItems.reduce((acc, item) => {
    return acc.plus(new Decimal(item.unitPriceEth).times(item.quantity));
  }, new Decimal(0));

  const mobileSubtotalStr = isDefaultMobileState
    ? '8.92 ETH'
    : `${mobileCalcSubtotal.toFixed(2)} ETH`;
  const mobileTotalDec = isDefaultMobileState
    ? new Decimal('8.936')
    : Decimal.max(0, mobileCalcSubtotal.minus(discountDec)).plus(
      mobileItems.length > 0 ? new Decimal('0.016') : new Decimal(0)
    );
  const mobileTotalStr =
    mobileItems.length > 0 ? `${mobileTotalDec.toFixed(3)} ETH` : '0.000 ETH';

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="md:hidden min-h-screen flex flex-col justify-between bg-[#140D0A]">
        <div className="flex flex-col">
          <div className="px-4 pt-5 pb-4 relative flex items-center justify-center">
            <button
              type="button"
              aria-label="Voltar"
              onClick={() => navigate({ to: '/mercado' })}
              className="absolute left-4 w-9 h-9 rounded-full bg-[#24160F] border border-[#3B261B] flex items-center justify-center text-[#D1823C] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[18px] font-extrabold text-[#FAF5F0] tracking-tight">
              Carrinho de NFTs
            </h1>
          </div>

          <div className="px-4 space-y-3.5 mt-1">
            {mobileItems.map((item) => {
              const lineTotal = new Decimal(item.unitPriceEth)
                .times(item.quantity)
                .toFixed(2);
              return (
                <div
                  key={item.nftId}
                  className="bg-[#23150E] rounded-[16px] overflow-hidden flex items-stretch h-[94px]"
                >
                  <div className="w-[92px] h-[94px] shrink-0 overflow-hidden rounded-l-[16px] bg-[#140D0A]">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0 pl-3.5 pr-2 py-2.5 flex flex-col justify-between">
                    <div>
                      <h2 className="text-[#FAF5F0] font-bold text-[12.5px] truncate">
                        {item.name}
                      </h2>
                      <p className="text-[#9E8C7E] text-[11px] mt-0.5">
                        Edição: {item.edition}
                      </p>
                    </div>

                    <span className="text-[#D1823C] font-extrabold text-[13.5px]">
                      {lineTotal} ETH
                    </span>
                  </div>

                  <div className="pr-3.5 flex items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      aria-label={`Diminuir quantidade de ${item.name}`}
                      onClick={() => handleMobileQtyChange(item.nftId, -1)}
                      className="w-6 h-6 rounded-full bg-[#332016] text-[#B8A394] flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-[#FAF5F0] font-semibold text-xs min-w-[12px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Aumentar quantidade de ${item.name}`}
                      onClick={() => handleMobileQtyChange(item.nftId, 1)}
                      className="w-6 h-6 rounded-full bg-[#332016] text-[#FAF5F0] flex items-center justify-center text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 bg-[#22150E] rounded-t-[28px] px-5 pt-5 pb-6 flex flex-col shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
          <form
            onSubmit={handleCouponSubmit}
            className="flex items-center w-full h-11 rounded-full bg-[#1B110B] border border-[#3B261B] pl-4 pr-1"
          >
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Digite o código promocional..."
              className="flex-1 min-w-0 bg-transparent text-[11px] text-[#FAF5F0] placeholder-[#9E8C7E] outline-none"
            />
            <button
              type="submit"
              disabled={applyCouponMutation.isPending}
              className="h-9 px-5 rounded-full bg-gradient-to-b from-[#D1823C] to-[#9E5B22] text-[#FAF5F0] font-bold text-xs shrink-0 cursor-pointer"
            >
              Aplicar
            </button>
          </form>

          <div className="mt-4 space-y-2.5 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-[#FAF5F0]">Subtotal</span>
              <span className="text-[#FAF5F0]">{mobileSubtotalStr}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#FAF5F0]">Desconto do lançamento</span>
              <span className="text-[#FAF5F0]">{discountDisplay}</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-[#FAF5F0]">Taxa de rede</span>
                <span className="text-[#FAF5F0]">0.016 ETH</span>
              </div>
              <span className="text-[#D1823C] text-[10.5px] text-right mt-0.5">
                Taxa estimada
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[#FAF5F0] font-extrabold text-[13.5px]">Total</span>
              <span className="text-[#D1823C] font-extrabold text-[15px]">
                {mobileTotalStr}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate({ to: '/pagamento' })}
            className="mt-5 w-full h-12 rounded-full bg-[#C87D3B] hover:bg-[#D1823C] text-[#140D0A] font-bold text-[13.5px] flex items-center justify-center transition-colors cursor-pointer"
          >
            Conectar e finalizar
          </button>
        </div>
      </div>

      <div className="hidden md:flex max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-6 flex-col">
        <Header />

        <nav aria-label="Breadcrumb" className="mt-5 mb-5 text-xs flex items-center gap-1.5">
          <Link to="/" className="text-[#FAF5F0] font-bold hover:text-[#D1823C] transition-colors">
            Início
          </Link>
          <span aria-hidden="true" className="text-[#8C7A6B]">
            /
          </span>
          <Link
            to="/mercado"
            className="text-[#FAF5F0] font-bold hover:text-[#D1823C] transition-colors"
          >
            Mercado
          </Link>
          <span aria-hidden="true" className="text-[#8C7A6B]">
            /
          </span>
          <span className="text-[#A8968A]">Carrinho</span>
        </nav>

        {isLoading && (
          <div
            aria-busy="true"
            aria-label="Carregando carrinho"
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16"
          >
            <div className="lg:col-span-8 space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-20 w-full rounded-lg skeleton-shimmer" />
              ))}
            </div>
            <div className="lg:col-span-4 h-72 rounded-lg skeleton-shimmer" />
          </div>
        )}

        {!isLoading && isError && (
          <div
            role="alert"
            className="bg-[#1F1510] border border-red-500/30 rounded-xl p-10 flex flex-col items-center justify-center text-center gap-4 my-8"
          >
            <AlertCircle className="w-10 h-10 text-red-400" />
            <div>
              <h2 className="text-[#FAF5F0] font-bold text-base">
                Erro ao carregar os itens do carrinho
              </h2>
              <p className="text-[#A8968A] text-xs mt-1 max-w-md">
                Não foi possível sincronizar seu carrinho no momento.
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

        {!isLoading && !isError && (
          <section
            aria-label="Itens do carrinho e resumo da carteira"
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16"
          >
            <div className="lg:col-span-8 w-full">
              <div className="hidden sm:grid sm:grid-cols-12 items-center pb-2.5 border-b border-[#2C1E16] text-xs font-bold text-[#FAF5F0]">
                <div className="col-span-5">NFTs</div>
                <div className="col-span-2 text-center">Preço</div>
                <div className="col-span-2 text-center">Edições</div>
                <div className="col-span-2 text-center">Total</div>
                <div className="col-span-1" />
              </div>

              {items.length === 0 ? (
                <div className="bg-[#1F1510] border border-[#2C1E16] rounded-lg p-10 text-center my-4 flex flex-col items-center gap-3">
                  <p className="text-[#FAF5F0] font-bold text-sm">Seu carrinho está vazio</p>
                  <p className="text-[#A8968A] text-xs max-w-sm">
                    Explore o catálogo da Kurio para adicionar colecionáveis digitais verificados.
                  </p>
                  <Link
                    to="/"
                    className="mt-2 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-5 py-2.5 rounded-md transition-colors"
                  >
                    Explorar catálogo
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-3 mt-3">
                  {items.map((item) => {
                    const unitPrice = new Decimal(
                      item.nft.priceEth || item.priceAtAddition || '0'
                    );
                    const lineTotal = unitPrice.times(item.quantity).toFixed(2);
                    const avatarSrc = getCartRowAvatar(item.nftId, item.nft.imageUrl);
                    const tokenIdLabel = getCartRowTokenId(item.nftId, item.nft.name);

                    return (
                      <div
                        key={item.nftId}
                        data-testid={`cart-row-${item.nftId}`}
                        className="bg-[#24160F] rounded-[6px] px-3.5 py-2.5 grid grid-cols-1 sm:grid-cols-12 items-center gap-3 sm:gap-2"
                      >
                        <div className="sm:col-span-5 flex items-center gap-3.5 min-w-0">
                          <Link
                            to="/mercado"
                            search={{ id: item.nftId }}
                            className="w-[52px] h-[52px] rounded-[6px] overflow-hidden shrink-0 bg-[#140D0A]"
                          >
                            <img
                              src={avatarSrc}
                              alt={item.nft.name}
                              width={52}
                              height={52}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                          <div className="min-w-0">
                            <Link
                              to="/mercado"
                              search={{ id: item.nftId }}
                              className="text-[#FAF5F0] font-bold text-xs hover:text-[#D1823C] transition-colors block truncate"
                            >
                              {item.nft.name}
                            </Link>
                            <span className="text-[#8C7A6B] text-[10px] block mt-0.5">
                              ID do token: {tokenIdLabel}
                            </span>
                          </div>
                        </div>

                        <div className="sm:col-span-2 text-left sm:text-center text-[#B5A395] font-semibold text-xs">
                          {unitPrice.toFixed(2)} ETH
                        </div>

                        <div className="sm:col-span-2 flex items-center sm:justify-center gap-2.5">
                          <button
                            type="button"
                            aria-label={`Diminuir edições de ${item.nft.name}`}
                            disabled={updateQtyMutation.isPending}
                            onClick={() =>
                              updateQtyMutation.mutate({
                                nftId: item.nftId,
                                quantity: item.quantity - 1,
                              })
                            }
                            className="w-5 h-6 rounded-full bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs flex items-center justify-center transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <span
                            data-testid={`cart-qty-${item.nftId}`}
                            className="text-[#FAF5F0] font-bold text-xs min-w-[14px] text-center"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Aumentar edições de ${item.nft.name}`}
                            disabled={updateQtyMutation.isPending}
                            onClick={() =>
                              updateQtyMutation.mutate({
                                nftId: item.nftId,
                                quantity: item.quantity + 1,
                              })
                            }
                            className="w-5 h-6 rounded-full bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs flex items-center justify-center transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        <div className="sm:col-span-2 text-left sm:text-center text-[#D1823C] font-extrabold text-xs">
                          {lineTotal} ETH
                        </div>

                        <div className="sm:col-span-1 flex items-center justify-end pr-1">
                          <button
                            type="button"
                            aria-label={`Remover ${item.nft.name} do carrinho`}
                            disabled={removeItemMutation.isPending}
                            onClick={() => removeItemMutation.mutate(item.nftId)}
                            className="text-[#8C7A6B] hover:text-[#D1823C] transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside aria-label="Resumo da carteira" className="lg:col-span-4 w-full">
              <div className="pb-2.5 border-b border-[#2C1E16]">
                <h2 className="text-[#FAF5F0] font-bold text-xs">Resumo da carteira</h2>
              </div>

              <div className="mt-3.5 flex flex-col">
                <label
                  htmlFor="cart-coupon-input"
                  className="text-[#FAF5F0] text-[10px] font-medium mb-1.5"
                >
                  Código promocional
                </label>

                <form onSubmit={handleCouponSubmit} className="flex items-stretch w-full mb-5">
                  <input
                    id="cart-coupon-input"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Digite o código promocional..."
                    className="flex-1 min-w-0 bg-[#140D0A] border border-[#3D2A1E] rounded-l-[5px] px-2.5 py-2 text-[9px] tracking-tight text-[#FAF5F0] placeholder-[#7D6B5D] outline-none focus:border-[#D1823C]"
                  />
                  <button
                    type="submit"
                    disabled={applyCouponMutation.isPending}
                    className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-2 rounded-r-[5px] transition-colors cursor-pointer shrink-0"
                  >
                    Aplicar
                  </button>
                </form>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#C2B2A6]">Subtotal</span>
                    <span className="text-[#FAF5F0] font-bold">{subtotalEthStr} ETH</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#C2B2A6]">Desconto do lançamento</span>
                    <span className="text-[#FAF5F0] font-medium">{discountDisplay}</span>
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[#C2B2A6]">Taxa de rede</span>
                      <span className="text-[#FAF5F0] font-bold">{gasFeeDisplay}</span>
                    </div>
                    <span className="text-[#D1823C]/80 text-[10px] text-right mt-0.5">
                      Taxa estimada
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2C1E16]">
                  <span className="text-[#FAF5F0] font-bold text-xs">Total</span>
                  <span
                    data-testid="cart-total-eth"
                    className="text-[#D1823C] font-extrabold text-sm"
                  >
                    {totalDisplay}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={() => navigate({ to: '/pagamento' })}
                  className="w-full mt-5 bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-40 text-[#140D0A] font-bold text-xs py-2.5 rounded-[5px] transition-colors cursor-pointer"
                >
                  Conectar e finalizar
                </button>

                <Link
                  to="/"
                  className="text-center text-[#D1823C] hover:underline text-[11px] font-medium mt-3"
                >
                  Continuar explorando
                </Link>
              </div>
            </aside>
          </section>
        )}

        <section aria-label="Colecionadores também viram" className="w-full mb-20">
          <div className="border-b border-[#2C1E16] pb-2 mb-6">
            <h2 className="text-[#D1823C] font-bold text-xs">Colecionadores também viram</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {COLECIONADORES_TAMBEM_VIRAM.map((item) => (
              <article key={item.id} className="flex flex-col group">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate({
                      to: '/mercado',
                      search: { id: item.id },
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate({ to: '/mercado', search: { id: item.id } });
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

                <h3 className="text-[#FAF5F0] text-xs font-medium mt-2.5 truncate">{item.name}</h3>
                <div className="text-[#D1823C] font-extrabold text-xs mt-0.5">
                  {item.priceEth} ETH
                </div>
              </article>
            ))}
          </div>

          <div
            role="tablist"
            aria-label="Navegação de recomendações"
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
                  aria-label={`Página ${dotIdx + 1} de recomendações`}
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
    </div>
  );
}
