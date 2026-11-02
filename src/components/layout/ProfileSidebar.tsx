import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  User,
  MapPin,
  ShoppingCart,
  Heart,
  TrendingUp,
  Download,
  AlertTriangle,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, AUTH_TOKEN_KEY } from '../../api/client';

export type ProfileMenuSection =
  | 'details'
  | 'wallets'
  | 'activity'
  | 'wishlist'
  | 'offers'
  | 'downloads'
  | 'support';

interface ProfileSidebarProps {
  activeSection: ProfileMenuSection;
}

const SIDEBAR_ITEMS: Array<{
  id: ProfileMenuSection;
  label: string;
  icon: typeof User;
}> = [
  { id: 'details', label: 'Dados do perfil', icon: User },
  { id: 'wallets', label: 'Carteiras', icon: MapPin },
  { id: 'activity', label: 'Atividade', icon: ShoppingCart },
  { id: 'wishlist', label: 'Lista de interesse', icon: Heart },
  { id: 'offers', label: 'Ofertas', icon: TrendingUp },
  { id: 'downloads', label: 'Arquivos baixados', icon: Download },
  { id: 'support', label: 'Suporte', icon: AlertTriangle },
];

export function ProfileSidebar({ activeSection }: ProfileSidebarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNavigateSection = (sectionId: ProfileMenuSection) => {
    if (sectionId === 'details') {
      navigate({ to: '/profile', search: { tab: 'details' } });
      return;
    }
    if (sectionId === 'wallets') {
      navigate({ to: '/profile', search: { tab: 'wallets' } });
      return;
    }
    if (sectionId === 'activity') {
      navigate({ to: '/market' });
      return;
    }
    if (sectionId === 'wishlist') {
      navigate({ to: '/wishlist' });
      return;
    }
    if (sectionId === 'offers') {
      navigate({ to: '/offers' });
      return;
    }
    if (sectionId === 'downloads') {
      navigate({ to: '/downloads' });
      return;
    }
    if (sectionId === 'support') {
      navigate({ to: '/support' });
    }
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
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigateSection(item.id)}
              className={`relative w-full px-4 py-2.5 flex items-center gap-2.5 text-left text-[11px] transition-colors cursor-pointer ${
                isActive
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
  );
}
