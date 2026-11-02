import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';

interface FooterProps {
  onSelectCategory?: (category: string) => void;
}

export function Footer({ onSelectCategory }: FooterProps) {
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Digite um e-mail válido para receber alertas de lançamentos.');
      return;
    }
    toast.success(`Inscrição confirmada para ${trimmed}!`);
    setNewsletterEmail('');
  };

  const handleOutOfScopeClick = (label: string) => {
    toast.info(
      `A página "${label}" é complementar e está fora do escopo transacional da entrega.`
    );
  };

  return (
    <footer className="w-full flex flex-col">
      
      <div className="bg-[#1F1510] border border-[#2E2018] rounded-t-xl overflow-hidden">
        
        <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0">
          
          <div className="flex flex-col gap-3 lg:pr-7 lg:border-r lg:border-[#5C3D28]/60">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-full bg-[#D1823C] text-[#140D0A] font-extrabold text-lg flex items-center justify-center shadow-md"
            >
              W
            </div>
            <h3 className="text-[#FAF5F0] font-bold text-sm mt-1">Segurança da carteira</h3>
            <p className="text-[#A8968A] text-xs leading-relaxed">
              Proteja sua carteira e colecione arte digital verificada com confiança.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 lg:px-7 lg:border-r lg:border-[#5C3D28]/60">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-full bg-[#D1823C] text-[#140D0A] font-extrabold text-lg flex items-center justify-center shadow-md"
            >
              C
            </div>
            <h3 className="text-[#FAF5F0] font-bold text-sm mt-1">Criadores em destaque</h3>
            <p className="text-[#A8968A] text-xs leading-relaxed">
              Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 lg:px-7 lg:border-r lg:border-[#5C3D28]/60">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-full bg-[#D1823C] text-[#140D0A] font-extrabold text-lg flex items-center justify-center shadow-md"
            >
              D
            </div>
            <h3 className="text-[#FAF5F0] font-bold text-sm mt-1">Alertas de lançamentos</h3>
            <p className="text-[#A8968A] text-xs leading-relaxed">
              Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 lg:pl-7">
            <h3 className="text-[#FAF5F0] font-bold text-sm leading-snug">
              Antecipe-se ao próximo
              <br />
              lançamento
            </h3>
            <form onSubmit={handleNewsletterSubmit} className="flex items-stretch w-full mt-1">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Digite seu e-mail
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Digite seu e-mail..."
                className="flex-1 min-w-0 bg-[#332215] border border-[#422D1D] rounded-l-md px-3 py-2 text-xs text-[#FAF5F0] placeholder-[#8C7A6B] outline-none focus:border-[#D1823C]"
              />
              <button
                type="submit"
                className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-4 py-2 rounded-r-md transition-colors cursor-pointer shrink-0"
              >
                Enviar
              </button>
            </form>
            <p className="text-[#A8968A] text-[11px] leading-relaxed">
              Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
            </p>
          </div>
        </div>
        
        <div className="bg-[#332215] px-6 sm:px-8 lg:px-10 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center border-y border-[#422D1D]">
          <div className="text-[#FAF5F0] font-extrabold text-sm tracking-[0.08em] uppercase">
            KURIO
          </div>
          <div className="text-[#D8C7B8] text-xs leading-snug">
            Feito para colecionadores,
            <br />
            criadores e cultura
          </div>
          <div className="text-[#FAF5F0] text-xs font-medium">contato@email.com</div>
          <div className="text-[#FAF5F0] text-xs font-medium">+55 11 4002 8922</div>
        </div>
        
        <div className="p-6 sm:p-8 lg:p-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <div>
            <h4 className="text-[#FAF5F0] font-bold text-sm mb-4">
              Meu perfil
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A8968A]">
              <li>
                <Link
                  to="/profile"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Meu perfil
                </Link>
              </li>
              <li>
                <Link
                  to="/downloads"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Minha coleção
                </Link>
              </li>
              <li>
                <Link
                  to="/market"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Atividade
                </Link>
              </li>
              <li>
                <Link
                  to="/creators"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Estúdio do criador
                </Link>
              </li>
              <li>
                <Link
                  to="/wishlist"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Lista de interesse
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[#FAF5F0] font-bold text-sm mb-4">
              Central de ajuda
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A8968A]">
              <li>
                <Link
                  to="/support"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Central de ajuda
                </Link>
              </li>
              <li>
                <Link
                  to="/learn"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Como comprar NFTs
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  search={{ tab: 'wallets' }}
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Carteira e segurança
                </Link>
              </li>
              <li>
                <Link
                  to="/learn"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Política do mercado
                </Link>
              </li>
              <li>
                <Link
                  to="/support"
                  className="hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Denunciar item
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-[#FAF5F0] font-bold text-sm mb-4">
              Coleções
            </h4>
            <ul className="space-y-2.5 text-xs text-[#A8968A]">
              {['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade'].map((col) => (
                <li key={col}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(col);
                        document
                          .getElementById('catalogo-nfts')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="hover:text-[#D1823C] transition-colors cursor-pointer"
                  >
                    {col}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex flex-col gap-6">
            <div>
              <h4 className="text-[#FAF5F0] font-bold text-sm mb-3">
                Redes sociais
              </h4>
              <div className="flex items-center gap-2">
                
                <button
                  type="button"
                  aria-label="Facebook"
                  onClick={() => handleOutOfScopeClick('Facebook')}
                  className="w-8 h-8 rounded-[5px] border border-[#8E5D34] bg-transparent hover:border-[#D1823C] text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  aria-label="Instagram"
                  onClick={() => handleOutOfScopeClick('Instagram')}
                  className="w-8 h-8 rounded-[5px] border border-[#8E5D34] bg-transparent hover:border-[#D1823C] text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 stroke-current fill-none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  aria-label="Twitter"
                  onClick={() => handleOutOfScopeClick('Twitter')}
                  className="w-8 h-8 rounded-[5px] border border-[#8E5D34] bg-transparent hover:border-[#D1823C] text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  aria-label="LinkedIn"
                  onClick={() => handleOutOfScopeClick('LinkedIn')}
                  className="w-8 h-8 rounded-[5px] border border-[#8E5D34] bg-transparent hover:border-[#D1823C] text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68z" />
                  </svg>
                </button>
                
                <button
                  type="button"
                  aria-label="YouTube"
                  onClick={() => handleOutOfScopeClick('YouTube')}
                  className="w-8 h-8 rounded-[5px] border border-[#8E5D34] bg-transparent hover:border-[#D1823C] text-[#D1823C] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.58 7.19c-.23-.86-.91-1.54-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42c-.86.23-1.54.91-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81c.23.86.91 1.54 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42c.86-.23 1.54-.91 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3-5.2 3z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="w-fit">
              <h4 className="text-[#FAF5F0] font-bold text-sm mb-2.5 whitespace-nowrap">
                Carteiras compatíveis
              </h4>
              <div className="w-full flex flex-nowrap items-center justify-between px-2 py-1 rounded-[5px] border border-[#4E3524] bg-[#332215] text-[7.5px] font-bold uppercase tracking-normal text-[#D1823C] whitespace-nowrap">
                <span>METAMASK</span>
                <span aria-hidden="true">•</span>
                <span>WALLETCONNECT</span>
                <span aria-hidden="true">•</span>
                <span>COINBASE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="pt-6 pb-2 text-center text-[11px] text-[#8C7A6B]">
        © 2026 Kurio. Propriedade digital para todos.
      </div>
    </footer>
  );
}
