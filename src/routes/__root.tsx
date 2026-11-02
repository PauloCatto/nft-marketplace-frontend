import { useEffect, useRef, useState } from 'react';
import { createRootRoute, Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useIsFetching, useIsMutating, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { AUTH_TOKEN_KEY, consumePendingRequireAuth, type RequireAuthDetail } from '../api/client';
import { AuthModal } from '../components/auth/AuthModal';
import { db } from '../mocks/db';
import { scenarios } from '../mocks/scenarios';

declare global {
  interface Window {
    __KURIO_DB__?: typeof db;
    __KURIO_SCENARIOS__?: typeof scenarios;
  }
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#140D0A] text-[#FAF5F0] flex flex-col items-center justify-center px-6 text-center">
      <span className="text-[#D1823C] font-extrabold text-5xl tracking-wider">404</span>
      <h1 className="text-xl font-extrabold text-[#FAF5F0] mt-3">Página não encontrada</h1>
      <p className="text-xs text-[#A8968A] max-w-md mt-2">
        O endereço acessado não existe ou foi removido do catálogo da Kurio.
      </p>
      <Link
        to="/"
        className="mt-6 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-xs px-6 py-2.5 rounded-md transition-colors"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}

function RootComponent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isFetchingCount = useIsFetching();
  const isMutatingCount = useIsMutating();
  const isRouteTransitioning = useRouterState({ select: (s) => s.isLoading });
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const pendingAuthActionRef = useRef<RequireAuthDetail | null>(null);

  const isGlobalBusy = isFetchingCount > 0 || isMutatingCount > 0 || isRouteTransitioning;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__KURIO_DB__ = db;
      window.__KURIO_SCENARIOS__ = scenarios;
    }
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.removeQueries({ queryKey: ['profile'] });
      queryClient.removeQueries({ queryKey: ['wallets'] });
      queryClient.removeQueries({ queryKey: ['favorites'] });
      toast.error('Sua sessão expirou. Conecte-se novamente para retomar de onde parou.');
      setIsReauthOpen(true);
    };

    const handleRequireAuth = () => {
      const detail = consumePendingRequireAuth();
      if (!detail) return;
      pendingAuthActionRef.current = detail;
      toast.warning(detail.message || 'Faça login na sua conta para continuar.');
      setIsReauthOpen(true);
    };

    handleRequireAuth();

    window.addEventListener('jungle:session-expired', handleSessionExpired);
    window.addEventListener('jungle:require-auth', handleRequireAuth);
    return () => {
      window.removeEventListener('jungle:session-expired', handleSessionExpired);
      window.removeEventListener('jungle:require-auth', handleRequireAuth);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-[#140D0A] text-[#FAF5F0] flex flex-col">
      {isGlobalBusy && (
        <>
          <div className="fixed top-0 left-0 right-0 h-[2.5px] bg-[#2A1C15] z-[100] overflow-hidden">
            <div className="h-full w-1/2 bg-[#D1823C] animate-pulse rounded-full" />
          </div>
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-5 left-5 z-[95] inline-flex items-center gap-2 bg-[#1F1510]/95 backdrop-blur-md border border-[#3D2A1E] px-3.5 py-2 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.65)] text-xs font-semibold text-[#FAF5F0]"
          >
            <Loader2 className="w-4 h-4 text-[#D1823C] animate-spin" />
            <span>{isMutatingCount > 0 ? 'Processando...' : 'Carregando...'}</span>
          </div>
        </>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      <AuthModal
        isOpen={isReauthOpen}
        initialMode="login"
        onClose={() => {
          setIsReauthOpen(false);
          pendingAuthActionRef.current = null;
        }}
        onSuccess={() => {
          const pending = pendingAuthActionRef.current;
          pendingAuthActionRef.current = null;
          if (pending?.onSuccess) {
            pending.onSuccess();
          } else if (pending?.redirectTo) {
            navigate({ to: pending.redirectTo });
          } else {
            navigate({ to: '/perfil' });
          }
        }}
      />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1F1510',
            border: '1px solid #3D2A1E',
            color: '#FAF5F0',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}
