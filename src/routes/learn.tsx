import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Award, ChevronDown, Coins, FileCode2, ShieldCheck, Wallet } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export const Route = createFileRoute('/learn')({
  component: LearnPage,
});

const LEARN_TOPICS = [
  {
    id: 'learn-1',
    icon: Award,
    badge: 'Conceito fundamental',
    title: 'O que é um NFT?',
    description:
      'Um Token Não Fungível (NFT) é um ativo digital único registrado em uma blockchain. Diferente de criptomoedas como o Bitcoin, em que cada unidade é idêntica a outra, cada NFT possui metadados exclusivos que garantem autenticidade e escassez comprovada.',
  },
  {
    id: 'learn-2',
    icon: FileCode2,
    badge: 'Tecnologia on-chain',
    title: 'Cunhagem e contratos inteligentes',
    description:
      'Cunhar (mint) um NFT significa publicar a obra em uma rede descentralizada. O contrato inteligente, geralmente no padrão ERC-721, define propriedades imutáveis e pode garantir royalties automáticos ao artista a cada revenda.',
  },
  {
    id: 'learn-3',
    icon: Wallet,
    badge: 'Custódia própria',
    title: 'Carteiras digitais',
    description:
      'Seus NFTs ficam associados ao endereço público da sua carteira. Você tem posse direta do ativo, sem intermediários, e pode transferi-lo ou vendê-lo quando quiser.',
  },
  {
    id: 'learn-4',
    icon: Coins,
    badge: 'Negociação',
    title: 'Mercado secundário e valor',
    description:
      'Colecionadores compram, vendem e transferem NFTs livremente. O valor é definido pela comunidade, pela raridade dos traços, pelas utilidades oferecidas e pela relevância do criador.',
  },
];

const HOW_IT_WORKS_STEPS = [
  { step: '01', title: 'Crie sua conta', text: 'Cadastre-se na Kurio e acesse seu perfil de colecionador.' },
  { step: '02', title: 'Conecte uma carteira', text: 'Vincule sua carteira Ethereum, Polygon ou Solana na aba Carteiras.' },
  { step: '03', title: 'Escolha um NFT', text: 'Explore o catálogo, filtre por coleção, rede e faixa de preço.' },
  { step: '04', title: 'Finalize a compra', text: 'Adicione ao carrinho, revise a cotação e confirme o pagamento.' },
];

const FAQ_ITEMS = [
  {
    question: 'Comprar um NFT me dá os direitos autorais da obra?',
    answer:
      'Não necessariamente. Em geral você adquire a propriedade do token e o direito de exibir a obra, enquanto os direitos autorais permanecem com o criador, salvo indicação contrária na licença da coleção.',
  },
  {
    question: 'Onde a imagem do NFT fica armazenada?',
    answer:
      'O token fica na blockchain e normalmente aponta para metadados armazenados em redes descentralizadas como o IPFS, o que garante que a obra continue acessível.',
  },
  {
    question: 'O que são taxas de gás?',
    answer:
      'São custos pagos à rede para processar transações. O valor varia conforme a blockchain escolhida e o nível de congestionamento no momento da operação.',
  },
  {
    question: 'Como me proteger de golpes?',
    answer:
      'Nunca compartilhe sua frase de recuperação, desconfie de links recebidos por mensagem e confira sempre se a coleção e o criador são verificados.',
  },
];

function LearnPage() {
  const navigate = useNavigate({ from: Route.fullPath });
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#140D0A] text-[#FAF5F0]">
      <div className="max-w-[1440px] mx-auto w-full px-5 sm:px-10 lg:px-[120px] pt-3.5 pb-6 flex flex-col">
        <Header />

        <section aria-label="Introdução" className="w-full mt-10 mb-12 flex flex-col items-center text-center">
          <span className="text-[#D1823C] text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Guia educativo Web3
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
            Como funcionam os NFTs?
          </h1>
          <p className="text-[#A8968A] text-xs sm:text-[13px] max-w-xl mt-3 leading-relaxed">
            Entenda a tecnologia por trás da propriedade digital, como a autenticidade é garantida
            e o que considerar antes de começar sua coleção.
          </p>
        </section>

        <section aria-label="Conceitos principais" className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
          {LEARN_TOPICS.map((topic) => {
            const Icon = topic.icon;
            return (
              <article
                key={topic.id}
                className="bg-[#1F1510] border border-[#2C1E16] rounded-2xl p-6 flex gap-4 hover:border-[#D1823C]/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-[#D1823C]/15 text-[#D1823C] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#D1823C]">
                    {topic.badge}
                  </span>
                  <h2 className="font-bold text-sm mt-1 mb-2">{topic.title}</h2>
                  <p className="text-[#B5A395] text-xs leading-relaxed">{topic.description}</p>
                </div>
              </article>
            );
          })}
        </section>

        <section aria-label="Passo a passo" className="w-full mb-16">
          <h2 className="text-lg sm:text-xl font-bold text-center mb-8">Comece a colecionar em 4 passos</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS_STEPS.map((item) => (
              <li key={item.step} className="bg-[#1F1510] border border-[#2C1E16] rounded-xl p-5">
                <span className="text-[#D1823C] font-extrabold text-2xl">{item.step}</span>
                <h3 className="font-bold text-xs mt-2 mb-1.5">{item.title}</h3>
                <p className="text-[#A8968A] text-[11px] leading-relaxed">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Perguntas frequentes" className="w-full max-w-3xl mx-auto mb-16">
          <h2 className="text-lg sm:text-xl font-bold text-center mb-6">Perguntas frequentes</h2>
          <div className="flex flex-col gap-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.question} className="bg-[#1F1510] border border-[#2C1E16] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
                  >
                    <span className="font-semibold text-xs sm:text-[13px]">{item.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#D1823C] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-[#B5A395] text-xs leading-relaxed">{item.answer}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="w-full bg-gradient-to-br from-[#3F2617] via-[#4D2E1B] to-[#26160D] border border-[#4D301D] rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-5 mb-20">
          <div>
            <h2 className="font-bold text-base sm:text-lg">Pronto para sua primeira peça?</h2>
            <p className="text-[#C8AE99] text-xs mt-1">Explore o catálogo e encontre o NFT ideal para começar.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="bg-[#D1823C] hover:bg-[#E0924B] text-[#140D0A] font-bold text-xs px-6 py-2.5 rounded-md transition-colors cursor-pointer shrink-0"
          >
            Explorar catálogo
          </button>
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
