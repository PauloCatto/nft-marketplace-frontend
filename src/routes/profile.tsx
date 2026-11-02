import { useEffect, useRef, useState } from 'react';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Link2,
  Sparkles,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'sonner';
import { apiClient, isAuthenticated, triggerRequireAuth } from '../api/client';
import type { User as UserType, Wallet } from '../api/contracts';
import { Header } from '../components/layout/Header';
import { ProfileSidebar } from '../components/layout/ProfileSidebar';

const profileSearchSchema = z.object({
  tab: z.enum(['details', 'wallets']).optional(),
});

export type ProfileSearchParams = Partial<z.infer<typeof profileSearchSchema>>;

export const Route = createFileRoute('/profile')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      triggerRequireAuth({
        message: 'Faça login na sua conta para acessar o Perfil do colecionador e Carteiras.',
        redirectTo: '/profile',
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

const PRESET_AVATARS = [
  {
    id: 'preset-1',
    name: 'Emerald Ape #042',
    collection: 'Kurio Genesis Club',
    url: '/assets/nfts/card-1.png',
  },
  {
    id: 'preset-2',
    name: 'Sage Nomad #009',
    collection: 'Nomad Sanctuary',
    url: '/assets/nfts/card-2.png',
  },
  {
    id: 'preset-3',
    name: 'Neon Vessel #552',
    collection: 'Cyber Primate',
    url: '/assets/nfts/card-3.png',
  },
  {
    id: 'preset-4',
    name: 'Cosmic Bloom #118',
    collection: 'Nomad Sanctuary',
    url: '/assets/nfts/card-4.png',
  },
  {
    id: 'preset-5',
    name: 'Violet Nomad #314',
    collection: 'Nomad Sanctuary',
    url: '/assets/nfts/card-5.png',
  },
  {
    id: 'preset-6',
    name: 'Ivory Baron #088',
    collection: 'Kurio Sovereign',
    url: '/assets/nfts/card-6.png',
  },
  {
    id: 'preset-7',
    name: 'Golden Beat #207',
    collection: 'Sonic Apes',
    url: '/assets/nfts/card-7.png',
  },
  {
    id: 'preset-8',
    name: 'Solaris Pulse #401',
    collection: 'Sonic Apes',
    url: '/assets/nfts/card-8.png',
  },
] as const;

function CollectorProfilePage() {
  const queryClient = useQueryClient();
  const { tab: urlTab } = Route.useSearch();

  const activeTab = urlTab || 'details';

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [ensPrefix, setEnsPrefix] = useState('.eth');
  const [ensName, setEnsName] = useState('');
  const [walletNickname, setWalletNickname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarPickerTab, setAvatarPickerTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [pendingAvatarUrl, setPendingAvatarUrl] = useState<string>('');
  const [customAvatarUrlInput, setCustomAvatarUrlInput] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasInitializedProfile = useRef(false);
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
    if (profileData && !hasInitializedProfile.current) {
      hasInitializedProfile.current = true;
      setDisplayName(profileData.name || '');
      setUsername(profileData.name.toLowerCase().replace(/\s+/g, '.') || '');
      setEmail(profileData.email || '');
      setAvatarUrl(profileData.avatarUrl || '');
      setWDisplayName(profileData.name || '');
      setWEmail(profileData.email || '');
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
        avatarUrl,
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

  const handleAddSecondaryWallet = async () => {
    const nextAddr =
      wSecondaryAddress.trim() ||
      (sameAsPrimary && wAddress.trim()
        ? wAddress.trim()
        : '0x99A4897c1123456789ABCDEF0123456789E82C');
    const nextNet = (wNetwork || 'Ethereum') as 'Ethereum' | 'Polygon' | 'Solana';
    const nextLabel = wNickname.trim() ? `${wNickname.trim()} #2` : 'Carteira Secundária';

    try {
      const res = await apiClient.post<Wallet>('/wallets', {
        address: nextAddr,
        label: nextLabel,
        network: nextNet,
        isPrimary: false,
      });
      setSecondaryWallets((prev) => [
        ...prev,
        {
          id: res.data.id,
          label: res.data.label,
          address: res.data.address,
          network: res.data.network,
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast.success('Carteira secundária salva com sucesso!');
    } catch {
      setSecondaryWallets((prev) => [
        ...prev,
        {
          id: `sec-${Date.now()}`,
          label: nextLabel,
          address: nextAddr,
          network: nextNet,
        },
      ]);
      toast.success('Carteira secundária adicionada!');
    }
  };

  const openAvatarModal = () => {
    setPendingAvatarUrl(avatarUrl || '/assets/nfts/card-1.png');
    setCustomAvatarUrlInput(
      avatarUrl && !avatarUrl.startsWith('data:') ? avatarUrl : ''
    );
    setUploadedFileName('');
    setAvatarPickerTab('presets');
    setIsAvatarModalOpen(true);
  };

  const handleFileUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem válido (PNG, JPG, WEBP ou GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingAvatarUrl(reader.result);
        setUploadedFileName(file.name);
        toast.success(`Imagem "${file.name}" carregada para pré-visualização!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateIdenticon = () => {
    const seed = `${username || displayName || 'kurio'}-${Date.now().toString().slice(-4)}`;
    const generatedUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
    setCustomAvatarUrlInput(generatedUrl);
    setPendingAvatarUrl(generatedUrl);
    toast.info('Novo Identicon Web3 gerado!');
  };

  const handleConfirmAvatarSelection = async (nextUrl: string) => {
    setAvatarUrl(nextUrl);
    setIsAvatarModalOpen(false);
    try {
      const updatedName = displayName.trim() || profileData?.name || 'Kurio Collector';
      const res = await apiClient.put<UserType>('/profile', {
        name: updatedName,
        avatarUrl: nextUrl,
      });
      queryClient.setQueryData(['profile'], res.data);
      queryClient.setQueryData(['auth', 'me'], { user: res.data });
      toast.success(nextUrl ? 'Foto de perfil atualizada!' : 'Foto de perfil removida.');
    } catch {
      toast.success(nextUrl ? 'Foto selecionada!' : 'Foto removida.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-16 flex flex-col">
        <Header />

        <div className="w-full mt-7 flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          <ProfileSidebar activeSection={activeTab} />

          <main className="flex-1 w-full max-w-[660px]">
            {activeTab === 'details' ? (
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
                      <button
                        type="button"
                        onClick={openAvatarModal}
                        title="Clique para escolher sua foto de perfil"
                        className="group relative w-9 h-9 rounded-full bg-[#2B1B12] border border-[#3D271B] hover:border-[#D1823C] flex items-center justify-center overflow-hidden shrink-0 transition-colors cursor-pointer"
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="Avatar do colecionador"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-[#D1823C]" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={openAvatarModal}
                        className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-[4px] transition-colors cursor-pointer"
                      >
                        Alterar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmAvatarSelection('')}
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

      {isAvatarModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escolher foto de perfil"
          onClick={() => setIsAvatarModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[540px] bg-[#1D130E] border border-[#3B2619] rounded-[12px] shadow-[0_24px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col"
          >
            <div className="px-6 pt-5 pb-4 border-b border-[#2E1E15] flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[#FAF5F0] font-extrabold text-sm">
                  Escolher foto de perfil
                </h3>
                <p className="text-[#9E8C7E] text-[11px] mt-0.5">
                  Selecione um NFT da coleção Kurio, envie uma imagem do seu dispositivo ou use um Identicon Web3.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar seletor de avatar"
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 rounded-lg text-[#9E8C7E] hover:text-[#D1823C] hover:bg-[#2B1B12] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-4 bg-[#170F0B] border-b border-[#2E1E15] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-full bg-[#2B1B12] border-2 border-[#D1823C] flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                  {pendingAvatarUrl ? (
                    <img
                      src={pendingAvatarUrl}
                      alt="Pré-visualização do avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-[#D1823C]" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-[#D1823C]">
                    Pré-visualização
                  </span>
                  <p className="text-xs font-bold text-[#FAF5F0] truncate">
                    {displayName || profileData?.name || 'Colecionador Kurio'}
                  </p>
                  <p className="text-[11px] text-[#9E8C7E] truncate">
                    {PRESET_AVATARS.find((p) => p.url === pendingAvatarUrl)?.name ||
                      (uploadedFileName
                        ? `Arquivo: ${uploadedFileName}`
                        : pendingAvatarUrl
                          ? 'Imagem personalizada'
                          : 'Sem foto definida')}
                  </p>
                </div>
              </div>

              {pendingAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setPendingAvatarUrl('')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#3B2619] hover:border-red-500/50 text-[11px] text-[#C2B2A6] hover:text-red-300 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            <div className="px-6 pt-3 border-b border-[#2E1E15] flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAvatarPickerTab('presets')}
                className={`px-3.5 py-2 text-[11px] font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  avatarPickerTab === 'presets'
                    ? 'border-[#D1823C] text-[#D1823C]'
                    : 'border-transparent text-[#9E8C7E] hover:text-[#FAF5F0]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Galeria Kurio NFTs</span>
              </button>

              <button
                type="button"
                onClick={() => setAvatarPickerTab('upload')}
                className={`px-3.5 py-2 text-[11px] font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  avatarPickerTab === 'upload'
                    ? 'border-[#D1823C] text-[#D1823C]'
                    : 'border-transparent text-[#9E8C7E] hover:text-[#FAF5F0]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Enviar do dispositivo</span>
              </button>

              <button
                type="button"
                onClick={() => setAvatarPickerTab('url')}
                className={`px-3.5 py-2 text-[11px] font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  avatarPickerTab === 'url'
                    ? 'border-[#D1823C] text-[#D1823C]'
                    : 'border-transparent text-[#9E8C7E] hover:text-[#FAF5F0]'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>URL / Identicon Web3</span>
              </button>
            </div>

            <div className="p-6 max-h-[310px] overflow-y-auto">
              {avatarPickerTab === 'presets' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = pendingAvatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setPendingAvatarUrl(preset.url)}
                        className={`group relative rounded-[8px] p-2 border text-left transition-all flex flex-col items-center cursor-pointer ${
                          isSelected
                            ? 'bg-[#2B1B12] border-[#D1823C] ring-1 ring-[#D1823C]'
                            : 'bg-[#140D0A] border-[#2C1E16] hover:border-[#D1823C]/60'
                        }`}
                      >
                        <div className="relative w-16 h-16 rounded-full overflow-hidden border border-[#3B2619] mb-2">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Check className="w-5 h-5 text-[#D1823C] stroke-[2.5]" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] font-bold text-[#FAF5F0] text-center line-clamp-1">
                          {preset.name}
                        </span>
                        <span className="text-[9.5px] text-[#8C7A6B] text-center line-clamp-1">
                          {preset.collection}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {avatarPickerTab === 'upload' && (
                <div className="flex flex-col items-center justify-center py-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleFileUploadChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#3B2619] hover:border-[#D1823C] bg-[#140D0A] hover:bg-[#1B110C] rounded-[10px] p-7 flex flex-col items-center justify-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-[#2B1B12] border border-[#3D271B] flex items-center justify-center text-[#D1823C]">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-[#FAF5F0]">
                        Clique para selecionar uma imagem do seu dispositivo
                      </p>
                      <p className="text-[10.5px] text-[#8C7A6B] mt-1">
                        Suporta PNG, JPG, WEBP ou GIF (máx. 5 MB)
                      </p>
                    </div>
                    {uploadedFileName && (
                      <span className="mt-1 px-2.5 py-1 rounded bg-[#D1823C]/15 text-[#D1823C] text-[10.5px] font-semibold">
                        Selecionado: {uploadedFileName}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {avatarPickerTab === 'url' && (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="custom-avatar-url-input"
                      className="text-[11px] font-semibold text-[#FAF5F0]"
                    >
                      URL da imagem ou avatar IPFS/HTTPS
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="custom-avatar-url-input"
                        type="url"
                        value={customAvatarUrlInput}
                        onChange={(e) => setCustomAvatarUrlInput(e.target.value)}
                        placeholder="https://exemplo.com/meu-avatar.png"
                        className="flex-1 h-9 bg-[#140D0A] border border-[#2C1E16] focus:border-[#D1823C] rounded-[4px] px-3 text-xs text-[#FAF5F0] placeholder-[#7D6B5D] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customAvatarUrlInput.trim()) {
                            toast.error('Informe uma URL válida para carregar a imagem.');
                            return;
                          }
                          setPendingAvatarUrl(customAvatarUrlInput.trim());
                          toast.success('URL aplicada na pré-visualização!');
                        }}
                        className="h-9 px-4 rounded-[4px] bg-[#2B1B12] hover:bg-[#3B2619] border border-[#D1823C]/40 text-[#D1823C] text-[11px] font-bold transition-colors shrink-0 cursor-pointer"
                      >
                        Carregar
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-[#140D0A] border border-[#2C1E16] p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-[#FAF5F0]">
                        Identicon Web3 Algorítmico
                      </p>
                      <p className="text-[10.5px] text-[#8C7A6B] mt-0.5">
                        Gere um avatar geométrico exclusivo baseado na sua identidade de colecionador.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateIdenticon}
                      className="px-3.5 py-2 rounded-[6px] bg-[#2B1B12] hover:bg-[#3B2619] border border-[#D1823C]/40 text-[#D1823C] text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gerar Identicon</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-[#170F0B] border-t border-[#2E1E15] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 rounded-[4px] border border-[#3B2619] text-[#C2B2A6] hover:text-[#FAF5F0] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAvatarSelection(pendingAvatarUrl)}
                className="px-5 py-2 rounded-[4px] bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-extrabold text-[11px] transition-colors cursor-pointer"
              >
                Confirmar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
