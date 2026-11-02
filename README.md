# Kurio — NFT Marketplace (Frontend Challenge)

Aplicação completa de **Marketplace de NFTs (Kurio)** desenvolvida em **React 19** e **TypeScript**, seguindo fielmente a identidade visual e os frames Desktop e Mobile do [Figma do Desafio](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1), com camada de backend simulada via **MSW (Mock Service Worker)**, eventos em tempo real via **Socket.IO**, roteamento fortemente tipado com **TanStack Router** e gerenciamento de estado assíncrono com **TanStack Query**.

---

## Sumário

1. [Como Executar o Projeto](#1-como-executar-o-projeto)
2. [Credenciais e Dados de Teste (Fixtures)](#2-credenciais-e-dados-de-teste-fixtures)
3. [Pilha Tecnológica Obrigatória e Complementar](#3-pilha-tecnológica-obrigatória-e-complementar)
4. [Checklist Completo de Requisitos do Desafio](#4-checklist-completo-de-requisitos-do-desafio)
5. [Funcionalidades Extras Implementadas (Além do Desafio/Figma)](#5-funcionalidades-extras-implementadas-além-do-desafiofigma)
6. [Cenários Determinísticos de Rede e Falhas (MSW)](#6-cenários-determinísticos-de-rede-e-falhas-msw)
7. [Testes E2E (Playwright) e Auditoria Lighthouse](#7-testes-e2e-playwright-e-auditoria-lighthouse)
8. [Documentação de Arquitetura](#8-documentação-de-arquitetura)

---

## 1. Como Executar o Projeto

### Pré-requisitos
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`

### Instalação e Ambiente de Desenvolvimento
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento (Vite + MSW ativado automaticamente)
npm run dev
```
Acesse em `http://localhost:5173`.

### Build de Produção e Preview Local
```bash
# Compilar TypeScript e gerar bundle otimizado de produção
npm run build

# Servir build de produção localmente (porta 4173)
npm run preview
```

### Qualidade de Código (Lint e Typecheck)
```bash
# Executar ESLint
npm run lint

# Verificar tipagem estrita do TypeScript
npx tsc -b --noEmit
```

---

## 2. Credenciais e Dados de Teste (Fixtures)

O banco simulado (`src/mocks/db.ts`) já inicializa com **4 contas de colecionadores verificadas**, NFTs distribuídos em múltiplas coleções/redes, carteiras cadastradas e cupons promocionais:

### Contas de Usuário (Senha padrão para todas: `Password123!`)
| Nome | E-mail | Senha | Carteira Principal |
| :--- | :--- | :--- | :--- |
| **Kurio Collector** *(Padrão)* | `contato@email.com` | `Password123!` | `0x88A...4421B90` (Ethereum) |
| **Elena Vance** | `elena@crypto.io` | `Password123!` | `0x45E...9012C34` (Ethereum) |
| **Alex Jungle** | `alex@jungle.io` | `Password123!` | `0x71C...498bE84` (Ethereum) |
| **Sam Web3** | `sam@jungle.io` | `Password123!` | `0x999...1111FFF` (Ethereum) |

### Cupons Promocionais para Teste no Carrinho (`/cart`)
- **`JUNGLE10`**: Concede **10% de desconto** sobre o subtotal em ETH.
- **`ETH5`**: Concede **0.05 ETH de desconto fixo**.
- **`EXPIRED2025`** *(ou `EXPIRED50`)*: Simula erro `400 EXPIRED_COUPON` (cupom expirado).
- Qualquer outro código inexistente: Simula erro `400 INVALID_COUPON` (cupom inválido).

---

## 3. Pilha Tecnológica Obrigatória e Complementar

| Responsabilidade | Tecnologia Utilizada |
| :--- | :--- |
| **Interface & Linguagem** | React 19.3 + TypeScript 5.9 |
| **Roteamento e Search Params** | TanStack Router (`@tanstack/react-router`) com validação via Zod |
| **Estado Remoto e Cache** | TanStack Query v5 (`@tanstack/react-query`) |
| **Cliente HTTP** | Axios (`src/api/client.ts`) com interceptadores de token e sessão |
| **Tempo Real (WebSockets)** | `socket.io-client` + `@mswjs/socket.io-binding` |
| **Mocking na Camada de Rede** | MSW v2 (`msw/browser`) com persistência local e reset determinístico |
| **Estilização e Componentes** | Tailwind CSS v4 + Primitivos UI (`shadcn/ui` pattern + Lucide Icons) |
| **Precisão Decimal Financeira** | `decimal.js` (cálculos exatos em ETH sem erros de ponto flutuante) |
| **Testes E2E** | Playwright (`@playwright/test`) — Desktop Chrome e Mobile Pixel 5 |
| **Auditoria de Qualidade** | Lighthouse CI (`@lhci/cli`) |

---

## 4. Checklist Completo de Requisitos do Desafio

### Escopo, Telas e Fluxos (Desktop e Mobile)
- [x] **Home / Descoberta (`/`)**: Hero carrossel interativo (Desktop e Mobile com cards sobrepostos conforme Figma), busca com debounce e preview instantâneo no Header, filtros combináveis (coleção, rede, abas *Todos / Novos lançamentos / Em alta*, faixa de preço com slider duplo), ordenação e paginação sincronizados na URL.
- [x] **Detalhes do NFT (`/market?id=...`)**: Galeria com miniaturas e modal de zoom em alta resolução, seleção de edição (`1/1`, `1/10`, `1/25`, `1/50`), controle de quantidade respeitando limite disponível, botão de favoritar com Optimistic UI, abas de *Detalhes Técnicos* e *Avaliações*, compartilhamento social e carrossel *Mais desta coleção*.
- [x] **Carrinho de NFTs (`/cart`)**: Estado 100% unificado e persistido entre Desktop e Mobile, edição de quantidades, remoção de itens, preservação e merge automático do carrinho de visitante (`POST /api/cart/merge`) ao autenticar, aplicação/remoção de cupons e cálculo preciso de subtotal, desconto, taxa de rede (`0.016 ETH`) e total via `Decimal.js`.
- [x] **Checkout e Confirmação (`/checkout`)**: Validação de dados do colecionador, seleção de carteira cadastrada e rede (`Ethereum`, `Polygon`, `Solana`), simulação de assinatura Web3, revalidação de preço e estoque antes da confirmação, proteção contra cliques duplos e reenvios após timeout com **`Idempotency-Key`**, e modal de confirmação (`THANK YOU FOR YOUR PURCHASE!`) exibindo o snapshot imutável do recibo (`GET /api/orders/:id/receipt`).
- [x] **Autenticação e Sessão (`AuthModal`)**: Telas de Login e Cadastro (frames Desktop e Mobile), validação de campos e conflito de e-mail (`409`), recuperação de sessão após F5 (`GET /api/auth/me`), tratamento de sessão expirada (`401`) com retomada automática do fluxo anterior e limpeza de cache privado no logout.
- [x] **Perfil do Colecionador e Carteiras (`/profile`)**: Edição de nome de exibição, usuário, e-mail, domínio ENS (`.eth`, `.sol`, `.xyz`), apelido da carteira, foto de perfil (`avatarUrl`), alteração de senha com validação da senha atual e gestão de carteiras principais e secundárias.

### Integração, Estado, Tempo Real e Acessibilidade
- [x] **Contratos Tipados**: Schemas Zod e tipos TypeScript centralizados em `src/api/contracts/index.ts`.
- [x] **Atualização Otimista com Rollback**: Implementada no fluxo de Favoritos (`POST / DELETE /api/favorites/:id`) com restauração automática do estado anterior em caso de falha da API.
- [x] **Cancelamento de Requisições Obsoletas**: Repasse do `AbortSignal` do TanStack Query para o Axios e controle de versão (`event.version > nft.version`) nos eventos Socket.IO.
- [x] **Eventos Socket.IO via MSW**: Simulação real de `nft.updated` e `order.updated` via `@mswjs/socket.io-binding`.
- [x] **Acessibilidade e Semântica**: Landmarks semânticos (`header`, `main`, `aside`, `nav`, `footer`), `role="dialog"`, `aria-modal`, `aria-live`, navegação por teclado (`Escape`, `Tab`, `Enter`) e contraste validado.

---

## 5. Funcionalidades Extras Implementadas (Além do Desafio/Figma)

Para elevar a experiência do produto a um padrão de produção real, implementamos funcionalidades adicionais mantendo 100% de coesão visual com o Design System da Kurio:

1. **Fluxo Completo de Escolha de Foto de Perfil (`/profile?tab=details`)**:
   - Modal interativo com **3 opções**: Galeria oficial de NFTs da Kurio (8 avatares curados), **Upload de imagem do dispositivo** via `FileReader` (PNG, JPG, WEBP, GIF até 5 MB) e **URL personalizada / Gerador de Identicon Web3 algorítmico** com pré-visualização em tempo real.
2. **Seletor Rápido de Cupons Disponíveis no Carrinho (`/cart`)**:
   - Antes de digitar o código promocional, o colecionador pode abrir o painel **"Ver cupons disponíveis / Pegar cupom"** para selecionar com 1 clique os cupons ativos (`JUNGLE10` e `ETH5`), além de contar com o botão `X` para limpar/remover o cupom aplicado instantaneamente.
3. **Carrossel Interativo em "Colecionadores também viram" (`/cart`) e "Mais desta coleção" (`/market`)**:
   - Paginação fluida em 3 páginas com setas laterais e indicadores dinâmicos.
4. **Rota Exclusiva de Criadores Verificados (`/creators`)**:
   - Diretório dos artistas e estúdios por trás das coleções da Kurio (*Maya Lin*, *Vortex Studios*, *Kael & Lyra*, *Atelier Noir*, *Sora Takahashi* e *Coletivo 0xBrasil*), com filtro por especialidade, métricas auditadas de volume em ETH, modal de biografia completa e redirecionamento direto para as obras no catálogo.
5. **Rota Educacional "Aprenda Web3 & NFTs" (`/learn`)**:
   - Guia interativo sobre como funcionam NFTs, comparativo técnico das redes (*Ethereum*, *Polygon*, *Solana*), simulador de distribuição de *Smart Contracts & Royalties*, checklist de segurança não-custodial e FAQ em formato accordion.
6. **Ecossistema Completo de Rotas do Menu "Meu Perfil" (`ProfileSidebar`)**:
   - **Lista de Interesse (`/wishlist`)**: Galeria dedicada aos NFTs favoritados pelo usuário no mesmo padrão visual do app mobile, com desfavoritar instantâneo e navegação direta.
   - **Central de Ofertas (`/offers`)**: Gerenciamento de lances recebidos e enviados em ETH, permitindo aceitar, recusar ou enviar novas propostas rápidas para itens do catálogo.
   - **Arquivos Baixados & Conteúdo Desbloqueável (`/downloads`)**: Download direto da arte em alta resolução (4K) e geração/download do **Certificado JSON de Autenticidade e Procedência IPFS** assinado pelo contrato inteligente.
   - **Central de Suporte Web3 & Diagnóstico On-Chain (`/support`)**: Painel com status operacional das redes em tempo real, ferramenta de **Auditoria Instantânea de Hash/Carteira (`0x...`)** e abertura de chamados prioritários com geração imediata de número de protocolo (`#KUR-XXXX`).
7. **Modal Editorial Profissional no "Diário da Cunhagem" (`/`)**:
   - Leitura completa dos artigos na Home com capa em alta definição, tempo de leitura, destaque de segurança Web3 e atalho para explorar o acervo.

---

## 6. Cenários Determinísticos de Rede e Falhas (MSW)

Os cenários de falha e latência estão implementados em `src/mocks/scenarios.ts` e podem ser acionados programaticamente no console do navegador ou nos testes E2E via `window.__KURIO_SCENARIOS__` e `window.__KURIO_DB__`:

```js
// Resetar o banco de dados simulado para o estado inicial conhecido (Fixtures)
window.__KURIO_DB__.resetDatabase();

// Configurar cenários de rede / falha no MSW:
window.__KURIO_SCENARIOS__.set({
  latencyMs: 1200,                // Simula lentidão na rede (ms)
  emptyCatalog: false,            // Retorna catálogo vazio
  failFavorites: true,            // Força HTTP 500 ao favoritar para testar Rollback do Optimistic UI
  sessionExpired: true,           // Força HTTP 401 SESSION_EXPIRED para testar reautenticação
  orderTimeout: true,             // Simula HTTP 504 Gateway Timeout após criar pedido (teste de Idempotência)
  paymentFailed: true,            // Simula pedido recusado (status REJECTED)
  priceChangedInCart: true,       // Simula conflito HTTP 409 de preço alterado durante o checkout
  editionSoldOut: true,           // Simula conflito HTTP 409 de edição esgotada na compra
  invalidCredentialsError: true,  // Força HTTP 401 no login
  simulateHttp500OnCatalog: true, // Força HTTP 500 na listagem de NFTs
});

// Restaurar todos os cenários para o padrão normal
window.__KURIO_SCENARIOS__.reset();
```

---

## 7. Testes E2E (Playwright) e Auditoria Lighthouse

### Executar Testes End-to-End (Playwright)
Os testes em `tests/marketplace.spec.ts` exercitam os fluxos em Desktop (`1440x900`) e Mobile (`Pixel 5`):
```bash
npx playwright test
```

### Executar Auditoria Lighthouse CI
A configuração em `lighthouserc.json` audita Performance, Acessibilidade, Boas Práticas e SEO nas rotas principais (`/`, `/market?nftId=nft-1`, `/cart`, `/checkout`):
```bash
npx lhci autorun
```
Os relatórios HTML e JSON gerados também estão disponíveis no diretório `.lighthouseci/`.

---

## 8. Documentação de Arquitetura

Para detalhes aprofundados sobre os **Contratos REST**, **Payloads de Eventos Socket.IO (`nft.updated` e `order.updated`)**, **Reconciliação de Estado** e **Política de Cache**, consulte o documento [ARCHITECTURE.md](./ARCHITECTURE.md).
