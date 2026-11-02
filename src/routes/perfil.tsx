import { useEffect, useState } from 'react';
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  User,
  MapPin,
  ShoppingCart,
  Heart,
  TrendingUp,
  Download,
  AlertTriangle,
  LogOut,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiClient, AUTH_TOKEN_KEY, isAuthenticated, triggerRequireAuth } from '../api/client';
import type { User as UserType, Wallet } from '../api/contracts';
import { Header } from '../components/layout/Header';

const profileSearchSchema = z.object({
  tab: z.enum(['dados', 'carteiras']).optional(),
});

export type ProfileSearchParams = Partial<z.infer<typeof profileSearchSchema>>;

export const Route = createFileRoute('/perfil')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      triggerRequireAuth({
        message: 'Faça login na sua conta para acessar o Perfil do colecionador e Carteiras.',
        redirectTo: '/perfil',
      });
      throw redirect({ to: '/' });
    }
  },
  validateSearch: (search: Record<string, unknown>): ProfileSearchParams => {
    const parsed = profileSearchSchema.safeParse(search);
    if (parsed.success) {
      return parsed.data;
    }
    return {};
  },
  component: CollectorProfilePage,
});

const SIDEBAR_ITEMS = [
  { id: 'dados', label: 'Dados do perfil', icon: User, isSupported: true },
  { id: 'carteiras', label: 'Carteiras', icon: MapPin, isSupported: true },
  { id: 'atividade', label: 'Atividade', icon: ShoppingCart, isSupported: false },
  { id: 'lista-interesse', label: 'Lista de interesse', icon: Heart, isSupported: false },
  { id: 'ofertas', label: 'Ofertas', icon: TrendingUp, isSupported: false },
  { id: 'arquivos', label: 'Arquivos baixados', icon: Download, isSupported: false },
  { id: 'suporte', label: 'Suporte', icon: AlertTriangle, isSupported: false },
] as const;

