export const COLLECTION_FILTERS = [
  { name: 'Arte digital', count: 33 },
  { name: 'Fotografia', count: 12 },
  { name: 'Música', count: 65 },
  { name: 'Arte 3D', count: 39 },
  { name: 'Colecionáveis', count: 23 },
  { name: 'Generativo', count: 17 },
  { name: 'Jogos', count: 19 },
  { name: 'Assinaturas', count: 13 },
  { name: 'Utilidade', count: 18 },
];

export const NETWORK_FILTERS = [
  { name: 'Ethereum', count: 119 },
  { name: 'Polygon', count: 78 },
  { name: 'Solana', count: 86 },
];

export interface HeroSlide {
  id: string;
  subtitle: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  mobileMainImage: string;
  mobileOverlapImage: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'nft-1',
    subtitle: 'Bem-vindo à Kurio',
    titleLine1: 'SEJA DONO DO FUTURO',
    titleLine2: 'DA ARTE DIGITAL',
    description:
      'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.',
    imageUrl: '/assets/nfts/emerald-ape.png',
    imageAlt: 'Emerald Ape #042 — Macaco com óculos escuros redondos e jaqueta verde',
    mobileMainImage: '/assets/nfts/emerald-ape.png',
    mobileOverlapImage: '/assets/nfts/card-4.png',
  },
  {
    id: 'nft-2',
    subtitle: 'Coleção em Destaque',
    titleLine1: 'SANTUÁRIO NOMAD',
    titleLine2: 'EDIÇÃO GÊNESIS',
    description:
      'Obras digitais raras criadas com estética orgânica e benefícios exclusivos para colecionadores verificados na rede.',
    imageUrl: '/assets/nfts/sage-nomad-featured.png',
    imageAlt: 'Sage Nomad #009 — Macaco com chapéu bucket verde-oliva e moletom roxo',
    mobileMainImage: '/assets/nfts/sage-nomad-featured.png',
    mobileOverlapImage: '/assets/nfts/card-5.png',
  },
  {
    id: 'nft-3',
    subtitle: 'Curadoria Kurio',
    titleLine1: 'BARON SYNDICATE',
    titleLine2: 'ARTE 3D AUTORAL',
    description:
      'Retratos tridimensionais esculpidos com precisão, autenticidade verificada em blockchain e tiragem estritamente limitada.',
    imageUrl: '/assets/nfts/ivory-baron.png',
    imageAlt: 'Neon Vessel #552 — Macaco com blazer marfim e gola alta verde-escura',
    mobileMainImage: '/assets/nfts/ivory-baron.png',
    mobileOverlapImage: '/assets/nfts/card-6.png',
  },
];

export interface EditorialPost {
  id: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  author: {
    name: string;
    role: string;
  };
  content: {
    heading: string;
    text: string;
  }[];
}

export const EDITORIAL_POSTS: EditorialPost[] = [
  {
    id: 'post-1',
    date: '12 de setembro',
    readTime: 'Leitura de 4 min',
    title: 'Como funciona a propriedade de NFTs',
    category: 'Fundamentos',
    excerpt: 'Aprenda a autenticar, negociar e custodiar ativos digitais com segurança.',
    imageUrl: '/assets/nfts/ivory-baron.png',
    author: {
      name: 'Equipe de Curadoria Kurio',
      role: 'Pesquisa Web3 & Tokenomics',
    },
    content: [
      {
        heading: 'O que representa o token não fungível',
        text: 'Diferente de ativos fungíveis como Bitcoin ou moedas fiduciárias, cada NFT possui um identificador único registrado em contratos inteligentes invioláveis. Na Kurio, cada obra contém metadados imutáveis e registro transparente de procedência.',
      },
      {
        heading: 'Custódia própria e certificados de autenticidade',
        text: 'Ao adquirir uma obra, sua carteira se torna o custodiante oficial. Você possui a prerrogativa de exibir em galerias virtuais, negociar no mercado secundário e ter acesso a utilidades exclusivas liberadas pelo criador.',
      },
      {
        heading: 'Boas práticas para novos colecionadores',
        text: 'Sempre confirme o endereço do contrato inteligente antes de interações de alto valor. Nunca compartilhe sua seed phrase e utilize carteiras distintas para navegação diária e cofre de longo prazo.',
      },
    ],
  },
  {
    id: 'post-2',
    date: '15 de setembro',
    readTime: 'Leitura de 3 min',
    title: '10 artistas digitais para acompanhar',
    category: 'Curadoria',
    excerpt: 'Conheça criadores que moldam a estética e cultura visual contemporânea.',
    imageUrl: '/assets/nfts/emerald-ape.png',
    author: {
      name: 'Maya Lin & Colecionadores',
      role: 'Artes Visuais & Design Generativo',
    },
    content: [
      {
        heading: 'A nova vanguarda da arte descentralizada',
        text: 'Artistas contemporâneos combinam modelagem 3D, algoritmos generativos e narrativas ficcionais para criar mundos colecionáveis com identidades visuais marcantes.',
      },
      {
        heading: 'Comunidades em torno de coleções autoriais',
        text: 'Coleções como Nomad Sanctuary e Baron Syndicate provam que o valor de uma obra vai além do visual: engloba encontros virtuais, direitos de derivação artística e participação em drops futuros.',
      },
    ],
  },
  {
    id: 'post-3',
    date: '18 de setembro',
    readTime: 'Leitura de 5 min',
    title: 'Raridade, atributos e procedência',
    category: 'Análise de Mercado',
    excerpt: 'Entenda camadas de raridade, procedência on-chain e como avaliar peças.',
    imageUrl: '/assets/nfts/sage-nomad-featured.png',
    author: {
      name: 'Vortex Studios',
      role: 'Análise Quantitativa & Smart Contracts',
    },
    content: [
      {
        heading: 'A pirâmide de atributos em coleções',
        text: 'Peças com trajes raros, paletas de cores únicas ou características de tiragem estrita (1/10 ou 1/1) costumam apresentar maior resiliência em ciclos de mercado devido à escassez programada.',
      },
      {
        heading: 'Rastreabilidade histórica',
        text: 'O histórico de transações permite verificar quantas mãos a obra percorreu desde a cunhagem original, afastando fraudes e garantindo o pagamento de royalties justos aos criadores.',
      },
    ],
  },
  {
    id: 'post-4',
    date: '22 de setembro',
    readTime: 'Leitura de 4 min',
    title: 'Como proteger sua carteira',
    category: 'Segurança',
    excerpt: 'Proteja sua carteira, seed phrase e ativos contra armadilhas e phishing.',
    imageUrl: '/assets/nfts/golden-beat.png',
    author: {
      name: 'Alex Kurio',
      role: 'Segurança da Informação Web3',
    },
    content: [
      {
        heading: 'Os três pilares da soberania digital',
        text: 'Nenhuma equipe de suporte legítima solicitará suas 12 ou 24 palavras de recuperação. Mantenha cópias físicas off-line e jamais salve arquivos de texto com credenciais na nuvem.',
      },
      {
        heading: 'Revisão constante de permissões',
        text: 'Revogue permissões de contratos de cunhagem antigos periodicamente e utilize autenticação em dois fatores em serviços centralizados correlatos.',
      },
    ],
  },
];
