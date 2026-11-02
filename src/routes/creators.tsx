import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export const Route = createFileRoute('/creators')({
  component: CreatorsPage,
});

interface TopCreator {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  coverUrl: string;
  collectionName: string;
  collectionId: string;
  bio: string;
  specialty: string;
  totalVolumeEth: string;
  itemsCount: number;
  collectors: number;
}

const TOP_CREATORS: TopCreator[] = [
  {
    id: 'creator-1',
    name: 'Helena Vance',
    handle: '@helenavance.eth',
    avatarUrl: '/assets/nfts/emerald-ape.png',
    coverUrl: '/assets/nfts/banner-left-ape.png',
    collectionName: 'Kurio Editions',
    collectionId: 'nft-1',
    bio: 'Pioneira em modelagem procedural 3D, arte digital e iluminação volumétrica esmeralda. Suas edições limitadas estão entre as mais disputadas da plataforma.',
    specialty: 'Arte digital',
    totalVolumeEth: '1.450',
    itemsCount: 50,
    collectors: 1280,
  },
  {
    id: 'creator-2',
    name: 'Marcus Silva',
    handle: '@nomadstudios',
    avatarUrl: '/assets/nfts/card-4.png',
    coverUrl: '/assets/nfts/sage-nomad-featured.png',
    collectionName: 'Santuário Nomad',
    collectionId: 'nft-2',
    bio: 'Artista conceitual que une estética orgânica tribal com alta costura virtual, criando personagens com identidade marcante.',
    specialty: 'Colecionáveis',
    totalVolumeEth: '980',
    itemsCount: 35,
    collectors: 940,
  },
  {
    id: 'creator-3',
    name: 'Arthur Pendelton',
    handle: '@baronsyndicate',
    avatarUrl: '/assets/nfts/ivory-baron.png',
    coverUrl: '/assets/nfts/banner-right-ape.png',
    collectionName: 'Baron Syndicate',
    collectionId: 'nft-3',
    bio: 'Esculturas tridimensionais clássicas com acabamento marfim, autoria verificada em blockchain e tiragem estritamente limitada.',
    specialty: 'Arte 3D',
    totalVolumeEth: '750',
    itemsCount: 20,
    collectors: 610,
  },
  {
    id: 'creator-4',
    name: 'Camila & Leo',
    handle: '@aurabeat',
    avatarUrl: '/assets/nfts/golden-beat.png',
    coverUrl: '/assets/nfts/golden-beat.png',
    collectionName: 'Aura Beat Wave',
    collectionId: 'nft-7',
    bio: 'Dupla que funde frequências sonoras analógicas com arte visual reativa, levando a música para o universo dos colecionáveis digitais.',
    specialty: 'Música',
    totalVolumeEth: '620',
    itemsCount: 40,
    collectors: 520,
  },
];

const PLATFORM_STATS = [
  { label: 'Criadores verificados', value: '120+' },
  { label: 'Volume negociado', value: '3.800 ETH' },
  { label: 'Colecionadores ativos', value: '3.350' },
];

function CreatorsPage() {
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <div className="min-h-screen bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-6 flex flex-col">
        <Header />

        <section aria-label="Apresentação dos criadores" className="w-full mt-10 mb-12 flex flex-col items-center text-center">
          <span className="text-[#D1823C] text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Mentes Criativas
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
            Criadores em Destaque
          </h1>
          <p className="text-[#A8968A] text-xs sm:text-[13px] max-w-xl mt-3 leading-relaxed">
            Conheça os artistas e estúdios responsáveis pelas coleções mais prestigiadas da Kurio.
            Cada criador é verificado e tem sua autoria registrada on-chain.
          </p>

          <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {PLATFORM_STATS.map((stat) => (
              <div key={stat.label} className="bg-[#1F1510] border border-[#2C1E16] rounded-xl py-4 px-3">
                <div className="text-[#D1823C] font-extrabold text-lg">{stat.value}</div>
                <div className="text-[#A8968A] text-[11px] mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Lista de criadores" className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {TOP_CREATORS.map((creator) => (
            <article
              key={creator.id}
              className="bg-[#1F1510] border border-[#2C1E16] rounded-2xl overflow-hidden flex flex-col hover:border-[#D1823C]/50 transition-colors"
            >
              <div className="relative h-32 w-full overflow-hidden bg-[#140D0A]">
                <img
                  src={creator.coverUrl}
                  alt={`Capa da coleção ${creator.collectionName}`}
                  loading="lazy"
                  className="w-full h-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1F1510] to-transparent" />
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/60 text-[#E8D7C8] text-[10px] font-semibold">
                  {creator.specialty}
                </span>
              </div>

              <div className="px-5 pb-5 -mt-8 relative flex flex-col flex-1">
                <div className="flex items-end gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#D1823C] bg-[#140D0A] shrink-0">
                    <img src={creator.avatarUrl} alt={creator.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 pb-1">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-bold text-sm truncate">{creator.name}</h2>
                      <CheckCircle2 className="w-4 h-4 text-[#D1823C] shrink-0" aria-label="Criador verificado" />
                    </div>
                    <span className="text-[#8C7A6B] text-[11px] block truncate">{creator.handle}</span>
                  </div>
                </div>

                <p className="text-[#B5A395] text-xs leading-relaxed mt-4">{creator.bio}</p>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-[#170E09] border border-[#241710] rounded-lg p-2.5 text-center">
                    <div className="text-[#D1823C] font-extrabold text-xs">{creator.totalVolumeEth} ETH</div>
                    <div className="text-[#8C7A6B] text-[10px] mt-0.5">Volume</div>
                  </div>
                  <div className="bg-[#170E09] border border-[#241710] rounded-lg p-2.5 text-center">
                    <div className="text-[#FAF5F0] font-extrabold text-xs">{creator.itemsCount}</div>
                    <div className="text-[#8C7A6B] text-[10px] mt-0.5">Obras</div>
                  </div>
                  <div className="bg-[#170E09] border border-[#241710] rounded-lg p-2.5 text-center">
                    <div className="text-[#FAF5F0] font-extrabold text-xs">{creator.collectors}</div>
                    <div className="text-[#8C7A6B] text-[10px] mt-0.5">Colecionadores</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-[#2C1E16]">
                  <div className="text-[11px] text-[#A8968A] min-w-0">
                    Coleção: <strong className="text-[#FAF5F0]">{creator.collectionName}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate({ to: '/market', search: { id: creator.collectionId } })}
                    className="shrink-0 bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-[11px] px-4 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    Ver coleção
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <Footer
          onSelectCategory={(category) =>
            navigate({
              to: '/',
              search: {
                search: '',
                category,
                network: 'All',
                tab: 'all',
                sort: 'newest',
                page: 1,
                limit: 9,
              },
            })
          }
        />
      </div>
    </div>
  );
}
