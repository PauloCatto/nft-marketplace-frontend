import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  ShoppingCart,
  LogIn,
  LogOut,
  Menu,
  X,
  User,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, AUTH_TOKEN_KEY } from '../../api/client';
import type { CartResponse, NFTListResponse, User as UserType } from '../../api/contracts';
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
  const [debouncedQuery, setDebouncedQuery] = useState(searchValue.trim());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (!isInternalChangeRef.current) {
      setSearchInput(searchValue);
      setDebouncedQuery(searchValue.trim());
      if (searchValue) {
        setIsSearchOpen(true);
      }
    }
    isInternalChangeRef.current = false;
  }, [searchValue]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      setDebouncedQuery(trimmed);

      if (!isSearchOpen) return;

      if (onSearchSubmit && trimmed !== searchValue.trim()) {
        isInternalChangeRef.current = true;
        onSearchSubmit(trimmed);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [searchInput, isSearchOpen, onSearchSubmit, searchValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        if (!searchInput.trim()) {
          setIsSearchOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchInput]);

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

  const { data: livePreviewData, isFetching: isPreviewFetching } = useQuery<NFTListResponse>({
    queryKey: ['nfts', 'navbar-preview', debouncedQuery],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<NFTListResponse>('/nfts', {
        signal,
        params: {
          search: debouncedQuery || undefined,
          limit: 5,
          page: 1,
        },
      });
      return res.data;
    },
    enabled: isSearchOpen && isDropdownOpen && debouncedQuery.length > 0,
  });

  const currentUser = sessionData?.user;
  const itemCount = currentUser ? (cartData?.itemCount ?? 0) : 0;
  const previewItems = livePreviewData?.items ?? [];
  const previewTotal = livePreviewData?.total ?? 0;

  const applySearchFilter = (query: string, scrollToCatalog = false) => {
    const trimmed = query.trim();
    isInternalChangeRef.current = true;
    setSearchInput(query);
    setDebouncedQuery(trimmed);

    if (onSearchSubmit) {
      onSearchSubmit(trimmed);
    } else {
      navigate({
        to: '/',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          search: trimmed || undefined,
          page: 1,
        }),
      });
    }

    if (scrollToCatalog && currentPath === '/') {
      const catalogSection = document.getElementById('catalogo-nfts');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleSearchFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    applySearchFilter(searchInput, true);
  };

  const handleClearSearch = () => {
    isInternalChangeRef.current = true;
    setSearchInput('');
    setDebouncedQuery('');
    if (onSearchSubmit) {
      onSearchSubmit('');
    } else if (currentPath === '/') {
      navigate({
        to: '/',
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          search: undefined,
          page: 1,
        }),
      });
    }
    searchInputRef.current?.focus();
  };

  const isCreatorsActive = currentPath.startsWith('/criadores');
  const isLearnActive = currentPath.startsWith('/aprenda');

  const isMarketActive =
    currentPath.startsWith('/mercado') ||
    currentPath.startsWith('/carrinho') ||
    currentPath.startsWith('/pagamento');

  return (
    <header className="w-full border-b border-[#2A1C15] pb-2.5 relative z-40">
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
            className={`relative py-1.5 text-xs font-medium transition-colors ${
              currentPath === '/'
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
            className={`relative py-1.5 text-xs font-medium transition-colors ${
              isMarketActive
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

          <Link
            to="/criadores"
            className={`relative py-1.5 text-xs font-medium transition-colors ${
              isCreatorsActive
                ? 'text-[#D1823C] font-semibold'
                : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
            }`}
          >
            Criadores
            {isCreatorsActive && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[11px] left-0 right-0 h-[2.5px] bg-[#D1823C] rounded-full"
              />
            )}
          </Link>

          <Link
            to="/aprenda"
            className={`relative py-1.5 text-xs font-medium transition-colors ${
              isLearnActive
                ? 'text-[#D1823C] font-semibold'
                : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
            }`}
          >
            Aprenda
            {isLearnActive && (
              <span
                aria-hidden="true"
                className="absolute -bottom-[11px] left-0 right-0 h-[2.5px] bg-[#D1823C] rounded-full"
              />
            )}
          </Link>
        </nav>

        <div className="flex items-center gap-3 sm:gap-5">
          <div ref={searchContainerRef} className="relative">
            {isSearchOpen ? (
              <form
                onSubmit={handleSearchFormSubmit}
                className="flex items-center bg-[#1F1510] border border-[#3D2A1E] focus-within:border-[#D1823C] focus-within:ring-1 focus-within:ring-[#D1823C]/40 rounded-md px-2.5 py-1 transition-all"
              >
                <Search className="w-3.5 h-3.5 text-[#D1823C] shrink-0 mr-2" />
                <label htmlFor="header-search-input" className="sr-only">
                  Buscar NFTs por nome, coleção, criador ou rede
                </label>
                <input
                  ref={searchInputRef}
                  id="header-search-input"
                  type="text"
                  value={searchInput}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsDropdownOpen(false);
                      if (!searchInput.trim()) {
                        setIsSearchOpen(false);
                      }
                    }
                  }}
                  placeholder="Digite para filtrar NFTs..."
                  autoFocus
                  autoComplete="off"
                  className="w-44 sm:w-64 bg-transparent text-xs text-[#FAF5F0] placeholder-[#8C7A6B] outline-none"
                />
                {isPreviewFetching && (
                  <Loader2 className="w-3.5 h-3.5 text-[#D1823C] animate-spin shrink-0 mr-1" />
                )}
                {searchInput ? (
                  <button
                    type="button"
                    aria-label="Limpar busca"
                    onClick={handleClearSearch}
                    className="p-0.5 text-[#8C7A6B] hover:text-[#FAF5F0] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Fechar busca"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsSearchOpen(false);
                    }}
                    className="p-0.5 text-[#8C7A6B] hover:text-[#FAF5F0] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            ) : (
              <button
                type="button"
                aria-label="Abrir busca de NFTs"
                onClick={() => {
                  setIsSearchOpen(true);
                  setIsDropdownOpen(true);
                }}
                className="p-2 text-[#FAF5F0] hover:text-[#D1823C] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {isSearchOpen && isDropdownOpen && debouncedQuery.length > 0 && (
              <div
                role="region"
                aria-label="Resultados da busca em tempo real"
                className="absolute right-0 mt-2 w-[320px] sm:w-[370px] bg-[#1D120C] border border-[#3A2418] rounded-xl shadow-[0_18px_45px_rgba(0,0,0,0.75)] overflow-hidden z-50"
              >
                <div className="px-3.5 py-2.5 border-b border-[#2C1B12] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#C9B3A3] flex items-center gap-1.5">
                    {isPreviewFetching ? (
                      <>
                        <Loader2 className="w-3 h-3 text-[#D1823C] animate-spin" />
                        <span>Buscando &ldquo;{debouncedQuery}&rdquo;...</span>
                      </>
                    ) : (
                      <span>
                        Resultados para &ldquo;{debouncedQuery}&rdquo; ({previewTotal})
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-[10.5px] text-[#D1823C] hover:underline font-semibold cursor-pointer"
                  >
                    Limpar
                  </button>
                </div>

                {isPreviewFetching && previewItems.length === 0 ? (
                  <div className="px-4 py-8 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 text-[#D1823C] animate-spin" />
                    <span className="text-xs text-[#C2B2A6]">Filtrando catálogo...</span>
                  </div>
                ) : (
                  <div className="max-h-[290px] overflow-y-auto divide-y divide-[#281810]">
                    {previewItems.length > 0 ? (
                      previewItems.map((nft) => (
                        <div
                          key={nft.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setIsDropdownOpen(false);
                            navigate({ to: '/mercado', search: { id: nft.id } });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setIsDropdownOpen(false);
                              navigate({ to: '/mercado', search: { id: nft.id } });
                            }
                          }}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[#271810] transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={nft.imageUrl}
                              alt={nft.name}
                              className="w-10 h-10 rounded-lg object-cover border border-[#3B2518] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold text-[#FAF5F0] group-hover:text-[#D1823C] transition-colors truncate">
                                  {nft.name}
                                </p>
                                {nft.isTrending && (
                                  <span className="px-1.5 py-0.2 rounded bg-[#D1823C]/20 text-[#D1823C] text-[9px] font-extrabold uppercase shrink-0">
                                    Raro
                                  </span>
                                )}
                              </div>
                              <p className="text-[10.5px] text-[#9A8473] truncate">
                                {nft.collection} • {nft.network || 'Ethereum'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-extrabold text-[#D1823C]">
                              {nft.priceEth} ETH
                            </span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#8C7A6B] group-hover:text-[#D1823C] transition-colors" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center">
                        <p className="text-xs text-[#C2B2A6] font-medium">
                          Nenhum NFT encontrado para &ldquo;{debouncedQuery}&rdquo;
                        </p>
                        <p className="text-[11px] text-[#8C7A6B] mt-1">
                          Tente buscar por nome, coleção ou rede.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {previewItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      applySearchFilter(searchInput, true);
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#24160E] hover:bg-[#2E1C12] border-t border-[#2C1B12] text-[11px] font-bold text-[#D1823C] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>
                      Ver {previewTotal}{' '}
                      {previewTotal === 1 ? 'resultado no catálogo' : 'resultados no catálogo'}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {currentUser ? (
            <Link
              to="/carrinho"
              aria-label={`Carrinho de compras com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
              className="relative p-2 text-[#FAF5F0] hover:text-[#D1823C] transition-colors cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              {itemCount > 0 && (
                <span
                  data-testid="cart-badge-count"
                  className="absolute -top-0.5 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#D1823C] text-[#140D0A] text-[10px] font-extrabold flex items-center justify-center leading-none"
                >
                  {itemCount}
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
                className="relative p-2 text-[#FAF5F0]/35 cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200 absolute right-0 top-full mt-2 w-60 bg-[#1F1510] border border-[#3D2A1E] rounded-lg p-3 shadow-[0_12px_30px_rgba(0,0,0,0.8)] z-50 text-left"
              >
                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-[#1F1510] border-l border-t border-[#3D2A1E] rotate-45" />
                <p className="text-[11px] font-bold text-[#D1823C] mb-1">Login necessário</p>
                <p className="text-[10.5px] leading-relaxed text-[#C2B2A6]">
                  Você precisa estar logado na sua conta para acessar o carrinho e comprar NFTs.
                </p>
              </div>
            </div>
          )}

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
            className={`text-sm py-1.5 ${
              currentPath === '/' ? 'font-semibold text-[#D1823C]' : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
            }`}
          >
            Início
          </Link>
          <Link
            to="/mercado"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`text-sm py-1.5 ${
              isMarketActive ? 'font-semibold text-[#D1823C]' : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
            }`}
          >
            Mercado
          </Link>
          <Link
            to="/criadores"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`text-sm py-1.5 ${
              isCreatorsActive ? 'font-semibold text-[#D1823C]' : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
            }`}
          >
            Criadores
          </Link>
          <Link
            to="/aprenda"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`text-sm py-1.5 ${
              isLearnActive ? 'font-semibold text-[#D1823C]' : 'text-[#C2B2A6] hover:text-[#FAF5F0]'
            }`}
          >
            Aprenda
          </Link>
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
