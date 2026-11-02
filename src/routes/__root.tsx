import { useEffect, useState } from 'react';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { AUTH_TOKEN_KEY } from '../api/client';
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
  const [isReauthOpen, setIsReauthOpen] = useState(false);

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

    window.addEventListener('jungle:session-expired', handleSessionExpired);
    return () => window.removeEventListener('jungle:session-expired', handleSessionExpired);
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-[#140D0A] text-[#FAF5F0] flex flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
      <AuthModal
        isOpen={isReauthOpen}
        initialMode="login"
        onClose={() => setIsReauthOpen(false)}
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
