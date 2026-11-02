import { useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { TrendingUp, CheckCircle2, XCircle, Clock, Plus, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated, triggerRequireAuth } from '../api/client';
import { Header } from '../components/layout/Header';
import { ProfileSidebar } from '../components/layout/ProfileSidebar';

export const Route = createFileRoute('/ofertas')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      triggerRequireAuth({
        message: 'Faça login na sua conta para gerenciar suas Ofertas.',
        redirectTo: '/ofertas',
      });
      throw redirect({ to: '/' });
    }
  },
  component: OffersPage,
});

interface OfferRecord {
  id: string;
  nftId: string;
  nftName: string;
  collection: string;
  imageUrl: string;
  direction: 'received' | 'sent';
  counterparty: string;
  offerEth: string;
  floorEth: string;
  network: 'Ethereum' | 'Polygon' | 'Solana';
  expiresIn: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

const INITIAL_OFFERS: OfferRecord[] = [
  {
    id: 'offer-101',
    nftId: 'nft-1',
    nftName: 'Emerald Ape #042',
    collection: 'Kurio Genesis Club',
    imageUrl: '/assets/nfts/card-1.png',
    direction: 'received',
    counterparty: '0x94F...38A1 (karim.eth)',
    offerEth: '1.35',
    floorEth: '1.19',
    network: 'Ethereum',
    expiresIn: '18 horas',
    status: 'PENDING',
  },
  {
    id: 'offer-102',
    nftId: 'nft-2',
    nftName: 'Sage Nomad #009',
    collection: 'Nomad Sanctuary',
    imageUrl: '/assets/nfts/card-2.png',
    direction: 'received',
    counterparty: '0x31B...99C0 (lyra.sol)',
    offerEth: '1.80',
    floorEth: '1.69',
    network: 'Ethereum',
    expiresIn: '2 dias',
    status: 'PENDING',
  },
  {
    id: 'offer-103',
    nftId: 'nft-5',
    nftName: 'Violet Nomad #314',
    collection: 'Nomad Sanctuary',
    imageUrl: '/assets/nfts/card-5.png',
    direction: 'sent',
    counterparty: '0x88D...12E4 (vortex.eth)',
    offerEth: '1.28',
    floorEth: '1.39',
    network: 'Polygon',
    expiresIn: '4 dias',
    status: 'PENDING',
  },
  {
    id: 'offer-104',
    nftId: 'nft-6',
    nftName: 'Ivory Baron #088',
    collection: 'Kurio Sovereign',
    imageUrl: '/assets/nfts/card-6.png',
    direction: 'sent',
    counterparty: '0x52C...77B9 (baron.eth)',
    offerEth: '1.75',
    floorEth: '1.79',
    network: 'Ethereum',
    expiresIn: 'Finalizada',
    status: 'ACCEPTED',
  },
];

const OFFERS_STORAGE_KEY = 'kurio_collector_offers_v1';

function loadStoredOffers(): OfferRecord[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(OFFERS_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { }
  }
  return INITIAL_OFFERS;
}

function OffersPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState<OfferRecord[]>(loadStoredOffers);
  const [filterTab, setFilterTab] = useState<'all' | 'received' | 'sent'>('all');
  const [newOfferNft, setNewOfferNft] = useState('nft-4');
  const [newOfferAmount, setNewOfferAmount] = useState('1.15');