function CollectorProfilePage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const { tab: urlTab } = Route.useSearch();

  const activeTab = urlTab || 'dados';

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [ensPrefix, setEnsPrefix] = useState('.eth');
  const [ensName, setEnsName] = useState('');
  const [walletNickname, setWalletNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [profileFormError, setProfileFormError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [wDisplayName, setWDisplayName] = useState('');
  const [wNickname, setWNickname] = useState('');
  const [wNetwork, setWNetwork] = useState<'Ethereum' | 'Polygon' | 'Solana' | ''>('');
  const [wProfileName, setWProfileName] = useState('');
  const [wAddress, setWAddress] = useState('');
  const [wSecondaryAddress, setWSecondaryAddress] = useState('');
  const [wType, setWType] = useState('');
  const [wReferral, setWReferral] = useState('');
  const [wEmail, setWEmail] = useState('');
  const [wEnsPrefix, setWEnsPrefix] = useState('.eth');
  const [wEnsName, setWEnsName] = useState('');
  const [sameAsPrimary, setSameAsPrimary] = useState(false);
  const [walletFormError, setWalletFormError] = useState<string | null>(null);
  const [secondaryWallets, setSecondaryWallets] = useState<
    Array<{ id: string; label: string; address: string; network: string }>
  >([]);

  const { data: profileData } = useQuery<UserType>({
    queryKey: ['profile'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<UserType>('/profile', { signal });
      return res.data;
    },
    retry: false,
  });

  const { data: walletsData } = useQuery<{ items: Wallet[] }>({
    queryKey: ['wallets'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<{ items: Wallet[] }>('/wallets', { signal });
      return res.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (profileData) {
      setDisplayName((prev) => prev || profileData.name || '');
      setUsername((prev) => prev || profileData.name.toLowerCase().replace(/\s+/g, '.') || '');
      setEmail((prev) => prev || profileData.email || '');
      setAvatarUrl((prev) => prev || profileData.avatarUrl || '');
      setWDisplayName((prev) => prev || profileData.name || '');
      setWEmail((prev) => prev || profileData.email || '');
    }
  }, [profileData]);

  useEffect(() => {
    if (walletsData?.items && walletsData.items.length > 0) {
      const primary = walletsData.items.find((w) => w.isPrimary) || walletsData.items[0];
      if (primary) {
        setWalletNickname((prev) => prev || primary.label || '');
        setWNickname((prev) => prev || primary.label || '');
        setWAddress((prev) => prev || primary.address || '');
        setWNetwork((prev) => prev || primary.network || 'Ethereum');
      }
      const secondaries = walletsData.items.filter((w) => !w.isPrimary);
      if (secondaries.length > 0) {
        setSecondaryWallets(
          secondaries.map((sw) => ({
            id: sw.id,
            label: sw.label,
            address: sw.address,
            network: sw.network,
          }))
        );
      }
    }
  }, [walletsData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const updatedName = displayName.trim() || username.trim() || 'Kurio Collector';
      const profileRes = await apiClient.put<UserType>('/profile', {
        name: updatedName,
        bio: ensName ? `${ensName}${ensPrefix}` : undefined,
        avatarUrl: avatarUrl || undefined,
      });

      if (currentPassword || newPassword) {
        await apiClient.put('/profile/password', {
          currentPassword,
          newPassword,
        });
      }

      return profileRes.data;
    },
    onSuccess: (updatedUser) => {
      setProfileFormError(null);
      queryClient.setQueryData(['profile'], updatedUser);
      queryClient.setQueryData(['auth', 'me'], { user: updatedUser });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      toast.success('Dados do perfil salvos com sucesso!');
    },
    onError: () => {
      setProfileFormError('Não foi possível salvar. Verifique os dados ou sua senha atual.');
      toast.error('Verifique os dados informados ou sua senha atual.');
    },
  });

  const saveWalletMutation = useMutation({
    mutationFn: async () => {
      const addressToSave =
        wAddress.trim() || '0x71C498b8A90123456789ABCDEF0123456789498b';
      const labelToSave = wNickname.trim() || wDisplayName.trim() || 'Carteira Principal';
      const networkToSave = (wNetwork || 'Ethereum') as 'Ethereum' | 'Polygon' | 'Solana';

      const res = await apiClient.post<Wallet>('/wallets', {
        address: addressToSave,
        label: labelToSave,
        network: networkToSave,
        isPrimary: true,
      });
      return res.data;
    },
    onSuccess: () => {
      setWalletFormError(null);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Carteira principal salva com sucesso!');
    },
    onError: () => {
      setWalletFormError('Endereço da carteira inválido. Use um endereço hexadecimal 0x...');
      toast.error('Não foi possível salvar a carteira.');
    },
  });

  const handleSaveProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFormError(null);

    if (!displayName.trim() || !username.trim() || !email.trim()) {
      setProfileFormError('Preencha Nome de exibição, Nome de usuário e E-mail.');
      return;
    }

    if (newPassword || confirmNewPassword || currentPassword) {
      if (!currentPassword) {
        setProfileFormError('Informe sua senha atual para alterar a senha.');
        return;
      }
      if (newPassword.length < 6) {
        setProfileFormError('A nova senha deve ter pelo menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setProfileFormError('A confirmação da nova senha não coincide.');
        return;
      }
    }

    saveProfileMutation.mutate();
  };

  const handleSaveWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWalletFormError(null);

    if (!wDisplayName.trim() || !wNickname.trim() || !wAddress.trim()) {
      setWalletFormError('Preencha Nome de exibição, Apelido e Endereço 0x da carteira.');
      return;
    }

    if (!wAddress.trim().startsWith('0x') || wAddress.trim().length < 10) {
      setWalletFormError('Informe um endereço de carteira válido iniciado por 0x.');
      return;
    }

    saveWalletMutation.mutate();
  };

  const handleAddSecondaryWallet = () => {
    const nextAddr =
      wSecondaryAddress.trim() ||
      (sameAsPrimary && wAddress.trim()
        ? wAddress.trim()
        : '0x99A4...E82C (Carteira Secundária)');
    const nextNet = wNetwork || 'Ethereum';
    setSecondaryWallets((prev) => [
      ...prev,
      {
        id: `sec-${Date.now()}`,
        label: wNickname.trim() ? `${wNickname.trim()} #2` : 'Carteira Secundária',
        address: nextAddr,
        network: nextNet,
      },
    ]);
    toast.success('Carteira secundária adicionada!');
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch { }
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    queryClient.setQueryData(['auth', 'me'], null);
    queryClient.removeQueries({ queryKey: ['profile'] });
    queryClient.removeQueries({ queryKey: ['wallets'] });
    queryClient.removeQueries({ queryKey: ['favorites'] });
    queryClient.invalidateQueries({ queryKey: ['cart'] });
    toast.info('Você saiu da sua conta.');
    navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-16 flex flex-col">
        <Header />

        <div className="w-full mt-7 flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          <aside
            aria-label="Menu do perfil"
            className="w-full lg:w-[235px] shrink-0 bg-[#1D130E] rounded-[4px] overflow-hidden flex flex-col"
          >
            <div className="px-4 pt-4 pb-2.5">
              <h1 className="text-[#FAF5F0] font-bold text-xs">Meu perfil</h1>
            </div>

            <nav className="flex flex-col pb-2">
              {SIDEBAR_ITEMS.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;

                if (!item.isSupported) {
                  return (
                    <div
                      key={item.id}
                      className="relative w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-[11px] text-[#C2B2A6] select-none"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-[#D1823C] shrink-0" />
                      <span>{item.label}</span>
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate({
                        search: { tab: item.id as 'dados' | 'carteiras' },
                      });
                    }}
                    className={`relative w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-[11px] transition-colors cursor-pointer ${isActive
                        ? 'text-[#D1823C] font-semibold bg-[#261811]'
                        : 'text-[#C2B2A6] hover:text-[#FAF5F0] hover:bg-[#24160F]/50'
                      }`}
                  >
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#D1823C]"
                      />
                    )}
                    <IconComponent className="w-3.5 h-3.5 text-[#D1823C] shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-[#2E1E15] px-4 py-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 text-left text-[11px] font-bold text-[#D1823C] hover:text-[#E0924B] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#D1823C] shrink-0" />
                <span>Sair</span>
              </button>
            </div>
          </aside>

          <main className="flex-1 w-full max-w-[660px]">
            {activeTab === 'dados' ? (
              <form onSubmit={handleSaveProfileSubmit} className="flex flex-col">
                <h2 className="text-[#FAF5F0] font-bold text-xs mb-5">
                  Perfil do colecionador
                </h2>

                {profileFormError && (
                  <div
                    role="alert"
                    className="mb-4 rounded bg-red-500/15 border border-red-500/40 px-3 py-2 text-xs text-red-300"
                  >
                    {profileFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-display-name"
                      className="text-[#FAF5F0] text-[11px]"
                    >
                      Nome de exibição <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="profile-display-name"
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-username" className="text-[#FAF5F0] text-[11px]">
                      Nome de usuário <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="profile-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-email" className="text-[#FAF5F0] text-[11px]">
                      E-mail <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="profile-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-ens-name" className="text-[#FAF5F0] text-[11px]">
                      Nome ENS <span className="text-[#D1823C]">*</span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <select
                        aria-label="Sufixo ENS"
                        value={ensPrefix}
                        onChange={(e) => setEnsPrefix(e.target.value)}
                        className="w-[64px] h-9 shrink-0 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-2 text-[11px] text-[#FAF5F0] outline-none cursor-pointer"
                      >
                        <option value=".eth">.eth</option>
                        <option value=".sol">.sol</option>
                        <option value=".xyz">.xyz</option>
                      </select>
                      <input
                        id="profile-ens-name"
                        type="text"
                        value={ensName}
                        onChange={(e) => setEnsName(e.target.value)}
                        className="flex-1 min-w-0 h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-wallet-nickname"
                      className="text-[#FAF5F0] text-[11px]"
                    >
                      Apelido da carteira <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="profile-wallet-nickname"
                      type="text"
                      value={walletNickname}
                      onChange={(e) => setWalletNickname(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[#FAF5F0] text-[11px]">Avatar</span>
                    <div className="flex items-center gap-3.5 h-9">
                      <div className="w-9 h-9 rounded-full bg-[#2B1B12] border border-[#3D271B] flex items-center justify-center overflow-hidden shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar do colecionador"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-[#D1823C]" />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('/assets/nfts/emerald-ape.png');
                          toast.success('Avatar atualizado!');
                        }}
                        className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-[4px] transition-colors cursor-pointer"
                      >
                        Alterar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          toast.info('Avatar removido.');
                        }}
                        className="text-[#C2B2A6] hover:text-[#D1823C] text-[11px] transition-colors cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="text-[#FAF5F0] font-bold text-xs mb-4">Alterar senha</h3>

                <div className="w-full sm:w-[calc(50%-12px)] flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-current-password"
                      className="text-[#FAF5F0] text-[11px]"
                    >
                      Senha atual
                    </label>
                    <div className="relative">
                      <input
                        id="profile-current-password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] pl-3 pr-9 text-xs text-[#FAF5F0] outline-none"
                      />
                      <button
                        type="button"
                        aria-label={
                          showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'
                        }
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
                      >
                        {showCurrentPassword ? (
                          <Eye className="w-3.5 h-3.5 text-[#D1823C]" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[#D1823C]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-new-password" className="text-[#FAF5F0] text-[11px]">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="profile-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] pl-3 pr-9 text-xs text-[#FAF5F0] outline-none"
                      />
                      <button
                        type="button"
                        aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
                      >
                        {showNewPassword ? (
                          <Eye className="w-3.5 h-3.5 text-[#D1823C]" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[#D1823C]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="profile-confirm-password"
                      className="text-[#FAF5F0] text-[11px]"
                    >
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="profile-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] pl-3 pr-9 text-xs text-[#FAF5F0] outline-none"
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirmPassword
                            ? 'Ocultar confirmação de senha'
                            : 'Mostrar confirmação de senha'
                        }
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? (
                          <Eye className="w-3.5 h-3.5 text-[#D1823C]" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[#D1823C]" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <button
                      type="submit"
                      disabled={saveProfileMutation.isPending}
                      className="bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-50 text-[#140D0A] font-bold text-[11px] px-7 py-2 rounded-[4px] transition-colors cursor-pointer"
                    >
                      {saveProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveWalletSubmit} className="flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-[#FAF5F0] font-bold text-xs">Carteira principal</h2>
                    <p className="text-[#9E8C7E] text-[10.5px] mt-1">
                      Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setWDisplayName('');
                      setWNickname('');
                      setWAddress('');
                      toast.info('Preencha os dados abaixo para adicionar uma nova carteira.');
                    }}
                    className="text-[#D1823C] hover:underline font-bold text-xs shrink-0 cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {walletFormError && (
                  <div
                    role="alert"
                    className="mb-4 rounded bg-red-500/15 border border-red-500/40 px-3 py-2 text-xs text-red-300"
                  >
                    {walletFormError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-display-name" className="text-[#FAF5F0] text-[11px]">
                      Nome de exibição <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="wallet-display-name"
                      type="text"
                      value={wDisplayName}
                      onChange={(e) => setWDisplayName(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-nickname" className="text-[#FAF5F0] text-[11px]">
                      Apelido da carteira <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="wallet-nickname"
                      type="text"
                      value={wNickname}
                      onChange={(e) => setWNickname(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-network" className="text-[#FAF5F0] text-[11px]">
                      Rede <span className="text-[#D1823C]">*</span>
                    </label>
                    <select
                      id="wallet-network"
                      value={wNetwork}
                      onChange={(e) =>
                        setWNetwork(e.target.value as 'Ethereum' | 'Polygon' | 'Solana' | '')
                      }
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-[11px] text-[#8C7A6B] outline-none cursor-pointer"
                    >
                      <option value="">Selecione uma rede</option>
                      <option value="Ethereum">Ethereum</option>
                      <option value="Polygon">Polygon</option>
                      <option value="Solana">Solana</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-profile-name" className="text-[#FAF5F0] text-[11px]">
                      Nome do perfil <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="wallet-profile-name"
                      type="text"
                      value={wProfileName}
                      onChange={(e) => setWProfileName(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-address" className="text-[#FAF5F0] text-[11px]">
                      Endereço da carteira <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="wallet-address"
                      type="text"
                      value={wAddress}
                      onChange={(e) => setWAddress(e.target.value)}
                      placeholder="Endereço 0x da carteira"
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-[11px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-secondary-address" className="sr-only">
                      ENS ou carteira secundária (opcional)
                    </label>
                    <input
                      id="wallet-secondary-address"
                      type="text"
                      value={wSecondaryAddress}
                      onChange={(e) => setWSecondaryAddress(e.target.value)}
                      placeholder="ENS ou carteira secundária (opcional)"
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-[10.5px] text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-type" className="text-[#FAF5F0] text-[11px]">
                      Tipo de carteira <span className="text-[#D1823C]">*</span>
                    </label>
                    <select
                      id="wallet-type"
                      value={wType}
                      onChange={(e) => setWType(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-[11px] text-[#8C7A6B] outline-none cursor-pointer"
                    >
                      <option value="">Selecione uma carteira</option>
                      <option value="MetaMask">MetaMask</option>
                      <option value="Coinbase Wallet">Coinbase Wallet</option>
                      <option value="WalletConnect">WalletConnect</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-referral" className="text-[#FAF5F0] text-[11px]">
                      Código de indicação <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="wallet-referral"
                      type="text"
                      value={wReferral}
                      onChange={(e) => setWReferral(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-email" className="text-[#FAF5F0] text-[11px]">
                      E-mail <span className="text-[#D1823C]">*</span>
                    </label>
                    <input
                      id="wallet-email"
                      type="email"
                      value={wEmail}
                      onChange={(e) => setWEmail(e.target.value)}
                      className="w-full h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="wallet-ens-name" className="text-[#FAF5F0] text-[11px]">
                      Nome ENS <span className="text-[#D1823C]">*</span>
                    </label>
                    <div className="flex items-center gap-2.5">
                      <select
                        aria-label="Sufixo ENS da carteira"
                        value={wEnsPrefix}
                        onChange={(e) => setWEnsPrefix(e.target.value)}
                        className="w-[64px] h-9 shrink-0 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-2 text-[11px] text-[#FAF5F0] outline-none cursor-pointer"
                      >
                        <option value=".eth">.eth</option>
                        <option value=".sol">.sol</option>
                        <option value=".xyz">.xyz</option>
                      </select>
                      <input
                        id="wallet-ens-name"
                        type="text"
                        value={wEnsName}
                        onChange={(e) => setWEnsName(e.target.value)}
                        className="flex-1 min-w-0 h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[3px] px-3 text-xs text-[#FAF5F0] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={saveWalletMutation.isPending}
                    className="bg-[#D1823C] hover:bg-[#E0924B] disabled:opacity-50 text-[#140D0A] font-bold text-[11px] px-4 py-2 rounded-[4px] transition-colors cursor-pointer"
                  >
                    {saveWalletMutation.isPending ? 'Salvando...' : 'Salvar carteira'}
                  </button>
                </div>

                <div className="mt-7 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[#FAF5F0] font-bold text-xs">Carteira secundária</h3>
                    {secondaryWallets.length === 0 ? (
                      <p className="text-[#9E8C7E] text-[10.5px] mt-1.5">
                        Você ainda não adicionou uma carteira secundária.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {secondaryWallets.map((sw) => (
                          <li
                            key={sw.id}
                            className="text-[11px] text-[#C2B2A6] bg-[#1D130E] border border-[#2E1E15] rounded px-3 py-1.5 flex items-center gap-3"
                          >
                            <span className="font-bold text-[#FAF5F0]">{sw.label}</span>
                            <span className="text-[#8C7A6B] font-mono text-[10px]">
                              {sw.address}
                            </span>
                            <span className="text-[#D1823C] text-[10px]">({sw.network})</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={sameAsPrimary}
                      onClick={() => setSameAsPrimary((prev) => !prev)}
                      className="inline-flex items-center gap-2 text-[11px] text-[#C2B2A6] cursor-pointer"
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-[#D1823C] flex items-center justify-center shrink-0">
                        {sameAsPrimary && (
                          <span className="w-2 h-2 rounded-full bg-[#D1823C]" />
                        )}
                      </span>
                      <span>Igual à carteira principal</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddSecondaryWallet}
                      className="text-[#D1823C] hover:underline font-bold text-xs cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </form>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
