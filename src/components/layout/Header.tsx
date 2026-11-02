import { useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingCart, LogIn, LogOut, Menu, X, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, AUTH_TOKEN_KEY } from '../../api/client';
import type { CartResponse, User as UserType } from '../../api/contracts';
import { AuthModal } from '../auth/AuthModal';

interface HeaderProps {
  searchValue?: string;
  onSearchSubmit?: (query: string) => void;
}

export function Header({ searchValue = '', onSearchSubmit }: HeaderProps) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const queryClient = useQueryClient();
  const currentPath = routerState.location.pathname;

  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchValue));
  const [searchInput, setSearchInput] = useState(searchValue);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

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
  });

  const itemCount = cartData?.itemCount ?? 0;
  const currentUser = sessionData?.user;

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit(searchInput.trim());
    } else {
      navigate({
        to: '/',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          search: searchInput.trim() || undefined,
          page: 1,
        }),
      });
    }
  };

  const handleAuxiliaryNavClick = (label: string, targetSectionId?: string) => {
    setIsMobileMenuOpen(false);
    if (targetSectionId && currentPath === '/') {
      const el = document.getElementById(targetSectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    toast.info(`Seção "${label}": navegando para a vitrine correspondente.`);
  };

  const isMarketActive =
    currentPath.startsWith('/mercado') ||
    currentPath.startsWith('/carrinho') ||
    currentPath.startsWith('/pagamento');

  return (
    <header className="w-full border-b border-[#2A1C15] pb-2.5">
      <div className="flex items-center justify-between gap-4">
        
        <Link
          to="/"
          className="text-[#FAF5F0] font-extrabold text-base tracking-[0.12em] uppercase hover:text-[#D1823C] transition-colors"
        >
          KURIO
        </Link>

        
        <nav aria-label="Navegação principal" className="hidden md:flex items-center gap-8 lg:gap-10">
          <Link
            to="/"
            className={`relative py-1.5 text-xs font-medium transition-colors ${currentPath === '/'
                ? 'text-[#D1823C] font-semibold'
                : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
              }`}
          >
            Início
            {currentPath === '/' && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[11px] left-0 right-0 h-[2.5px] bg-[#D1823C] rounded-full"
              />
            )}
          </Link>

          <Link
            to="/mercado"
            className={`relative py-1.5 text-xs font-medium transition-colors ${isMarketActive
                ? 'text-[#D1823C] font-semibold'
                : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
              }`}
          >
            Mercado
            {isMarketActive && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[11px] left-0 right-0 h-[2.5px] bg-[#D1823C] rounded-full"
              />
            )}
          </Link>

          <button
            type="button"
            onClick={() => handleAuxiliaryNavClick('Criadores', 'destaques-criadores')}
            className="py-1.5 text-xs font-medium text-[#C2B2A6] hover:text-[#FAF5F0] transition-colors cursor-pointer"
          >
            Criadores
          </button>

          <button
            type="button"
            onClick={() => handleAuxiliaryNavClick('Aprenda', 'diario-cunhagem')}
            className="py-1.5 text-xs font-medium text-[#C2B2A6] hover:text-[#FAF5F0] transition-colors cursor-pointer"
          >
            Aprenda
          </button>
        </nav>

        
        <div className="flex items-center gap-3 sm:gap-5">
          
          {isSearchOpen ? (
            <form onSubmit={handleSearchFormSubmit} className="flex items-center gap-1.5">
              <label htmlFor="header-search-input" className="sr-only">
                Buscar NFTs por nome, coleção ou criador
              </label>
              <input
                id="header-search-input"
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Buscar NFT ou coleção..."
                autoFocus
                className="w-40 sm:w-56 bg-[#1F1510] border border-[#3D2A1E] focus:border-[#D1823C] rounded-md px-3 py-1.5 text-xs text-[#FAF5F0] placeholder-[#8C7A6B] outline-none"
              />
              <button
                type="submit"
                aria-label="Executar busca"
                className="p-1.5 text-[#D1823C] hover:text-[#FAF5F0] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Fechar busca"
                onClick={() => {
                  setIsSearchOpen(false);
                  if (searchInput) {
                    setSearchInput('');
                    onSearchSubmit?.('');
                  }
                }}
                className="p-1 text-[#8C7A6B] hover:text-[#FAF5F0] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              aria-label="Abrir busca de NFTs"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-[#FAF5F0] hover:text-[#D1823C] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          
          <Link
            to="/carrinho"
            aria-label={`Carrinho de compras com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
            className="relative p-2 text-[#FAF5F0] hover:text-[#D1823C] transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span
              data-testid="cart-badge-count"
              className="absolute -top-0.5 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#D1823C] text-[#140D0A] text-[10px] font-extrabold flex items-center justify-center leading-none"
            >
              {itemCount}
            </span>
          </Link>

          
          {currentUser ? (
            <>
              <Link
                to="/perfil"
                aria-label="Acessar Perfil do colecionador e Carteiras"
                title="Meu perfil e Carteiras"
                className={`p-2 transition-colors cursor-pointer ${
                  currentPath.startsWith('/perfil')
                    ? 'text-[#D1823C]'
                    : 'text-[#FAF5F0] hover:text-[#D1823C]'
                }`}
              >
                <User className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(AUTH_TOKEN_KEY);
                  queryClient.setQueryData(['auth', 'me'], null);
                  queryClient.invalidateQueries({ queryKey: ['cart'] });
                  queryClient.invalidateQueries({ queryKey: ['favorites'] });
                  toast.info('Sessão encerrada.');
                  if (currentPath.startsWith('/perfil')) {
                    navigate({ to: '/' });
                  }
                }}
                className="inline-flex items-center gap-2 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-4 py-2 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sair</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-4 py-2 rounded-md transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Entrar</span>
            </button>
          )}

          
          <button
            type="button"
            aria-label={isMobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-[#FAF5F0] hover:text-[#D1823C] transition-colors cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      
      {isMobileMenuOpen && (
        <nav
          aria-label="Menu mobile"
          className="md:hidden mt-4 pt-4 border-t border-[#2A1C15] flex flex-col gap-3"
        >
          <Link
            to="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`text-sm py-1.5 ${currentPath === '/' ? 'font-semibold text-[#D1823C]' : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
              }`}
          >
            Início
          </Link>
          <Link
            to="/mercado"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`text-sm py-1.5 ${isMarketActive ? 'font-semibold text-[#D1823C]' : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
              }`}
          >
            Mercado
          </Link>
          <button
            type="button"
            onClick={() => handleAuxiliaryNavClick('Criadores', 'destaques-criadores')}
            className="text-left text-sm text-[#C2B2A6] hover:text-[#FAF5F0] py-1.5"
          >
            Criadores
          </button>
          <button
            type="button"
            onClick={() => handleAuxiliaryNavClick('Aprenda', 'diario-cunhagem')}
            className="text-left text-sm text-[#C2B2A6] hover:text-[#FAF5F0] py-1.5"
          >
            Aprenda
          </button>
        </nav>
      )}

      
      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
}