  const updateOffersState = (next: OfferRecord[]) => {
    setOffers(next);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(next));
      } catch { }
    }
  };

  const handleStatusChange = (offerId: string, status: 'ACCEPTED' | 'DECLINED') => {
    const next = offers.map((o) =>
      o.id === offerId ? { ...o, status, expiresIn: 'Finalizada' } : o
    );
    updateOffersState(next);
    if (status === 'ACCEPTED') {
      toast.success('Oferta aceita! Contrato de liquidação iniciado na carteira.');
    } else {
      toast.info('Oferta recusada.');
    }
  };

  const handleCreateProposal = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(newOfferAmount);
    if (!numeric || numeric <= 0) {
      toast.error('Informe um valor válido em ETH para a proposta.');
      return;
    }

    const catalogMap: Record<string, { name: string; col: string; img: string; floor: string }> = {
      'nft-4': {
        name: 'Cosmic Bloom #118',
        col: 'Nomad Sanctuary',
        img: '/assets/nfts/card-4.png',
        floor: '1.29',
      },
      'nft-3': {
        name: 'Neon Vessel #552',
        col: 'Cyber Primate',
        img: '/assets/nfts/card-3.png',
        floor: '1.89',
      },
      'nft-7': {
        name: 'Golden Beat #207',
        col: 'Sonic Apes',
        img: '/assets/nfts/card-7.png',
        floor: '0.99',
      },
    };

    const chosen = catalogMap[newOfferNft] || catalogMap['nft-4'];
    const created: OfferRecord = {
      id: `offer-${Date.now()}`,
      nftId: newOfferNft,
      nftName: chosen.name,
      collection: chosen.col,
      imageUrl: chosen.img,
      direction: 'sent',
      counterparty: '0x77A...41E9 (vault.eth)',
      offerEth: numeric.toFixed(2),
      floorEth: chosen.floor,
      network: 'Ethereum',
      expiresIn: '7 dias',
      status: 'PENDING',
    };

    updateOffersState([created, ...offers]);
    setFilterTab('sent');
    toast.success(`Proposta de ${numeric.toFixed(2)} ETH enviada para ${chosen.name}!`);
  };

  const visibleOffers = offers.filter((o) =>
    filterTab === 'all' ? true : o.direction === filterTab
  );

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-16 flex flex-col">
        <Header />

        <div className="w-full mt-7 flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          <ProfileSidebar activeSection="ofertas" />

          <main className="flex-1 w-full">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-3 border-b border-[#2E1E15]">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#D1823C]" />
                  <h2 className="text-[#FAF5F0] font-bold text-sm sm:text-base">
                    Central de Ofertas
                  </h2>
                </div>
                <p className="text-[#9E8C7E] text-xs mt-1">
                  Gerencie lances recebidos nos seus NFTs ou envie propostas diretas em ETH para colecionadores.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#1D130E] p-1 rounded-[6px] border border-[#2E1E15]">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'received', label: 'Recebidas' },
                  { id: 'sent', label: 'Enviadas' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id as 'all' | 'received' | 'sent')}
                    className={`px-3 py-1.5 rounded-[4px] text-[11px] font-bold transition-colors cursor-pointer ${filterTab === tab.id
                      ? 'bg-[#D1823C] text-[#140D0A]'
                      : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleCreateProposal}
              className="mb-6 bg-[#1D130E] border border-[#2E1E15] rounded-[10px] p-4 flex flex-col sm:flex-row items-stretch sm:items-end gap-3.5"
            >
              <div className="flex-1 flex flex-col gap-1">
                <label htmlFor="offer-nft-select" className="text-[11px] font-semibold text-[#FAF5F0]">
                  Enviar nova proposta rápida em NFT do catálogo
                </label>
                <select
                  id="offer-nft-select"
                  value={newOfferNft}
                  onChange={(e) => setNewOfferNft(e.target.value)}
                  className="h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none cursor-pointer"
                >
                  <option value="nft-4">Cosmic Bloom #118 (Floor: 1.29 ETH)</option>
                  <option value="nft-3">Neon Vessel #552 (Floor: 1.89 ETH)</option>
                  <option value="nft-7">Golden Beat #207 (Floor: 0.99 ETH)</option>
                </select>
              </div>

              <div className="w-full sm:w-40 flex flex-col gap-1">
                <label htmlFor="offer-eth-input" className="text-[11px] font-semibold text-[#FAF5F0]">
                  Valor da oferta (ETH)
                </label>
                <input
                  id="offer-eth-input"
                  type="number"
                  step="0.01"
                  min="0.05"
                  value={newOfferAmount}
                  onChange={(e) => setNewOfferAmount(e.target.value)}
                  className="h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none"
                />
              </div>

              <button
                type="submit"
                className="h-9 px-4 rounded-[4px] bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enviar Proposta</span>
              </button>
            </form>

            <div className="space-y-3">
              {visibleOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-[#1D130E] border border-[#2E1E15] rounded-[10px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={offer.imageUrl}
                      alt={offer.nftName}
                      onClick={() => navigate({ to: '/mercado', search: { id: offer.nftId } })}
                      className="w-14 h-14 rounded-[8px] object-cover border border-[#3B2619] shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold uppercase ${offer.direction === 'received'
                            ? 'bg-[#D1823C]/20 text-[#D1823C]'
                            : 'bg-[#2B1B12] text-[#C2B2A6]'
                            }`}
                        >
                          {offer.direction === 'received' ? 'Oferta Recebida' : 'Oferta Enviada'}
                        </span>
                        <span className="text-[10.5px] text-[#8C7A6B]">{offer.network}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate({ to: '/mercado', search: { id: offer.nftId } })}
                        className="text-xs sm:text-[13px] font-bold text-[#FAF5F0] hover:text-[#D1823C] flex items-center gap-1 mt-1 transition-colors cursor-pointer"
                      >
                        <span>{offer.nftName}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#D1823C]" />
                      </button>

                      <p className="text-[11px] text-[#9E8C7E] truncate">
                        De/Para: <span className="font-mono">{offer.counterparty}</span> • Expira:{' '}
                        {offer.expiresIn}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#2E1E15]">
                    <div className="text-left sm:text-right">
                      <span className="block text-xs sm:text-sm font-extrabold text-[#D1823C]">
                        {offer.offerEth} ETH
                      </span>
                      <span className="block text-[10px] text-[#8C7A6B]">
                        Preço base: {offer.floorEth} ETH
                      </span>
                    </div>

                    {offer.status === 'PENDING' ? (
                      offer.direction === 'received' ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(offer.id, 'ACCEPTED')}
                            className="px-3 py-1.5 rounded-[5px] bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] text-[11px] font-extrabold transition-colors cursor-pointer"
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(offer.id, 'DECLINED')}
                            className="px-3 py-1.5 rounded-[5px] border border-[#3B2619] hover:border-red-500/50 text-[#C2B2A6] hover:text-red-300 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Recusar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#D1823C] font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Aguardando</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(offer.id, 'DECLINED')}
                            className="px-2.5 py-1 rounded-[4px] border border-[#3B2619] text-[10.5px] text-[#9E8C7E] hover:text-red-300 transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      )
                    ) : offer.status === 'ACCEPTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aceita</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-bold">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Encerrada</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
