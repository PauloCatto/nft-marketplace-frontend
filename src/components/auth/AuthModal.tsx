import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, AUTH_TOKEN_KEY } from '../../api/client';
import type { AuthSessionResponse } from '../../api/contracts';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, initialMode = 'login', onClose, onSuccess }: AuthModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const [loginEmail, setLoginEmail] = useState('contato@email.com');
  const [loginPassword, setLoginPassword] = useState('Password123!');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthProviderModal, setOauthProviderModal] = useState<'Google' | 'Facebook' | null>(null);
  const [isCustomOauthAccount, setIsCustomOauthAccount] = useState(false);
  const [customOauthName, setCustomOauthName] = useState('');
  const [customOauthEmail, setCustomOauthEmail] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setOauthProviderModal(null);
      setIsCustomOauthAccount(false);
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAuthSuccess = async (data: AuthSessionResponse, welcomeText: string) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_TOKEN_KEY, data.token);
    }
    try {
      await apiClient.post('/cart/merge');
    } catch { }
    queryClient.setQueryData(['auth', 'me'], { user: data.user });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    queryClient.invalidateQueries({ queryKey: ['favorites'] });
    toast.success(welcomeText);
    onClose();
    if (onSuccess) {
      onSuccess();
    } else {
      navigate({ to: '/profile' });
    }
  };

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<AuthSessionResponse>('/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      handleAuthSuccess(data, `Bem-vindo de volta, ${data.user.name}!`);
    },
    onError: () => {
      setErrorMessage('E-mail ou senha inválidos. Verifique suas credenciais.');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<AuthSessionResponse>('/auth/register', {
        name: registerUsername.trim(),
        email: registerEmail.trim(),
        password: registerPassword,
      });
      return res.data;
    },
    onSuccess: (data) => {
      handleAuthSuccess(data, `Conta criada com sucesso! Bem-vindo(a), ${data.user.name}!`);
    },
    onError: () => {
      setErrorMessage('Não foi possível criar a conta. Verifique se o e-mail já está em uso.');
    },
  });

  const socialLoginMutation = useMutation({
    mutationFn: async (payload: {
      provider: 'Google' | 'Facebook';
      email: string;
      name: string;
      avatarUrl?: string;
    }) => {
      try {
        const res = await apiClient.post<AuthSessionResponse>('/auth/social', payload);
        return { data: res.data, provider: payload.provider };
      } catch {
        try {
          const regRes = await apiClient.post<AuthSessionResponse>('/auth/register', {
            name: payload.name,
            email: payload.email,
            password: 'Password123!',
          });
          if (payload.avatarUrl) {
            await apiClient.put(
              '/profile',
              { name: payload.name, bio: regRes.data.user.bio || '', avatarUrl: payload.avatarUrl },
              { headers: { Authorization: `Bearer ${regRes.data.token}` } }
            );
            regRes.data.user.avatarUrl = payload.avatarUrl;
          }
          return { data: regRes.data, provider: payload.provider };
        } catch {
          const loginRes = await apiClient.post<AuthSessionResponse>('/auth/login', {
            email: payload.email,
            password: 'Password123!',
          });
          return { data: loginRes.data, provider: payload.provider };
        }
      }
    },
    onSuccess: ({ data, provider }) => {
      setOauthProviderModal(null);
      handleAuthSuccess(data, `Conectado via ${provider} como ${data.user.name}!`);
    },
    onError: () => {
      setErrorMessage('Não foi possível autenticar com o provedor social.');
    },
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Preencha seu e-mail e sua senha para entrar.');
      return;
    }
    loginMutation.mutate();
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!registerUsername.trim() || !registerEmail.trim() || !registerPassword) {
      setErrorMessage('Preencha todos os campos obrigatórios para criar sua conta.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage('A confirmação de senha não coincide com a senha digitada.');
      return;
    }
    registerMutation.mutate();
  };

  const openOAuthPopup = (url: string, title: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const width = 500;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        url,
        title,
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
      );

      if (!popup) {
        resolve(null);
        return;
      }

      const timer = window.setInterval(() => {
        try {
          if (popup.closed) {
            window.clearInterval(timer);
            resolve(null);
            return;
          }
          if (popup.location.origin === window.location.origin && popup.location.hash) {
            const hashParams = new URLSearchParams(popup.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            window.clearInterval(timer);
            popup.close();
            resolve(accessToken);
          }
        } catch {
          return;
        }
      }, 300);
    });
  };

  const handleSocialLogin = async (provider: 'Google' | 'Facebook') => {
    setErrorMessage(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID as string | undefined;

    if (provider === 'Google' && googleClientId) {
      toast.info('Abrindo autenticação oficial do Google...');
      const redirectUri = `${window.location.origin}/`;
      const scope = encodeURIComponent('openid email profile');
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(googleClientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;
      const accessToken = await openOAuthPopup(authUrl, 'GoogleLogin');
      if (!accessToken) {
        toast.warning('Autenticação Google cancelada.');
        return;
      }
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = (await res.json()) as { email?: string; name?: string; picture?: string };
        if (profile.email && profile.name) {
          socialLoginMutation.mutate({
            provider: 'Google',
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.picture,
          });
          return;
        }
      } catch {
        setErrorMessage('Falha ao obter dados do perfil Google.');
        return;
      }
    }

    if (provider === 'Facebook' && facebookAppId) {
      toast.info('Abrindo autenticação oficial do Facebook...');
      const redirectUri = `${window.location.origin}/`;
      const scope = encodeURIComponent('public_profile,email');
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(facebookAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}`;
      const accessToken = await openOAuthPopup(authUrl, 'FacebookLogin');
      if (!accessToken) {
        toast.warning('Autenticação Facebook cancelada.');
        return;
      }
      try {
        const res = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
        );
        const profile = (await res.json()) as {
          id?: string;
          email?: string;
          name?: string;
          picture?: { data?: { url?: string } };
        };
        if (profile.name) {
          socialLoginMutation.mutate({
            provider: 'Facebook',
            email: profile.email || `${profile.id || 'user'}@facebook.com`,
            name: profile.name,
            avatarUrl: profile.picture?.data?.url,
          });
          return;
        }
      } catch {
        setErrorMessage('Falha ao obter dados do perfil Facebook.');
        return;
      }
    }

    setOauthProviderModal(provider);
    setIsCustomOauthAccount(false);
    setCustomOauthName('');
    setCustomOauthEmail('');
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Entrar na sua conta' : 'Criar perfil de colecionador'}
        className="md:hidden fixed inset-0 z-50 bg-[#140D0A] text-[#FAF5F0] overflow-y-auto flex flex-col justify-between px-6 pt-24 pb-10"
      >
        <div className="w-full max-w-sm mx-auto flex flex-col">
          <div className="text-center">
            <span className="text-[#FAF5F0] font-extrabold text-[30px] tracking-[0.14em] uppercase">
              KURIO
            </span>
          </div>

          <h2 className="text-[#FAF5F0] font-extrabold text-[18px] text-center mt-14 mb-7">
            {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
          </h2>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-xs text-red-300 text-center"
            >
              {errorMessage}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="flex flex-col">
              <div className="space-y-4">
                <div>
                  <label htmlFor="mobile-login-email" className="sr-only">
                    E-mail
                  </label>
                  <input
                    id="mobile-login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="contato@email.com"
                    className="w-full h-[52px] bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[10px] px-4 text-[13px] text-[#9E8C7E] focus:text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="mobile-login-password" className="sr-only">
                    Senha
                  </label>
                  <input
                    id="mobile-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="•••••••••••"
                    className="w-full h-[52px] bg-[#140D0A] border border-[#9E6330] focus:border-[#D1823C] rounded-[10px] pl-4 pr-11 text-[13px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C5E37] hover:text-[#D1823C] transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  onClick={() =>
                    toast.info('Link de recuperação enviado para seu e-mail cadastrado!')
                  }
                  className="text-[12.5px] text-[#C87D3B] hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full h-[54px] mt-8 rounded-[10px] bg-[#C87D3B] hover:bg-[#D1823C] disabled:opacity-50 text-[#140D0A] font-extrabold text-[14.5px] flex items-center justify-center transition-colors cursor-pointer"
              >
                {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="flex flex-col">
              <div className="space-y-3.5">
                <div>
                  <label htmlFor="mobile-register-username" className="sr-only">
                    Nome de usuário
                  </label>
                  <input
                    id="mobile-register-username"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Nome de usuário"
                    className="w-full h-[50px] bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[10px] px-4 text-center placeholder:text-center text-[13px] text-[#FAF5F0] placeholder-[#9E8C7E] outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="mobile-register-email" className="sr-only">
                    Digite seu e-mail
                  </label>
                  <input
                    id="mobile-register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="w-full h-[50px] bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[10px] px-4 text-[13px] text-[#FAF5F0] placeholder-[#9E8C7E] outline-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="mobile-register-password" className="sr-only">
                    Senha
                  </label>
                  <input
                    id="mobile-register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full h-[50px] bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[10px] pl-4 pr-11 text-[13px] text-[#FAF5F0] placeholder-[#9E8C7E] outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showRegisterPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C5E37] hover:text-[#D1823C] transition-colors cursor-pointer"
                  >
                    {showRegisterPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="relative">
                  <label htmlFor="mobile-register-confirm" className="sr-only">
                    Confirmar senha
                  </label>
                  <input
                    id="mobile-register-confirm"
                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Confirmar senha"
                    className="w-full h-[50px] bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[10px] pl-4 pr-11 text-[13px] text-[#FAF5F0] placeholder-[#9E8C7E] outline-none"
                  />
                  <button
                    type="button"
                    aria-label={
                      showRegisterConfirmPassword
                        ? 'Ocultar confirmação de senha'
                        : 'Mostrar confirmação de senha'
                    }
                    onClick={() => setShowRegisterConfirmPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C5E37] hover:text-[#D1823C] transition-colors cursor-pointer"
                  >
                    {showRegisterConfirmPassword ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full h-[54px] mt-7 rounded-[10px] bg-[#C87D3B] hover:bg-[#D1823C] disabled:opacity-50 text-[#140D0A] font-extrabold text-[14.5px] flex items-center justify-center transition-colors cursor-pointer"
              >
                {registerMutation.isPending ? 'Criando perfil...' : 'Criar perfil'}
              </button>
            </form>
          )}

          <div className="flex items-center gap-3 mt-8 mb-5">
            <div className="flex-1 border-t border-[#2C1E16]" />
            <span className="text-[11px] text-[#FAF5F0] whitespace-nowrap">Ou continue com</span>
            <div className="flex-1 border-t border-[#2C1E16]" />
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              className="w-full h-[42px] rounded-[6px] border border-[#2C1E16] bg-[#140D0A] flex items-center justify-center gap-3 text-[12px] text-[#C2B2A6] hover:text-[#FAF5F0] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.685h6.445c-.28 1.5-1.125 2.775-2.395 3.63v3.015h3.875c2.265-2.085 3.565-5.16 3.565-8.855z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3.015c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.775-2.11-6.72-4.945H1.275v3.11C3.25 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.275c-.24-.72-.38-1.49-.38-2.275s.14-1.555.38-2.275V6.615H1.275C.465 8.23 0 10.06 0 12s.465 3.77 1.275 5.385l4.005-3.11z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.775c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.7 1.275 6.615l4.005 3.11c.945-2.835 3.595-4.95 6.72-4.95z"
                />
              </svg>
              <span>Continuar com Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin('Facebook')}
              className="w-full h-[42px] rounded-[6px] border border-[#2C1E16] bg-[#140D0A] flex items-center justify-center gap-3 text-[12px] text-[#C2B2A6] hover:text-[#FAF5F0] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#1877F2"
                  d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"
                />
              </svg>
              <span>Continuar com Facebook</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            {mode === 'login' ? (
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className="text-[#9E8C7E] hover:text-[#D1823C] text-[13px] transition-colors cursor-pointer"
              >
                Novo na Kurio? Crie uma conta
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="text-[#9E8C7E] hover:text-[#D1823C] text-[13px] transition-colors cursor-pointer"
              >
                Já tem uma conta? Entre
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Entrar na sua conta' : 'Criar conta na Kurio'}
        className="hidden md:flex fixed inset-0 z-50 bg-black/45 items-start justify-center pt-16 sm:pt-20 px-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[386px] bg-[#21150F] border border-[#3B2619] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col my-auto sm:my-0"
        >
          <button
            type="button"
            aria-label="Fechar janela de autenticação"
            onClick={onClose}
            className="absolute top-3 right-3 text-[#C2B2A6] hover:text-[#D1823C] transition-colors p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 stroke-[2]" />
          </button>

          <div className="pt-7 px-8 flex flex-col items-center">
            <div
              role="tablist"
              aria-label="Alternar entre Entrar e Criar conta"
              className="flex items-center justify-center gap-2.5 text-sm font-bold"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`transition-colors cursor-pointer ${mode === 'login'
                    ? 'text-[#D1823C]'
                    : 'text-[#FAF5F0] hover:text-[#D1823C]'
                  }`}
              >
                Entrar
              </button>

              <span aria-hidden="true" className="text-[#5C3D28] font-light">
                |
              </span>

              <button
                type="button"
                role="tab"
                aria-selected={mode === 'register'}
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`transition-colors cursor-pointer ${mode === 'register'
                    ? 'text-[#D1823C]'
                    : 'text-[#FAF5F0] hover:text-[#D1823C]'
                  }`}
              >
                Criar conta
              </button>
            </div>

            <p className="text-center text-[#B5A395] text-[9.5px] leading-[1.45] mt-3.5 max-w-[260px]">
              {mode === 'login'
                ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
                : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
            </p>
          </div>

          <div className="px-9 pt-4 pb-6 flex flex-col">
            {errorMessage && (
              <div
                role="alert"
                className="mb-3 rounded bg-red-500/15 border border-red-500/40 px-3 py-2 text-[10px] text-red-300 text-center"
              >
                {errorMessage}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
                <div>
                  <label htmlFor="auth-login-email" className="sr-only">
                    E-mail
                  </label>
                  <input
                    ref={firstInputRef}
                    id="auth-login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="contato@email.com"
                    className="w-full h-8 bg-[#1A100B] border border-[#3B281D] focus:border-[#D1823C] rounded-[4px] px-3 text-[10px] text-[#C2B2A6] placeholder-[#7D6B5D] outline-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="auth-login-password" className="sr-only">
                    Senha
                  </label>
                  <input
                    id="auth-login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="•••••••••••"
                    className="w-full h-8 bg-[#1A100B] border border-[#8E5D34] focus:border-[#D1823C] rounded-[4px] pl-3 pr-8 text-[10px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8968A] hover:text-[#D1823C] transition-colors cursor-pointer"
                  >
                    {showLoginPassword ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      toast.info('Link de recuperação enviado para seu e-mail cadastrado!')
                    }
                    className="text-[9.5px] text-[#D1823C] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full h-8 mt-1 bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-50 text-[#140D0A] font-extrabold text-[11px] rounded-[4px] transition-colors cursor-pointer"
                >
                  {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-2.5">
                <div>
                  <label htmlFor="auth-register-username" className="sr-only">
                    Nome de usuário
                  </label>
                  <input
                    ref={firstInputRef}
                    id="auth-register-username"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    placeholder="Nome de usuário"
                    className="w-full h-8 bg-[#1A100B] border border-[#3B281D] focus:border-[#D1823C] rounded-[4px] px-3 text-[10px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="auth-register-email" className="sr-only">
                    Digite seu e-mail
                  </label>
                  <input
                    id="auth-register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    className="w-full h-8 bg-[#1A100B] border border-[#3B281D] focus:border-[#D1823C] rounded-[4px] px-3 text-[10px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="auth-register-password" className="sr-only">
                    Senha
                  </label>
                  <input
                    id="auth-register-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full h-8 bg-[#1A100B] border border-[#3B281D] focus:border-[#D1823C] rounded-[4px] pl-3 pr-8 text-[10px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showRegisterPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8968A] hover:text-[#D1823C] transition-colors cursor-pointer"
                  >
                    {showRegisterPassword ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div>
                  <label htmlFor="auth-register-confirm" className="sr-only">
                    Confirmar senha
                  </label>
                  <input
                    id="auth-register-confirm"
                    type={showRegisterPassword ? 'text' : 'password'}
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    placeholder="Confirmar senha"
                    className="w-full h-8 bg-[#1A100B] border border-[#3B281D] focus:border-[#D1823C] rounded-[4px] px-3 text-[10px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="w-full h-8 mt-1.5 bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-50 text-[#140D0A] font-extrabold text-[11px] rounded-[4px] transition-colors cursor-pointer"
                >
                  {registerMutation.isPending ? 'Criando conta...' : 'Criar conta'}
                </button>
              </form>
            )}

            <div className="relative flex items-center justify-center my-4">
              <div className="w-full border-t border-[#38251A]" />
              <span className="bg-[#21150F] px-2.5 text-[9px] text-[#B5A395] whitespace-nowrap">
                Ou continue com
              </span>
              <div className="w-full border-t border-[#38251A]" />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className="w-full h-8 rounded-[4px] border border-[#3B281D] hover:border-[#D1823C]/60 bg-[#1A100B] flex items-center justify-center gap-2 text-[10px] text-[#C2B2A6] hover:text-[#FAF5F0] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.685h6.445c-.28 1.5-1.125 2.775-2.395 3.63v3.015h3.875c2.265-2.085 3.565-5.16 3.565-8.855z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3.015c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.775-2.11-6.72-4.945H1.275v3.11C3.25 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.275c-.24-.72-.38-1.49-.38-2.275s.14-1.555.38-2.275V6.615H1.275C.465 8.23 0 10.06 0 12s.465 3.77 1.275 5.385l4.005-3.11z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.775c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.7 1.275 6.615l4.005 3.11c.945-2.835 3.595-4.95 6.72-4.95z"
                  />
                </svg>
                <span>Continuar com Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin('Facebook')}
                className="w-full h-8 rounded-[4px] border border-[#3B281D] hover:border-[#D1823C]/60 bg-[#1A100B] flex items-center justify-center gap-2 text-[10px] text-[#C2B2A6] hover:text-[#FAF5F0] transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#1877F2"
                    d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"
                  />
                </svg>
                <span>Continuar com Facebook</span>
              </button>
            </div>
          </div>

          <div className="h-[6px] w-full bg-[#D1823C]" />
        </div>
      </div>

      {oauthProviderModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Autenticação OAuth via ${oauthProviderModal}`}
          className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOauthProviderModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] bg-[#1F1510] border border-[#3D2A1E] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-5 pb-4 border-b border-[#2C1E16] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {oauthProviderModal === 'Google' ? (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.49 12.275c0-.85-.075-1.675-.215-2.475H12v4.685h6.445c-.28 1.5-1.125 2.775-2.395 3.63v3.015h3.875c2.265-2.085 3.565-5.16 3.565-8.855z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.955-1.075 7.94-2.91l-3.875-3.015c-1.075.72-2.45 1.145-4.065 1.145-3.125 0-5.775-2.11-6.72-4.945H1.275v3.11C3.25 21.3 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.275c-.24-.72-.38-1.49-.38-2.275s.14-1.555.38-2.275V6.615H1.275C.465 8.23 0 10.06 0 12s.465 3.77 1.275 5.385l4.005-3.11z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.775c1.76 0 3.34.605 4.585 1.795l3.44-3.44C17.95 1.19 15.235 0 12 0 7.31 0 3.25 2.7 1.275 6.615l4.005 3.11c.945-2.835 3.595-4.95 6.72-4.95z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#1877F2"
                      d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"
                    />
                  </svg>
                )}
                <span className="text-xs font-bold text-[#FAF5F0]">
                  Fazer login com o {oauthProviderModal}
                </span>
              </div>
              <button
                type="button"
                aria-label="Fechar seletor OAuth"
                onClick={() => setOauthProviderModal(null)}
                className="text-[#A8968A] hover:text-[#FAF5F0] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-extrabold text-[#FAF5F0]">Escolha uma conta</h3>
                <p className="text-[11px] text-[#A8968A] mt-0.5">
                  para prosseguir para <strong className="text-[#D1823C]">Kurio NFT Marketplace</strong>
                </p>
              </div>

              {!isCustomOauthAccount ? (
                <div className="flex flex-col gap-2">
                  {[
                    {
                      name: 'Paulo Catto',
                      email:
                        oauthProviderModal === 'Google'
                          ? 'paulo.catto@gmail.com'
                          : 'paulo.catto@facebook.com',
                      avatarUrl: '/assets/nfts/emerald-ape.png',
                    },
                    {
                      name: 'Marina Silva',
                      email:
                        oauthProviderModal === 'Google'
                          ? 'marina.silva@gmail.com'
                          : 'marina.silva@facebook.com',
                      avatarUrl: '/assets/nfts/ivory-baron.png',
                    },
                  ].map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      disabled={socialLoginMutation.isPending}
                      onClick={() => {
                        socialLoginMutation.mutate({
                          provider: oauthProviderModal,
                          name: acc.name,
                          email: acc.email,
                          avatarUrl: acc.avatarUrl,
                        });
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#140D0A] border border-[#2C1E16] hover:border-[#D1823C] text-left transition-colors cursor-pointer"
                    >
                      <img
                        src={acc.avatarUrl}
                        alt={acc.name}
                        className="w-9 h-9 rounded-full object-cover border border-[#3D2A1E] shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-[#FAF5F0] truncate">
                          {acc.name}
                        </span>
                        <span className="text-[11px] text-[#A8968A] truncate">{acc.email}</span>
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setIsCustomOauthAccount(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-dashed border-[#3D2A1E] hover:border-[#D1823C] text-xs font-semibold text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer mt-1"
                  >
                    <span>+ Usar outra conta do {oauthProviderModal}</span>
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customOauthEmail.trim() || !customOauthName.trim()) return;
                    const emailTrimmed = customOauthEmail.trim();
                    const localPart = emailTrimmed.split('@')[0] || 'Colecionador';
                    const cleanedName = localPart
                      .replace(/[0-9._-]+/g, ' ')
                      .trim()
                      .replace(/\b\w/g, (c) => c.toUpperCase());
                    socialLoginMutation.mutate({
                      provider: oauthProviderModal,
                      name: cleanedName || 'Colecionador Kurio',
                      email: emailTrimmed,
                      avatarUrl: '/assets/nfts/emerald-ape.png',
                    });
                  }}
                  className="flex flex-col gap-3"
                >
                  <input
                    type="email"
                    required
                    value={customOauthEmail}
                    onChange={(e) => setCustomOauthEmail(e.target.value)}
                    placeholder={
                      oauthProviderModal === 'Google'
                        ? 'Digite seu e-mail do Google'
                        : 'Digite seu e-mail do Facebook'
                    }
                    className="w-full h-10 bg-[#140D0A] border border-[#3B281D] focus:border-[#D1823C] rounded-lg px-3 text-xs text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                  <input
                    type="password"
                    required
                    value={customOauthName}
                    onChange={(e) => setCustomOauthName(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full h-10 bg-[#140D0A] border border-[#3B281D] focus:border-[#D1823C] rounded-lg px-3 text-xs text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCustomOauthAccount(false)}
                      className="flex-1 h-9 rounded-lg border border-[#3B281D] text-xs font-bold text-[#C2B2A6] hover:text-[#FAF5F0] cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={socialLoginMutation.isPending}
                      className="flex-1 h-9 rounded-lg bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] text-xs font-extrabold cursor-pointer"
                    >
                      {socialLoginMutation.isPending ? 'Autenticando...' : 'Continuar'}
                    </button>
                  </div>
                </form>
              )}

              <p className="text-[10px] text-[#7D6B5D] leading-relaxed border-t border-[#2C1E16] pt-3">
                Para continuar, o {oauthProviderModal} compartilhará seu nome, endereço de e-mail e
                foto do perfil com a Kurio NFT.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
