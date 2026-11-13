import { useState } from 'react';
import { X } from 'lucide-react';
import Decimal from 'decimal.js';
import { toast } from 'sonner';
import type { Order } from '../../api/contracts';

interface OrderReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  onNavigateHome: () => void;
  onNavigateDownloads: () => void;
  getRowAvatar: (nftId: string, fallbackUrl: string) => string;
  getTokenId: (nftId: string, nftName: string) => string;
}

export function OrderReceiptModal({
  order,
  onClose,
  onNavigateHome,
  onNavigateDownloads,
  getRowAvatar,
  getTokenId,
}: OrderReceiptModalProps) {
  const [isEtherscanModalOpen, setIsEtherscanModalOpen] = useState(false);

  if (!order) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="thank-you-modal-title"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[465px] bg-[#1D120C] border border-[#3B2619] shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          <button
            type="button"
            aria-label="Fechar comprovante"
            onClick={onClose}
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
                {order.quotationSnapshot?.totalEth
                  ? `${new Decimal(order.quotationSnapshot.totalEth).toFixed(3)} ETH`
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
              {(order.quotationSnapshot?.items || []).map((purchasedItem) => {
                const rowTotal = new Decimal(purchasedItem.priceEth)
                  .times(purchasedItem.quantity)
                  .toFixed(2);
                const avatarSrc = getRowAvatar(
                  purchasedItem.nftId,
                  '/assets/nfts/emerald-ape.png'
                );
                const tokenIdLabel = getTokenId(purchasedItem.nftId, purchasedItem.name);

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
                <div className="col-span-4 text-right text-[#FAF5F0] font-medium">0.016 ETH</div>
              </div>

              <div className="grid grid-cols-12 items-center">
                <div className="col-span-8 text-center text-[#FAF5F0] font-bold">Total</div>
                <div className="col-span-4 text-right text-[#D1823C] font-extrabold">
                  {order.quotationSnapshot?.totalEth
                    ? `${new Decimal(order.quotationSnapshot.totalEth).toFixed(3)} ETH`
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
                onClick={() => setIsEtherscanModalOpen(true)}
                className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs px-6 py-2.5 rounded-[5px] transition-colors cursor-pointer"
              >
                Ver no Etherscan
              </button>
            </div>
          </div>

          <div className="h-[10px] w-full bg-[#D1823C]" />
        </div>
      </div>

      {isEtherscanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Explorador de Blocos Etherscan"
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsEtherscanModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[540px] bg-[#19100B] border border-[#3D2A1E] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col my-auto"
          >
            <div className="px-6 py-4 bg-[#22150E] border-b border-[#38251A] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <h3 className="text-xs font-extrabold text-[#FAF5F0] uppercase tracking-wider">
                    Etherscan • Explorador On-Chain
                  </h3>
                  <p className="text-[10px] text-[#A8968A]">
                    Ethereum Mainnet • Bloco #19842601 • 12 Confirmações
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar Etherscan"
                onClick={() => setIsEtherscanModalOpen(false)}
                className="text-[#A8968A] hover:text-[#FAF5F0] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-[#140D0A] border border-[#2C1E16] rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#A8968A] text-[11px]">Status na Rede:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-[10.5px]">
                    Sucesso (Confirmado)
                  </span>
                </div>

                <div className="flex flex-col gap-1 pt-1 border-t border-[#24160F]">
                  <span className="text-[#A8968A] text-[10.5px]">Transaction Hash:</span>
                  <div className="flex items-center justify-between gap-2 bg-[#1D120C] px-2.5 py-1.5 rounded border border-[#332016]">
                    <span className="font-mono text-[10.5px] text-[#D1823C] truncate">
                      {order.receipt?.transactionHash ||
                        '0xA91F8842d92c4E5B890123456789ABCDEF01E82C'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          order.receipt?.transactionHash ||
                            '0xA91F8842d92c4E5B890123456789ABCDEF01E82C'
                        );
                        toast.success('Hash da transação copiado!');
                      }}
                      className="text-[10px] font-bold text-[#FAF5F0] hover:text-[#D1823C] shrink-0 cursor-pointer"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#24160F] text-[11px]">
                  <div>
                    <span className="text-[#A8968A] block text-[10px]">De (Contrato Kurio):</span>
                    <span className="font-mono text-[#FAF5F0] text-[10.5px]">
                      0x4B20...9e22C02db
                    </span>
                  </div>
                  <div>
                    <span className="text-[#A8968A] block text-[10px]">Para (Sua Carteira):</span>
                    <span className="font-mono text-[#FAF5F0] text-[10.5px] truncate block">
                      {order.walletAddress || '0x71C4...498b'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#140D0A] border border-[#2C1E16] rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-bold text-[#FAF5F0] block">
                  Tokens ERC-721 Transferidos
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(order.quotationSnapshot?.items || []).map((item) => (
                    <div
                      key={item.nftId}
                      className="flex items-center justify-between text-[11px] py-1 border-b border-[#24160F] last:border-0"
                    >
                      <span className="text-[#C2B2A6] truncate">
                        {item.name} ({getTokenId(item.nftId, item.name)}) × {item.quantity}
                      </span>
                      <span className="text-[#D1823C] font-bold shrink-0">
                        {new Decimal(item.priceEth).times(item.quantity).toFixed(2)} ETH
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-[#2C1E16] flex items-center justify-between text-xs">
                  <span className="text-[#A8968A]">Valor Total Liquidado (+ Gas 0.016 ETH):</span>
                  <span className="text-[#D1823C] font-extrabold">
                    {order.quotationSnapshot?.totalEth
                      ? `${new Decimal(order.quotationSnapshot.totalEth).toFixed(3)} ETH`
                      : '26.846 ETH'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const receiptPayload = {
                      network: 'Ethereum Mainnet',
                      blockNumber: 19842601,
                      orderId: order.id,
                      transactionHash:
                        order.receipt?.transactionHash ||
                        '0xA91F8842d92c4E5B890123456789ABCDEF01E82C',
                      walletAddress: order.walletAddress,
                      quotationSnapshot: order.quotationSnapshot,
                      verifiedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(receiptPayload, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `etherscan-receipt-${order.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Recibo Etherscan (.json) baixado com sucesso!');
                  }}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-lg border border-[#3D2A1E] hover:border-[#D1823C] text-[#FAF5F0] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Baixar Recibo (.JSON)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEtherscanModalOpen(false);
                    onNavigateDownloads();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-lg bg-[#2A1C15] hover:bg-[#38251A] text-[#D1823C] font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Meus Downloads
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEtherscanModalOpen(false);
                    onNavigateHome();
                  }}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-lg bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-[11px] transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
