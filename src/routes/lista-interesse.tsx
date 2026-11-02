import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, isAuthenticated, triggerRequireAuth } from '../api/client';
import type { FavoritesResponse } from '../api/contracts';
import { Header } from '../components/layout/Header';
import { ProfileSidebar } from '../components/layout/ProfileSidebar';

export const Route = createFileRoute('/lista-interesse')({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      triggerRequireAuth({
        message: 'Faça login na sua conta para acessar sua Lista de interesse.',
        redirectTo: '/lista-interesse',
      });
      throw redirect({ to: '/' });
    }
  },
  component: WishlistPage,
});

function WishlistPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: favoritesData } = useQuery<FavoritesResponse>({
    queryKey: ['favorites'],
    queryFn: async ({ signal }) => {
      const res = await apiClient.get<FavoritesResponse>('/favorites', { signal });
      return res.data;
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({ nftId, isFav }: { nftId: string; isFav: boolean }) => {
      if (isFav) {
        const res = await apiClient.delete<{ success: boolean; nftIds: string[] }>(
          `/favorites/${nftId}`
        );
        return res.data;
      }
      const res = await apiClient.post<{ success: boolean; nftIds: string[] }>(
        `/favorites/${nftId}`
      );
      return res.data;
    },
    onMutate: async ({ nftId, isFav }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      const previousFavorites = queryClient.getQueryData<FavoritesResponse>(['favorites']);
      queryClient.setQueryData<FavoritesResponse>(['favorites'], (old) => {
        const prevIds = old?.nftIds || [];
        const prevItems = old?.items || [];
        if (isFav) {
          return {
            nftIds: prevIds.filter((id) => id !== nftId),
            items: prevItems.filter((item) => item.id !== nftId),
          };
        }
        return {
          nftIds: [...prevIds, nftId],
          items: prevItems,
        };
      });
      return { previousFavorites };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      toast.error('Falha ao atualizar favoritos. Estado anterior restaurado (Rollback).');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  return (
    <div className="min-h-screen w-full bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-16 flex flex-col">
        <Header />

        <div className="w-full mt-7 flex flex-col lg:flex-row items-start gap-8 lg:gap-10">
          <ProfileSidebar activeSection="lista-interesse" />

          <main className="flex-1 w-full max-w-[660px]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#2C1E16]">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 fill-[#D1823C] text-[#D1823C]" />
                  <h2 className="text-[#FAF5F0] font-bold text-sm">Meus Favoritos</h2>
                  <span className="text-[#D1823C] text-xs font-bold">
                    ({favoritesData?.items?.length || 0})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate({ to: '/' })}
                  className="text-[11px] text-[#C2B2A6] hover:text-[#D1823C] transition-colors cursor-pointer"
                >
                  Voltar ao catálogo
                </button>
              </div>

              {!favoritesData?.items || favoritesData.items.length === 0 ? (
                <div className="bg-[#1F1510] border border-[#2C1E16] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 my-4">
                  <Heart className="w-10 h-10 text-[#4D301D]" />
                  <p className="text-[#FAF5F0] font-bold text-xs">Nenhum NFT favoritado ainda</p>
                  <p className="text-[#A8968A] text-[11px] max-w-[260px]">
                    Navegue pelo catálogo e toque no ícone de coração para salvar seus NFTs favoritos aqui.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/' })}
                    className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-4 py-2 rounded-md transition-colors cursor-pointer mt-1"
                  >
                    Explorar catálogo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-start">
                  {favoritesData.items.map((favNft) => (
                    <article key={favNft.id} className="flex flex-col">
                      <div className="bg-[#23150E] rounded-[16px] p-2 relative">
                        <button
                          type="button"
                          aria-label={`Remover ${favNft.name} dos favoritos`}
                          onClick={(e) => {
                            e.stopPropagation();
                            favoriteMutation.mutate({
                              nftId: favNft.id,
                              isFav: true,
                            });
                          }}
                          className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-[#24160F]/90 border border-[#4A3222] flex items-center justify-center text-[#D1823C] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                        >
                          <Heart className="w-3.5 h-3.5 fill-[#D1823C] text-[#D1823C]" />
                        </button>

                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate({ to: '/mercado', search: { id: favNft.id } })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              navigate({ to: '/mercado', search: { id: favNft.id } });
                            }
                          }}
                          className="w-full aspect-[150/174] rounded-[12px] overflow-hidden cursor-pointer"
                        >
                          <img
                            src={favNft.imageUrl}
                            alt={favNft.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      <h3 className="text-[#FAF5F0] text-[12px] font-medium mt-2 truncate px-0.5">
                        {favNft.name}
                      </h3>
                      <span className="text-[#D1823C] font-extrabold text-[12px] mt-0.5 px-0.5">
                        {favNft.priceEth} ETH
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
