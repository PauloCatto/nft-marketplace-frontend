import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Database, RefreshCw, ShieldAlert, Sparkles, Wifi, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { scenarios, type ScenarioConfig } from '../../mocks/scenarios';
import { db } from '../../mocks/db';
import { emitMockNftUpdated } from '../../mocks/socket/socketHandler';

export function NetworkDevTools() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ScenarioConfig>(() => scenarios.get());

  const activeFlagsCount = [
    config.latencyMs > 0,
    config.failFavorites,
    config.sessionExpired,
    config.orderTimeout,
    config.priceChangedInCart,
    config.editionSoldOut,
    config.paymentFailed,
    config.simulateHttp500OnCatalog,
  ].filter(Boolean).length;

  const updateScenario = (partial: Partial<ScenarioConfig>, label: string) => {
    const updated = scenarios.set(partial);
    setConfig({ ...updated });
    toast.info(`Simulador Web3: ${label}`);
  };

  const handleTriggerLivePriceUpdate = () => {
    const nftIds = ['nft-1', 'nft-2', 'nft-3', 'nft-4'];
    const randomId = nftIds[Math.floor(Math.random() * nftIds.length)];
    const currentNft = db.findNFTById(randomId);
    const nextVersion = (currentNft?.version || 1) + 1;
    const randomPrice = (Math.random() * 2.5 + 0.35).toFixed(2);

    emitMockNftUpdated({
      nftId: randomId,
      version: nextVersion,
      priceEth: randomPrice,
      isAvailable: true,
      availableEditions: Math.max(1, (currentNft?.availableEditions || 5) - 1),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleResetAll = () => {
    const resetCfg = scenarios.reset();
    setConfig({ ...resetCfg });
    void queryClient.invalidateQueries();
    toast.success('Todos os cenários de rede foram restaurados para o modo normal.');
  };

  const handleResetDatabase = () => {
    db.resetDatabase();
    const resetCfg = scenarios.reset();
    setConfig({ ...resetCfg });
    void queryClient.invalidateQueries();
    toast.success('Banco de dados local (MSW) restaurado para as fixtures originais.');
  };

  return (
    <>
      <button
        type="button"
        aria-label="Abrir Simulador de Rede e Chaos Engineering Web3"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-5 right-4 md:right-5 z-[85] inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#1F1510]/95 hover:bg-[#2A1C15] border border-[#D1823C]/50 shadow-[0_8px_28px_rgba(0,0,0,0.75)] text-[11px] font-extrabold text-[#FAF5F0] transition-all cursor-pointer group"
      >
        <Zap className="w-3.5 h-3.5 text-[#D1823C] group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">Web3 DevTools</span>
        {activeFlagsCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-[#D1823C] text-[#140D0A] text-[9.5px] font-black leading-none">
            {activeFlagsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Painel Web3 DevTools e Chaos Engineering"
          className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[480px] max-h-[88vh] bg-[#19100B] border-t sm:border border-[#3D2A1E] rounded-t-2xl sm:rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#22150E] border-b border-[#332016] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D1823C]/15 border border-[#D1823C]/40 flex items-center justify-center text-[#D1823C]">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold text-[#FAF5F0] uppercase tracking-wider">
                    Web3 DevTools & Chaos Simulator
                  </h2>
                  <p className="text-[10px] text-[#A8968A]">
                    Teste resiliência, Optimistic UI, Idempotência e WebSockets ao vivo
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar painel Web3 DevTools"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-[#A8968A] hover:text-[#FAF5F0] hover:bg-[#2C1E16] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-[#140D0A] border border-[#2C1E16] rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[#D1823C] font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Evento Real-Time (Socket.IO)</span>
                  </div>
                  <p className="text-[10.5px] text-[#A8968A] mt-0.5">
                    Emite um evento <code className="text-[#FAF5F0]">nft.updated</code> alterando preço e estoque em tempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerLivePriceUpdate}
                  className="px-3 py-2 rounded-lg bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-[11px] shrink-0 transition-colors cursor-pointer"
                >
                  Disparar Evento
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#C2B2A6] font-bold text-[11px] uppercase tracking-wider">
                  <Wifi className="w-3.5 h-3.5 text-[#D1823C]" />
                  <span>Latência Simulada da API (MSW)</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Rápida (200ms)', ms: 0 },
                    { label: '3G Lento (1.2s)', ms: 1200 },
                    { label: 'Congestionada (2.5s)', ms: 2500 },
                  ].map((opt) => {
                    const isSelected = config.latencyMs === opt.ms;
                    return (
                      <button
                        key={opt.ms}
                        type="button"
                        onClick={() => updateScenario({ latencyMs: opt.ms }, `Latência ${opt.label}`)}
                        className={`py-2 px-2 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#D1823C]/20 border-[#D1823C] text-[#D1823C]'
                            : 'bg-[#140D0A] border-[#2C1E16] text-[#A8968A] hover:text-[#FAF5F0]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#C2B2A6] font-bold text-[11px] uppercase tracking-wider">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#D1823C]" />
                  <span>Cenários de Falha e Resiliência</span>
                </div>

                <div className="space-y-2">
                  {[
                    {
                      key: 'failFavorites' as const,
                      title: 'Forçar Erro 500 nos Favoritos (Optimistic Rollback)',
                      desc: 'Testa a reversão automática do coração quando a API falha.',
                    },
                    {
                      key: 'orderTimeout' as const,
                      title: 'Simular Timeout 504 no Checkout (Idempotência)',
                      desc: 'Permite reenviar a mesma compra sem duplicar cobrança (Idempotency-Key).',
                    },
                    {
                      key: 'priceChangedInCart' as const,
                      title: 'Simular Conflito 409 de Cotação no Checkout',
                      desc: 'Força divergência de preço ao confirmar compra e exige revisão.',
                    },
                    {
                      key: 'paymentFailed' as const,
                      title: 'Simular Recusa da Carteira Web3 (REJECTED)',
                      desc: 'Simula rejeição da assinatura na carteira mantendo os itens no carrinho.',
                    },
                    {
                      key: 'sessionExpired' as const,
                      title: 'Simular Expiração de Sessão JWT (HTTP 401)',
                      desc: 'Dispara o interceptor 401 e abre o modal de reautenticação.',
                    },
                  ].map((item) => {
                    const isChecked = Boolean(config[item.key]);
                    return (
                      <label
                        key={item.key}
                        className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-[#D1823C]/10 border-[#D1823C]/60'
                            : 'bg-[#140D0A] border-[#2C1E16] hover:border-[#3D2A1E]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] text-[#FAF5F0]">{item.title}</div>
                          <div className="text-[10px] text-[#A8968A] mt-0.5">{item.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            updateScenario(
                              { [item.key]: e.target.checked },
                              `${item.title}: ${e.target.checked ? 'Ativado' : 'Desativado'}`
                            )
                          }
                          className="mt-1 accent-[#D1823C] w-4 h-4 cursor-pointer shrink-0"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#140D0A] border-t border-[#2C1E16] flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleResetDatabase}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#3D2A1E] hover:border-[#D1823C] text-[#C2B2A6] hover:text-[#FAF5F0] text-[11px] font-bold transition-colors cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-[#D1823C]" />
                <span>Resetar DB Local</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A1C15] hover:bg-[#38251A] text-[#FAF5F0] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#D1823C]" />
                  <span>Limpar Falhas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] text-[11px] font-extrabold transition-colors cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Pronto</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
