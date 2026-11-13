# Kurio — Non-Custodial Web3 NFT Marketplace

![React 19](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![TanStack](https://img.shields.io/badge/TanStack-Router_%26_Query-FF4154)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-06B6D4?logo=tailwindcss&logoColor=white)
![MSW v2](https://img.shields.io/badge/MSW-v2.15_Stateful_API-FF6A33)
![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?logo=playwright&logoColor=white)

> **Live Demo (Produção):** [https://jungle-nfts.vercel.app](https://jungle-nfts.vercel.app)

O **Kurio** é uma plataforma completa de **Marketplace Não-Custodial de NFTs e Arte Digital** desenvolvida com **React 19**, **TypeScript** e o ecossistema **TanStack**. O projeto foi concebido como um **Estudo de Caso de Engenharia Frontend Sênior**, resolvendo problemas reais de aplicações financeiras e Web3: **precisão monetária determinística**, **idempotência em transações**, **atualizações otimistas com rollback**, **reconciliação de estado em tempo real** e **engenharia de caos (Chaos Engineering)** integrada à própria interface.

---

## Sumário

1. [Destaques de Engenharia e Arquitetura](#1-destaques-de-engenharia-e-arquitetura)
2. [Funcionalidades e Módulos do Produto](#2-funcionalidades-e-módulos-do-produto)
3. [Web3 DevTools & Simulador de Chaos Engineering](#3-web3-devtools--simulador-de-chaos-engineering)
4. [Pilha Tecnológica](#4-pilha-tecnológica)
5. [Credenciais e Cupons para Demonstração](#5-credenciais-e-cupons-para-demonstração)
6. [Como Executar Localmente](#6-como-executar-localmente)
7. [Testes E2E (Playwright), Qualidade e Auditoria Lighthouse](#7-testes-e2e-playwright-qualidade-e-auditoria-lighthouse)
8. [Estrutura do Projeto e Documentação Técnica](#8-estrutura-do-projeto-e-documentação-técnica)

---

## 1. Destaques de Engenharia e Arquitetura

Mais do que uma interface responsiva em Dark UI Web3, o projeto implementa padrões avançados de arquitetura de software no frontend:

- **Precisão Monetária Determinística (`Decimal.js`)**:
  - Valores cripto (`ETH`) nunca são calculados com ponto flutuante nativo do JavaScript (`Number`), evitando anomalias IEEE 754 (como `0.1 + 0.2 !== 0.3`). Subtotais, descontos percentuais/fixos e taxas de rede (`gasFee` de `0.016 ETH`) trafegam como strings decimais nos contratos e são processados exclusivamente via `Decimal.js`.
- **Checkout Idempotente e Proteção contra Concorrência (`Idempotency-Key` + `HTTP 409`)**:
  - Cada tentativa de compra gera uma chave de idempotência única enviada no cabeçalho `Idempotency-Key`. Caso ocorra um `504 Gateway Timeout` ou clique duplo, o reenvio recupera a mesma transação sem duplicar cobranças nem reduzir o estoque duas vezes.
  - Antes de liquidar a ordem, o motor valida se o preço ou a tiragem disponível (`availableEditions`) sofreu alteração concorrente, emitindo `409 Conflict` e exigindo confirmação da nova cotação pelo colecionador.
- **Optimistic UI com Rollback Determinístico**:
  - Ações de favoritar (`POST / DELETE /api/favorites/:id`) atualizam o estado visual instantaneamente (`onMutate`) em todas as visões (Catálogo, Detalhes e Lista de Interesse) e revertem automaticamente para o snapshot anterior (`context.previousFavorites`) caso a rede retorne erro `500`.
- **Reconciliação em Tempo Real e Controle de Versão (`event.version > nft.version`)**:
  - Eventos assíncronos de atualização de preço e estoque (`nft.updated`) e status de pedidos (`order.updated`) possuem versionamento monotônico para descartar pacotes fora de ordem e invalidar cotações abertas no carrinho/checkout.
- **URL-Driven State & Type-Safe Routing (`TanStack Router` + `Zod`)**:
  - Filtros combináveis do catálogo (busca textual, coleção, blockchain, aba de curadoria, faixa de preço em ETH, ordenação e página) são validados via schemas Zod na própria URL, com limpeza automática de parâmetros padrão via `stripSearchParams`.
- **Backend Serverless Mock Persistente no Navegador (`MSW v2` + Auto-Wakeup)**:
  - Toda a API REST (`/api/*`) roda sobre **Mock Service Worker** com banco de dados relacional em memória sincronizado com `localStorage` e recuperação automática de hibernação do Service Worker no interceptador do Axios (`src/api/client.ts`), garantindo funcionamento contínuo tanto em desenvolvimento quanto na Vercel.

---

## 2. Funcionalidades e Módulos do Produto

### Experiência Principal de Compra (Desktop & Mobile)
- **Home & Descoberta (`/`)**:
  - Carrossel Hero interativo (com layout adaptado para Desktop e cards sobrepostos no Mobile), busca com debounce e preview instantâneo no cabeçalho, filtros combináveis (barra lateral no Desktop e painel touch otimizado no Mobile) e seção editorial **Diário da Cunhagem** com leitor completo de artigos (`EditorialArticleModal`).
- **Detalhes da Obra (`/market?id=...`)**:
  - Galeria de alta definição com modal de zoom, seletor de tiragem (`1/1`, `1/10`, `1/25`, `1/50`), controle de quantidade limitado ao estoque real, abas técnicas/avaliações e carrossel paginado *Mais desta coleção*.
- **Carrinho Sincronizado (`/cart`)**:
  - Estado 100% unificado entre Mobile e Desktop, mesclagem automática do carrinho de visitante após login (`POST /api/cart/merge`), **Seletor Rápido de Cupons Disponíveis** (`JUNGLE10` e `ETH5`) com remoção em 1 clique e carrossel *Colecionadores também viram*.
- **Checkout Não-Custodial & Explorador On-Chain Etherscan (`/checkout`)**:
  - Seleção de carteira principal/reserva e provedor Web3 (*MetaMask*, *Coinbase Wallet*, *WalletConnect*), resumo auditado e modal de confirmação com **Explorador de Blocos Etherscan Interativo** (`OrderReceiptModal`), permitindo copiar o `Transaction Hash` (`0x...`) e **baixar o recibo on-chain assinado (`.JSON`)**.

### Autenticação, Perfil e Ecossistema do Colecionador
- **Autenticação Híbrida & OAuth 2.0 (`AuthModal`)**:
  - Login/Cadastro com validação de força de senha e suporte a **Login Social Google e Facebook** via variáveis OAuth 2.0 (`VITE_GOOGLE_CLIENT_ID` / `VITE_FACEBOOK_APP_ID`) combinado com **Seletor Interativo de Contas OAuth** integrado ao MSW.
- **Meu Perfil & Carteiras (`/profile`)**:
  - Edição completa de perfil, domínio ENS (`.eth`, `.sol`, `.xyz`), troca de senha e **Seletor Interativo de Foto de Perfil** com 3 modos: *Galeria Kurio NFTs*, *Upload de arquivo local (`FileReader`)* e *URL / Gerador de Identicon Web3 algorítmico*.
  - Gestão de carteiras Web3 com adição de carteiras secundárias persistidas, alternância de carteira principal e modo de privacidade.
- **Lista de Interesse (`/wishlist`)**:
  - Galeria dedicada aos NFTs favoritados pelo colecionador com sincronização em tempo real e remoção otimista.
- **Central de Ofertas em ETH (`/offers`)**:
  - Gerenciamento de propostas recebidas e enviadas com cálculo de variação sobre o *Floor Price*, aceite/recusa em 1 clique e formulário de nova oferta.
- **Arquivos Baixados & Certificados IPFS (`/downloads`)**:
  - Download direto da arte master em resolução 4K e geração/download do **Certificado JSON de Autenticidade e Procedência IPFS** assinado pelo contrato inteligente.
- **Suporte Web3 & Diagnóstico On-Chain (`/support`)**:
  - Monitoramento de status das redes (*Ethereum*, *Polygon*, *Solana*, *IPFS*), ferramenta de **Auditoria Instantânea de Hash/Carteira (`0x...`)** e abertura de chamado prioritário com geração de protocolo.
- **Diretório de Criadores (`/creators`) & Guia Aprenda Web3 (`/learn`)**:
  - Perfis verificados dos artistas e estúdios da plataforma e guia interativo sobre padrões de token (`ERC-721`, `SPL`), *Gas Fees*, *Royalties* e segurança de *Seed Phrase*.

---

## 3. Web3 DevTools & Simulador de Chaos Engineering

Para facilitar a avaliação técnica sem necessidade de digitar comandos no console, a aplicação conta com o botão flutuante **⚡ Web3 DevTools** (`src/components/devtools/NetworkDevTools.tsx`) no canto inferior direito da tela. Com 1 clique, é possível:

- **Disparar Evento Real-Time (`nft.updated`)**: Simula uma variação de preço e estoque ao vivo refletida instantaneamente no catálogo e no carrinho.
- **Simular Latência de Rede**: Alternar entre rede rápida (`200ms`), 3G lento (`1.2s`) e rede congestionada (`2.5s`).
- **Ativar Cenários de Falha Determinísticos**:
  - *Forçar Erro 500 nos Favoritos* (demonstra o **Rollback do Optimistic UI**).
  - *Simular Timeout 504 no Checkout* (demonstra a recuperação segura via **`Idempotency-Key`**).
  - *Simular Conflito 409 de Cotação* (demonstra a trava de segurança quando o preço muda antes de finalizar a compra).
  - *Simular Recusa da Carteira Web3 (`REJECTED`)* e *Expiração de Sessão JWT (`401`)*.
- **Resetar Banco de Dados Local**: Restaura todas as fixtures originais em 1 clique.

---

## 4. Pilha Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Core & UI** | React 19, TypeScript 5.9 (`strict`), Tailwind CSS v4, Lucide Icons, Sonner |
| **Roteamento & Estado** | TanStack Router (File-Based, Search Params tipados), TanStack Query v5 |
| **Rede & Contratos** | Axios (Fetch Adapter + Interceptors), Zod v4, Decimal.js |
| **Simulação & Tempo Real** | MSW v2 (Mock Service Worker), Event Bus / Socket.IO Binding, LocalStorage DB |
| **Testes & Qualidade** | Playwright (E2E Desktop & Mobile), Lighthouse CI, ESLint 10, GitHub Actions CI |

---

## 5. Credenciais e Cupons para Demonstração

| Recurso | Valores Pré-Configurados |
| :--- | :--- |
| **Conta Colecionador 1** | E-mail: `alex@jungle.io` \| Senha: `Password123!` |
| **Conta Colecionador 2** | E-mail: `elena@crypto.io` \| Senha: `Password123!` |
| **Login Social (OAuth)** | Botões **Continuar com Google / Facebook** (permitem escolher uma conta ou digitar qualquer e-mail) |
| **Cupons no Carrinho (`/cart`)** | `JUNGLE10` (**10% OFF**) \| `ETH5` (**-0.05 ETH**) \| `EXPIRED20` (teste de cupom expirado) |

---

## 6. Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (http://localhost:5173)
npm run dev

# 3. Verificar tipagem estrita e lint
npm run lint
npx tsc -b --noEmit

# 4. Gerar bundle de produção e testar localmente
npm run build
npm run preview
```

---

## 7. Testes E2E (Playwright), Qualidade e Auditoria Lighthouse

```bash
# Executar suíte E2E completa (Desktop Chrome 1440x900 e Mobile Pixel 5)
npm run test:e2e

# Abrir interface interativa do Playwright
npm run test:e2e:ui

# Executar auditoria automatizada de Performance, Acessibilidade e SEO (Lighthouse CI)
npm run lighthouse
```

---

## 8. Estrutura do Projeto e Documentação Técnica

```text
src/
├── api/
│   ├── client.ts                # Instância Axios, injeção de Bearer Token, auto-wakeup do SW e interceptor 401
│   └── contracts/index.ts       # Schemas Zod e contratos TypeScript compartilhados ponta a ponta
├── components/
│   ├── auth/AuthModal.tsx       # Modal de Login, Registro e Seletor OAuth 2.0 (Google/Facebook)
│   ├── checkout/                # Modal de Recibo e Explorador On-Chain Etherscan (OrderReceiptModal)
│   ├── devtools/                # Painel interativo Web3 DevTools & Chaos Simulator (NetworkDevTools)
│   ├── home/                    # Modal de leitura do Diário da Cunhagem (EditorialArticleModal)
│   └── layout/                  # Header, Footer e ProfileSidebar
├── constants/
│   └── home.constants.ts        # Dados de curadoria, filtros e artigos editoriais
├── mocks/
│   ├── db.ts                    # Motor de persistência transacional sincronizado com localStorage
│   ├── scenarios.ts             # Flags determinísticas para simulação de falhas e latência
│   ├── fixtures/                # Dados iniciais (NFTs, usuários, carteiras e cupons)
│   ├── handlers/                # Endpoints REST simulados (/auth, /nfts, /cart, /orders, /profile, /wallets)
│   └── socket/socketHandler.ts  # Barramento de eventos em tempo real (nft.updated e order.updated)
├── routes/                      # Rotas fortemente tipadas do TanStack Router
│   ├── __root.tsx               # Layout raiz, barra de progresso global, DevTools e tratamento de sessão
│   ├── index.tsx                # Catálogo principal, busca, filtros combináveis e descoberta
│   ├── market.tsx               # Página de detalhes da obra, galeria com zoom e avaliações
│   ├── cart.tsx                 # Carrinho sincronizado, seletor de cupons e cotação Decimal.js
│   ├── checkout.tsx             # Checkout não-custodial com Idempotency-Key e revalidação de cotação
│   ├── profile.tsx              # Dados do colecionador, seletor de avatar e gestão de carteiras Web3
│   ├── wishlist.tsx             # Lista de interesse (favoritos sincronizados)
│   ├── offers.tsx               # Central de propostas recebidas e enviadas em ETH
│   ├── downloads.tsx            # Download de artes 4K e certificados JSON IPFS
│   ├── support.tsx              # Diagnóstico on-chain de hash 0x e abertura de protocolo
│   ├── creators.tsx             # Diretório de artistas e estúdios verificados
│   └── learn.tsx                # Guia interativo de propriedade digital e segurança Web3
└── types/index.ts               # Tipos primitivos globais (EthAmount, ApiErrorResponse)
```

Para especificações detalhadas dos contratos de API, payloads de eventos e fluxos de reconciliação, consulte o documento [ARCHITECTURE.md](./ARCHITECTURE.md).
