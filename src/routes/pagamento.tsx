import { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, ChevronLeft, MoreVertical, Wallet } from 'lucide-react';
import Decimal from 'decimal.js';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import type {
  CartItem,
  CartResponse,
  Order,
  Quotation,
} from '../api/contracts';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export const Route = createFileRoute('/pagamento')({
  component: CheckoutPaymentPage,
});

function getCheckoutRowAvatar(nftId: string, fallbackUrl: string): string {
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

function getCheckoutTokenId(nftId: string, nftName: string): string {
  if (nftId === 'nft-1') return '#0042';
  if (nftId === 'nft-5') return '#0314';
  if (nftId === 'nft-6') return '#0088';
  const match = nftName.match(/#(\d+)/);
  if (match) {
    return `#${match[1].padStart(4, '0')}`;
  }
  return '#0042';
}

function CheckoutPaymentPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [network, setNetwork] = useState<'Ethereum' | 'Polygon' | 'Solana' | ''>('');
  const [profileName, setProfileName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [secondaryWallet, setSecondaryWallet] = useState('');
  const [walletType, setWalletType] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [email, setEmail] = useState('');
  const [ensDomain, setEnsDomain] = useState('.eth');
  const [useAnotherWallet, setUseAnotherWallet] = useState(false);
  const [collectorNote, setCollectorNote] = useState('');

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'multi' | 'metamask' | 'coinbase'
  >('coinbase');
  const [selectedMobileWallet, setSelectedMobileWallet] = useState<'reserva' | 'principal'>(
    'reserva'
  );
  const [selectedMobileProvider, setSelectedMobileProvider] = useState<
    'walletconnect' | 'metamask' | 'coinbase'
  >('coinbase');

  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);

  const [idempotencyKey] = useState<string>(
    () => `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { data: cartData, isLoading: isCartLoading } = useQuery<CartResponse>({
    queryKey: ['cart'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<CartResponse>('/cart', { signal });
      return res.data;
    },
  });

  const { data: quoteData, refetch: refetchQuote } = useQuery<Quotation>({
    queryKey: ['cart-quote', cartData?.items, appliedCoupon],
    queryFn: async () => {
      const res = await apiClient.post<Quotation>('/cart/quote', {
        couponCode: appliedCoupon,
      });
      return res.data;
    },
    enabled: Boolean(cartData),
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
      toast.success(`Cupom ${code.toUpperCase()} aplicado!`);
    },
    onError: () => {
      setAppliedCoupon(undefined);
      toast.error('Código promocional inválido ou expirado. Tente JUNGLE10 ou ETH5.');
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const activeQuoteId = quoteData?.quoteId;
      if (!activeQuoteId) {
        const refreshed = await refetchQuote();
        if (!refreshed.data?.quoteId) {
          throw new Error('Cotação indisponível');
        }
      }

      const finalQuoteId = quoteData?.quoteId || (await refetchQuote()).data!.quoteId;
      const resolvedAddress =
        walletAddress.trim() || '0x71C498b8A90123456789ABCDEF0123456789498b';
      const resolvedNetwork = (network || 'Ethereum') as 'Ethereum' | 'Polygon' | 'Solana';

      const res = await apiClient.post<Order>(
        '/orders',
        {
          quoteId: finalQuoteId,
          walletAddress: resolvedAddress,
          network: resolvedNetwork,
        },
        {
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        }
      );
      return res.data;
    },
    onSuccess: (order) => {
      setConfirmedOrder(order);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['nfts'] });
      if (order.status === 'CONFIRMED') {
        toast.success(`Compra confirmada na blockchain! Pedido #${order.id}`);
      } else {
        toast.error(order.failureReason || 'Transação rejeitada pela carteira.');
      }
    },
    onError: () => {
      toast.error(
        'Não foi possível concluir a transação no momento. Você pode tentar novamente com segurança (Idempotência ativa).'
      );
    },
  });

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (createOrderMutation.isPending) return;
    createOrderMutation.mutate();
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

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="md:hidden min-h-screen flex flex-col justify-between bg-[#140D0A] px-4 pt-5 pb-6">
        <div className="flex flex-col">
          <div className="relative flex items-center justify-center pb-5">
            <button
              type="button"
              aria-label="Voltar para o carrinho"
              onClick={() => navigate({ to: '/carrinho' })}
              className="absolute left-0 w-9 h-9 rounded-full bg-[#24160F] border border-[#3B261B] flex items-center justify-center text-[#D1823C] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-[18px] font-extrabold text-[#FAF5F0] tracking-tight">
              Pagamento com carteira
            </h1>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-bold text-[#FAF5F0]">Carteira conectada</h2>
            <button
              type="button"
              onClick={() =>
                setSelectedMobileWallet((prev) => (prev === 'reserva' ? 'principal' : 'reserva'))
              }
              className="text-[11.5px] font-bold text-[#D1823C] cursor-pointer"
            >
              Trocar carteira
            </button>
          </div>

          <div className="space-y-3.5 mb-6">
            <div
              role="radio"
              aria-checked={selectedMobileWallet === 'reserva'}
              tabIndex={0}
              onClick={() => setSelectedMobileWallet('reserva')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMobileWallet('reserva');
                }
              }}
              className="bg-[#22150E] rounded-[16px] px-4 py-3.5 flex items-center justify-between gap-3.5 cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedMobileWallet === 'reserva' ? 'border-[#D1823C]' : 'border-[#5A3B28]'
                  }`}
              >
                {selectedMobileWallet === 'reserva' && (
                  <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-[#FAF5F0] font-bold text-[13px]">Reserva</div>
                <div className="text-[#9E8C7E] text-[11.5px] mt-0.5">nova.kurio.eth</div>
                <div className="text-[#9E8C7E] text-[11.5px] mt-0.5">Rede Polygon</div>
              </div>

              <MoreVertical className="w-4 h-4 text-[#B8A394] shrink-0" />
            </div>

            <div
              role="radio"
              aria-checked={selectedMobileWallet === 'principal'}
              tabIndex={0}
              onClick={() => setSelectedMobileWallet('principal')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedMobileWallet('principal');
                }
              }}
              className="bg-[#22150E] rounded-[16px] px-4 py-3.5 flex items-center justify-between gap-3.5 cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedMobileWallet === 'principal' ? 'border-[#D1823C]' : 'border-[#5A3B28]'
                  }`}
              >
                {selectedMobileWallet === 'principal' && (
                  <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                )}
              </span>

              <div className="flex-1 min-w-0">
                <div className="text-[#FAF5F0] font-bold text-[13px]">Principal</div>
                <div className="text-[#9E8C7E] text-[11.5px] mt-0.5">0xA91F…E82C</div>
                <div className="text-[#9E8C7E] text-[11.5px] mt-0.5">Rede principal Ethereum</div>
              </div>

              <MoreVertical className="w-4 h-4 text-[#B8A394] shrink-0" />
            </div>
          </div>

          <h2 className="text-[13px] font-bold text-[#FAF5F0] mb-3">Carteira e rede</h2>

          <div className="space-y-3">
            <button
              type="button"
              role="radio"
              aria-checked={selectedMobileProvider === 'walletconnect'}
              onClick={() => setSelectedMobileProvider('walletconnect')}
              className="w-full bg-[#22150E] rounded-[16px] px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-full bg-[#2B1B12] border border-[#3E271B] flex items-center justify-center text-[#D1823C] font-bold text-xs shrink-0">
                  W
                </span>
                <span className="text-[#FAF5F0] text-[12.5px]">WalletConnect</span>
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedMobileProvider === 'walletconnect'
                    ? 'border-[#D1823C]'
                    : 'border-[#5A3B28]'
                  }`}
              >
                {selectedMobileProvider === 'walletconnect' && (
                  <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                )}
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedMobileProvider === 'metamask'}
              onClick={() => setSelectedMobileProvider('metamask')}
              className="w-full bg-[#22150E] rounded-[16px] px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-full bg-[#2B1B12] border border-[#3E271B] flex items-center justify-center text-[#D1823C] font-bold text-xs shrink-0">
                  M
                </span>
                <span className="text-[#FAF5F0] text-[12.5px]">MetaMask</span>
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedMobileProvider === 'metamask' ? 'border-[#D1823C]' : 'border-[#5A3B28]'
                  }`}
              >
                {selectedMobileProvider === 'metamask' && (
                  <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                )}
              </span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selectedMobileProvider === 'coinbase'}
              onClick={() => setSelectedMobileProvider('coinbase')}
              className="w-full bg-[#22150E] rounded-[16px] px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <span className="w-9 h-9 rounded-full bg-[#2B1B12] border border-[#3E271B] flex items-center justify-center text-[#D1823C] shrink-0">
                  <Wallet className="w-4 h-4 text-[#D1823C]" />
                </span>
                <span className="text-[#FAF5F0] text-[12.5px]">Coinbase Wallet</span>
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selectedMobileProvider === 'coinbase' ? 'border-[#D1823C]' : 'border-[#5A3B28]'
                  }`}
              >
                {selectedMobileProvider === 'coinbase' && (
                  <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                )}
              </span>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-end gap-5 px-1">
            <span className="text-[#FAF5F0] font-bold text-[13.5px]">Total:</span>
            <span className="text-[#D1823C] font-extrabold text-[15px]">8.936 ETH</span>
          </div>
        </div>

        <div className="pt-8">
          <button
            type="button"
            disabled={createOrderMutation.isPending}
            onClick={() => createOrderMutation.mutate()}
            className="w-full h-12 rounded-full bg-[#C87D3B] hover:bg-[#D1823C] disabled:opacity-50 text-[#140D0A] font-bold text-[13.5px] flex items-center justify-center transition-colors cursor-pointer"
          >
            {createOrderMutation.isPending ? 'Processando...' : 'Confirmar compra'}
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
          <span className="text-[#A8968A]">Pagamento</span>
        </nav>

        <form
          onSubmit={handleConfirmPurchase}
          className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start mb-20"
        >
          <div className="lg:col-span-7 w-full flex flex-col">
            <h1 className="text-[#FAF5F0] font-bold text-xs mb-4">Perfil do colecionador</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-display-name" className="text-[#FAF5F0] text-[11px]">
                  Nome de exibição <span className="text-[#D1823C]">*</span>
                </label>
                <input
                  id="checkout-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-username" className="text-[#FAF5F0] text-[11px]">
                  Nome de usuário <span className="text-[#D1823C]">*</span>
                </label>
                <input
                  id="checkout-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-network" className="text-[#FAF5F0] text-[11px]">
                  Rede <span className="text-[#D1823C]">*</span>
                </label>
                <select
                  id="checkout-network"
                  value={network}
                  onChange={(e) =>
                    setNetwork(e.target.value as 'Ethereum' | 'Polygon' | 'Solana' | '')
                  }
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-[11px] text-[#8C7A6B] outline-none cursor-pointer"
                >
                  <option value="">Selecione uma rede</option>
                  <option value="Ethereum">Ethereum</option>
                  <option value="Polygon">Polygon</option>
                  <option value="Solana">Solana</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-profile-name" className="text-[#FAF5F0] text-[11px]">
                  Nome do perfil <span className="text-[#D1823C]">*</span>
                </label>
                <input
                  id="checkout-profile-name"
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4 items-end">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-wallet-address" className="text-[#FAF5F0] text-[11px]">
                  Endereço da carteira <span className="text-[#D1823C]">*</span>
                </label>
                <input
                  id="checkout-wallet-address"
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="Endereço 0x da carteira"
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-[11px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-secondary-wallet" className="sr-only">
                  ENS ou carteira secundária (opcional)
                </label>
                <input
                  id="checkout-secondary-wallet"
                  type="text"
                  value={secondaryWallet}
                  onChange={(e) => setSecondaryWallet(e.target.value)}
                  placeholder="ENS ou carteira secundária (opcional)"
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-[10.5px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-wallet-type" className="text-[#FAF5F0] text-[11px]">
                  Tipo de carteira <span className="text-[#D1823C]">*</span>
                </label>
                <select
                  id="checkout-wallet-type"
                  value={walletType}
                  onChange={(e) => setWalletType(e.target.value)}
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-[11px] text-[#8C7A6B] outline-none cursor-pointer"
                >
                  <option value="">Selecione uma carteira</option>
                  <option value="MetaMask">MetaMask</option>
                  <option value="Coinbase Wallet">Coinbase Wallet</option>
                  <option value="WalletConnect">WalletConnect</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-referral" className="text-[#FAF5F0] text-[11px]">
                  Código de indicação <span className="text-[#D1823C]">*</span>
                </label>
                <input
                  id="checkout-referral"
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-email" className="text-[#FAF5F0] text-[11px]">
                  E-mail <span className="text-[#D1823C]">*</span>
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="checkout-ens-domain" className="text-[#FAF5F0] text-[11px]">
                  Nome ENS <span className="text-[#D1823C]">*</span>
                </label>
                <select
                  id="checkout-ens-domain"
                  value={ensDomain}
                  onChange={(e) => setEnsDomain(e.target.value)}
                  className="w-[76px] h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-2.5 text-[11px] text-[#FAF5F0] outline-none cursor-pointer"
                >
                  <option value=".eth">.eth</option>
                  <option value=".sol">.sol</option>
                  <option value=".xyz">.xyz</option>
                </select>
              </div>
            </div>

            <div className="mt-1 mb-5">
              <button
                type="button"
                role="checkbox"
                aria-checked={useAnotherWallet}
                onClick={() => setUseAnotherWallet((prev) => !prev)}
                className="inline-flex items-center gap-2 text-xs text-[#FAF5F0] cursor-pointer"
              >
                <span className="w-3.5 h-3.5 rounded-full border border-[#D1823C] flex items-center justify-center transition-colors">
                  {useAnotherWallet && <span className="w-2 h-2 rounded-full bg-[#D1823C]" />}
                </span>
                <span>Usar outra carteira?</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 max-w-[330px]">
              <label htmlFor="checkout-notes" className="text-[#FAF5F0] text-[11px]">
                Observação do colecionador (opcional)
              </label>
              <textarea
                id="checkout-notes"
                rows={5}
                value={collectorNote}
                onChange={(e) => setCollectorNote(e.target.value)}
                className="w-full bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] p-3 text-xs text-[#FAF5F0] outline-none resize-none"
              />
            </div>
          </div>

          <aside aria-label="Seus NFTs e confirmação" className="lg:col-span-5 w-full flex flex-col">
            <h2 className="text-[#FAF5F0] font-bold text-xs mb-3">Seus NFTs</h2>

            <div className="flex items-center justify-between pb-2 border-b border-[#2C1E16] text-xs font-bold text-[#FAF5F0]">
              <span>NFTs</span>
              <span>Subtotal</span>
            </div>

            <div className="flex flex-col gap-2.5 mt-3">
              {isCartLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-16 w-full rounded-[6px] skeleton-shimmer" />
                ))
              ) : items.length === 0 ? (
                <div className="bg-[#24160F] rounded-[6px] p-4 text-center text-xs text-[#A8968A]">
                  Nenhum item no carrinho.
                </div>
              ) : (
                items.map((item) => {
                  const unitPrice = new Decimal(
                    item.nft.priceEth || item.priceAtAddition || '0'
                  );
                  const lineSubtotal = unitPrice.times(item.quantity).toFixed(2);
                  const avatarSrc = getCheckoutRowAvatar(item.nftId, item.nft.imageUrl);
                  const tokenIdLabel = getCheckoutTokenId(item.nftId, item.nft.name);

                  return (
                    <div
                      key={item.nftId}
                      className="bg-[#24160F] rounded-[6px] px-3 py-2 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-[46px] h-[46px] rounded-[5px] overflow-hidden shrink-0 bg-[#140D0A]">
                          <img
                            src={avatarSrc}
                            alt={item.nft.name}
                            width={46}
                            height={46}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#FAF5F0] font-bold text-xs truncate">
                            {item.nft.name}
                          </div>
                          <div className="text-[#8C7A6B] text-[10px] mt-0.5">
                            ID do token: {tokenIdLabel}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[#8C7A6B] text-[11px]">(x {item.quantity})</span>
                        <span className="text-[#D1823C] font-extrabold text-xs">
                          {lineSubtotal} ETH
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 text-right">
              <button
                type="button"
                onClick={() => setIsPromoOpen((prev) => !prev)}
                className="text-[10.5px] text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
              >
                Tem um código promocional?{' '}
                <span className="text-[#FAF5F0] font-semibold">Aplique aqui</span>
              </button>

              {isPromoOpen && (
                <div className="mt-2 flex items-stretch gap-1.5">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="Ex: JUNGLE10 ou ETH5"
                    className="flex-1 bg-[#140D0A] border border-[#3D2A1E] rounded px-2.5 py-1.5 text-[10px] text-[#FAF5F0] outline-none focus:border-[#D1823C]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (promoCodeInput.trim()) {
                        applyCouponMutation.mutate(promoCodeInput.trim());
                      }
                    }}
                    className="bg-[#D1823C] text-[#140D0A] font-bold text-[10px] px-3 py-1.5 rounded cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3.5 space-y-2.5 text-xs">
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
                <span className="text-[#D1823C]/80 text-[10px] text-center mt-1">
                  Taxa estimada
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2C1E16] px-4">
              <span className="text-[#FAF5F0] font-bold text-xs">Total</span>
              <span
                data-testid="checkout-total-eth"
                className="text-[#D1823C] font-extrabold text-sm"
              >
                {totalDisplay}
              </span>
            </div>

            <div className="mt-5 flex flex-col">
              <h3 className="text-[#FAF5F0] font-bold text-xs text-center mb-3">
                Carteira e rede
              </h3>

              <div
                role="radiogroup"
                aria-label="Selecionar carteira para pagamento"
                className="flex flex-col gap-2.5"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPaymentMethod === 'multi'}
                  onClick={() => setSelectedPaymentMethod('multi')}
                  className={`w-full h-10 rounded-[4px] border px-3.5 flex items-center gap-3 transition-colors cursor-pointer ${selectedPaymentMethod === 'multi'
                      ? 'border-[#D1823C] bg-[#1F1510]'
                      : 'border-[#2C1E16] bg-[#140D0A] hover:border-[#4E3524]'
                    }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-[#8C7A6B] flex items-center justify-center shrink-0">
                    {selectedPaymentMethod === 'multi' && (
                      <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] border border-[#4E3524] bg-[#332215] text-[7.5px] font-bold uppercase text-[#D1823C]">
                    <span>METAMASK</span>
                    <span>•</span>
                    <span>WALLETCONNECT</span>
                    <span>•</span>
                    <span>COINBASE</span>
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPaymentMethod === 'metamask'}
                  onClick={() => setSelectedPaymentMethod('metamask')}
                  className={`w-full h-10 rounded-[4px] border px-3.5 flex items-center gap-3 text-xs transition-colors cursor-pointer ${selectedPaymentMethod === 'metamask'
                      ? 'border-[#D1823C] bg-[#1F1510] text-[#FAF5F0] font-bold'
                      : 'border-[#2C1E16] bg-[#140D0A] text-[#C2B2A6] hover:border-[#4E3524]'
                    }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full border border-[#8C7A6B] flex items-center justify-center shrink-0">
                    {selectedPaymentMethod === 'metamask' && (
                      <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                    )}
                  </span>
                  <span>MetaMask</span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selectedPaymentMethod === 'coinbase'}
                  onClick={() => setSelectedPaymentMethod('coinbase')}
                  className={`w-full h-10 rounded-[4px] border px-3.5 flex items-center gap-3 text-xs transition-colors cursor-pointer ${selectedPaymentMethod === 'coinbase'
                      ? 'border-[#D1823C] bg-[#1F1510] text-[#FAF5F0] font-bold'
                      : 'border-[#2C1E16] bg-[#140D0A] text-[#C2B2A6] hover:border-[#4E3524]'
                    }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${selectedPaymentMethod === 'coinbase'
                        ? 'border-[#D1823C]'
                        : 'border-[#8C7A6B]'
                      }`}
                  >
                    {selectedPaymentMethod === 'coinbase' && (
                      <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                    )}
                  </span>
                  <span>Coinbase Wallet</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={items.length === 0 || createOrderMutation.isPending}
              className="w-full mt-5 bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-40 text-[#140D0A] font-bold text-xs py-3 rounded-[5px] transition-colors cursor-pointer"
            >
              {createOrderMutation.isPending ? 'Processando na rede...' : 'Confirmar compra'}
            </button>
          </aside>
        </form>

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

      {confirmedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="thank-you-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setConfirmedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[465px] bg-[#1D120C] border border-[#3B2619] shadow-2xl overflow-hidden flex flex-col my-auto"
          >
            <button
              type="button"
              aria-label="Fechar comprovante"
              onClick={() => setConfirmedOrder(null)}
              className="absolute top-3.5 right-3.5 text-[#D1823C] hover:text-[#FAF5F0] transition-colors p-1 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[1.75]" />
            </button>

            <div className="pt-6 pb-4 px-6 flex flex-col items-center text-center">
              <img
                src="/assets/nfts/thank-you.png"
                alt="Thank You"
                width={52}
                height={64}
                className="w-[52px] h-auto object-contain mb-3"
              />
              <h2
                id="thank-you-modal-title"
                className="text-[#C2B2A6] text-xs font-medium tracking-wide"
              >
                Seus NFTs agora estão na sua carteira
              </h2>
            </div>

            <div className="border-y border-[#5C3D28]/70 px-5 py-3 grid grid-cols-4 items-center text-[10.5px]">
              <div className="pr-2 border-r border-[#5C3D28]/70">
                <span className="text-[#A8968A] font-bold block">ID da transação</span>
                <span className="text-[#C2B2A6] font-mono block mt-0.5">0xA91F…E82C</span>
              </div>

              <div className="px-3 border-r border-[#5C3D28]/70">
                <span className="text-[#A8968A] font-bold block">Data</span>
                <span className="text-[#C2B2A6] block mt-0.5">29 Jul, 2026</span>
              </div>

              <div className="px-3 border-r border-[#5C3D28]/70">
                <span className="text-[#A8968A] font-bold block">Total</span>
                <span className="text-[#C2B2A6] font-semibold block mt-0.5">
                  {confirmedOrder.quotationSnapshot?.totalEth
                    ? `${new Decimal(confirmedOrder.quotationSnapshot.totalEth).toFixed(3)} ETH`
                    : '26.846 ETH'}
                </span>
              </div>

              <div className="pl-3">
                <span className="text-[#A8968A] font-bold block">Carteira</span>
                <span className="text-[#C2B2A6] block mt-0.5">MetaMask</span>
              </div>
            </div>

            <div className="px-7 pt-4 pb-6 flex flex-col">
              <h3 className="text-[#FAF5F0] font-bold text-xs mb-2.5">Detalhes da transação</h3>

              <div className="grid grid-cols-12 items-center pb-1.5 border-b border-[#38251A] text-xs font-bold text-[#FAF5F0]">
                <div className="col-span-7">NFTs</div>
                <div className="col-span-2 text-center">Edições</div>
                <div className="col-span-3 text-right">Subtotal</div>
              </div>

              <div className="flex flex-col gap-3 mt-3">
                {(confirmedOrder.quotationSnapshot?.items || []).map((purchasedItem) => {
                  const rowTotal = new Decimal(purchasedItem.priceEth)
                    .times(purchasedItem.quantity)
                    .toFixed(2);
                  const avatarSrc = getCheckoutRowAvatar(
                    purchasedItem.nftId,
                    '/assets/nfts/emerald-ape.png'
                  );
                  const tokenIdLabel = getCheckoutTokenId(
                    purchasedItem.nftId,
                    purchasedItem.name
                  );

                  return (
                    <div
                      key={purchasedItem.nftId}
                      className="grid grid-cols-12 items-center gap-2"
                    >
                      <div className="col-span-7 flex items-center gap-3 min-w-0">
                        <div className="w-[52px] h-[52px] rounded-[8px] overflow-hidden shrink-0 bg-[#140D0A]">
                          <img
                            src={avatarSrc}
                            alt={purchasedItem.name}
                            width={52}
                            height={52}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[#FAF5F0] font-bold text-xs truncate">
                            {purchasedItem.name}
                          </div>
                          <div className="text-[#8C7A6B] text-[10px] mt-0.5">
                            ID do token: {tokenIdLabel}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 text-center text-[#A8968A] text-[11px]">
                        (x {purchasedItem.quantity})
                      </div>

                      <div className="col-span-3 text-right text-[#D1823C] font-extrabold text-xs">
                        {rowTotal} ETH
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-2 border-b border-[#38251A] pb-3 space-y-2 text-xs">
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-8 text-center text-[#C2B2A6]">Taxa de rede</div>
                  <div className="col-span-4 text-right text-[#FAF5F0] font-medium">
                    0.016 ETH
                  </div>
                </div>

                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-8 text-center text-[#FAF5F0] font-bold">Total</div>
                  <div className="col-span-4 text-right text-[#D1823C] font-extrabold">
                    {confirmedOrder.quotationSnapshot?.totalEth
                      ? `${new Decimal(confirmedOrder.quotationSnapshot.totalEth).toFixed(3)} ETH`
                      : '26.846 ETH'}
                  </div>
                </div>
              </div>

              <p className="text-center text-[#A8968A] text-[10.5px] leading-[1.55] mt-3.5 px-2">
                Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira
                conectada e registrada na rede.
              </p>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Abrindo comprovante verificado no Etherscan...');
                    setConfirmedOrder(null);
                    navigate({ to: '/' });
                  }}
                  className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs px-6 py-2.5 rounded-[5px] transition-colors cursor-pointer"
                >
                  Ver no Etherscan
                </button>
              </div>
            </div>

            <div className="h-[10px] w-full bg-[#D1823C]" />
          </div>
        </div>
      )}
    </div>
  );
}
