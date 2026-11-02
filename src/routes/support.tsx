import { useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import {
  AlertTriangle,
  ShieldCheck,
  Search,
  Send,
  CheckCircle2,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { isAuthenticated, triggerRequireAuth } from '../api/client';
import { Header } from '../components/layout/Header';
import { ProfileSidebar } from '../components/layout/ProfileSidebar';

export const Route = createFileRoute('/support')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      triggerRequireAuth({
        message: 'Faça login na sua conta para acessar o Suporte ao colecionador.',
        redirectTo: '/support',
      });
      throw redirect({ to: '/' });
    }
  },
  component: SupportPage,
});

interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  status: 'ABERTO' | 'RESOLVIDO';
  createdAt: string;
}

function SupportPage() {
  const [txHashInput, setTxHashInput] = useState('0xabc1234567890abcdef1234567890abcdef1234567890abc');
  const [diagnosticResult, setDiagnosticResult] = useState<{
    hash: string;
    status: string;
    network: string;
    confirmations: number;
    gasUsed: string;
  } | null>(null);

  const [ticketCategory, setTicketCategory] = useState('Transação / Gas Fee');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([
    {
      id: 'KUR-8841',
      category: 'Verificação de Carteira',
      subject: 'Sincronização de assinatura ENS .eth no perfil',
      status: 'RESOLVIDO',
      createdAt: 'Hoje, 10:15',
    },
  ]);

  const handleRunDiagnostic = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = txHashInput.trim();
    if (!cleaned.startsWith('0x') || cleaned.length < 10) {
      toast.error('Informe um hash de transação ou endereço iniciado por 0x.');
      return;
    }
    setDiagnosticResult({
      hash: cleaned,
      status: 'CONFIRMADO ON-CHAIN (Bloco #19.482.110)',
      network: 'Ethereum Mainnet (ERC-721)',
      confirmations: 64,
      gasUsed: '0.0042 ETH',
    });
    toast.success('Diagnóstico on-chain concluído com sucesso!');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      toast.error('Preencha o assunto e a descrição para abrir o chamado.');
      return;
    }
    const protocol = `KUR-${Math.floor(1000 + Math.random() * 9000)}`;
    setTickets((prev) => [
      {
        id: protocol,
        category: ticketCategory,
        subject: ticketSubject.trim(),
        status: 'ABERTO',
        createdAt: 'Agora mesmo',
      },
      ...prev,
    ]);
    setTicketSubject('');
    setTicketMessage('');
    toast.success(`Chamado prioritário ${protocol} registrado com sucesso!`);
  };

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-16 flex flex-col">
        <Header />

        <div className="w-full mt-7 flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          <ProfileSidebar activeSection="support" />

          <main className="flex-1 w-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#2E1E15]">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#D1823C]" />
                  <h2 className="text-[#FAF5F0] font-bold text-sm sm:text-base">
                    Central de Suporte Web3 & Diagnóstico On-Chain
                  </h2>
                </div>
                <p className="text-[#9E8C7E] text-xs mt-1">
                  Verifique transações em tempo real, consulte o status das redes e acione a equipe de segurança da Kurio.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                <Activity className="w-3.5 h-3.5" />
                <span>Redes Ethereum, Polygon e Solana Operacionais</span>
              </div>
            </div>

            <section className="bg-[#1D130E] border border-[#2E1E15] rounded-[10px] p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-[#D1823C]" />
                <h3 className="text-xs font-bold text-[#FAF5F0]">
                  Diagnóstico Instantâneo de Transação ou Carteira (0x)
                </h3>
              </div>
              <p className="text-[11px] text-[#9E8C7E] mb-3.5">
                Cole o hash de uma compra ou endereço de carteira para auditar o status de liquidação e custódia do token.
              </p>

              <form onSubmit={handleRunDiagnostic} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={txHashInput}
                  onChange={(e) => setTxHashInput(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs font-mono text-[#FAF5F0] outline-none"
                />
                <button
                  type="submit"
                  className="h-9 px-4 rounded-[4px] bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Auditar Hash</span>
                </button>
              </form>

              {diagnosticResult && (
                <div className="mt-4 rounded-[8px] bg-[#140D0A] border border-emerald-500/30 p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-[#8C7A6B] block">Status do Contrato</span>
                    <span className="text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{diagnosticResult.status}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6B] block">Rede & Padrão</span>
                    <span className="text-[#FAF5F0] font-semibold block mt-0.5">
                      {diagnosticResult.network}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8C7A6B] block">Confirmações / Taxa de Rede</span>
                    <span className="text-[#D1823C] font-bold block mt-0.5">
                      {diagnosticResult.confirmations} blocos ({diagnosticResult.gasUsed})
                    </span>
                  </div>
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <form
                onSubmit={handleCreateTicket}
                className="lg:col-span-7 bg-[#1D130E] border border-[#2E1E15] rounded-[10px] p-5 flex flex-col gap-3.5"
              >
                <h3 className="text-xs font-bold text-[#FAF5F0]">
                  Abrir Chamado Prioritário do Colecionador
                </h3>

                <div className="flex flex-col gap-1">
                  <label htmlFor="support-category" className="text-[11px] text-[#C2B2A6]">
                    Categoria do atendimento
                  </label>
                  <select
                    id="support-category"
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] outline-none cursor-pointer"
                  >
                    <option value="Transação / Gas Fee">Transação / Gas Fee</option>
                    <option value="Custódia e Carteiras Web3">Custódia e Carteiras Web3</option>
                    <option value="Download de Arquivos IPFS">Download de Arquivos IPFS</option>
                    <option value="Denúncia de Coleção / Direitos Autorais">
                      Denúncia de Coleção / Direitos Autorais
                    </option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="support-subject" className="text-[11px] text-[#C2B2A6]">
                    Assunto
                  </label>
                  <input
                    id="support-subject"
                    type="text"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Ex.: Dúvida sobre confirmação de pedido na rede Polygon"
                    className="h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="support-message" className="text-[11px] text-[#C2B2A6]">
                    Descrição detalhada
                  </label>
                  <textarea
                    id="support-message"
                    rows={3}
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    placeholder="Informe o ID do pedido, carteira ou NFT relacionado..."
                    className="bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] p-3 text-xs text-[#FAF5F0] placeholder-[#7D6B5D] outline-none resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="h-9 px-5 rounded-[4px] bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs inline-flex items-center justify-center gap-1.5 w-fit transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Chamado</span>
                </button>
              </form>

              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-[#1D130E] border border-[#2E1E15] rounded-[10px] p-4">
                  <h3 className="text-xs font-bold text-[#FAF5F0] mb-3">
                    Seus Protocolos Recentes
                  </h3>
                  <div className="space-y-2.5">
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-[6px] bg-[#140D0A] border border-[#2C1E16] p-3 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-mono font-bold text-[#D1823C]">
                            #{t.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-extrabold ${
                              t.status === 'RESOLVIDO'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-[#D1823C]/20 text-[#D1823C]'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#FAF5F0]">{t.subject}</p>
                        <p className="text-[10px] text-[#8C7A6B]">
                          {t.category} • {t.createdAt}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1D130E] border border-[#2E1E15] rounded-[10px] p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#FAF5F0]">
                    <HelpCircle className="w-3.5 h-3.5 text-[#D1823C]" />
                    <span>Respostas Rápidas</span>
                  </div>
                  <p className="text-[11px] text-[#9E8C7E] leading-relaxed">
                    • <strong className="text-[#FAF5F0]">Idempotência no Checkout:</strong> reenvios após oscilação de rede recuperam o mesmo recibo sem duplicar cobrança.
                  </p>
                  <p className="text-[11px] text-[#9E8C7E] leading-relaxed">
                    • <strong className="text-[#FAF5F0]">Custódia Não-Custodial:</strong> você pode alternar sua carteira principal a qualquer momento em Carteiras.
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
