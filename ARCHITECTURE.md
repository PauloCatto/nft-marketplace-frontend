# Arquitetura e Especificação Técnica — Kurio NFT Marketplace

## 1. Visão Geral da Arquitetura

A aplicação foi estruturada seguindo o padrão de **Colocation** do ecossistema moderno React + TanStack, com separação clara entre transporte HTTP/WebSocket, gerenciamento de estado assíncrono, roteamento fortemente tipado e camada de simulação de rede (MSW v2):

- **`src/api/client.ts`**: Instância única do Axios configurada com `baseURL: '/api'`, injeção automática do cabeçalho `Authorization: Bearer <token>` e interceptador global de respostas `401` que dispara os eventos `jungle:session-expired` e `jungle:require-auth` preservando a rota de destino (`redirectTo`) e a ação pendente (`onSuccess`).
- **`src/api/contracts/index.ts`**: Schemas Zod e interfaces TypeScript compartilhados entre os componentes React, o cliente Axios e os handlers do MSW, garantindo contrato único ponta a ponta.
- **`src/mocks/`**: Camada de rede simulada com **MSW v2** (`http` para REST e `ws.link` + `@mswjs/socket.io-binding` para WebSockets Socket.IO), mantendo estado transacional consistente e persistido em `localStorage` através da classe `MockDatabase` (`src/mocks/db.ts`).
- **`src/routes/`**: Rotas baseadas em arquivos do **TanStack Router** padronizadas em inglês, com validação de Search Params via Zod e proteção de rotas privadas via `beforeLoad`:
  - `/` (`src/routes/index.tsx`) — Home / Descoberta, Catálogo, Filtros Combináveis e Diário da Cunhagem
  - `/market` (`src/routes/market.tsx`) — Detalhes do NFT, Galeria com Zoom, Seleção de Edição, Avaliações e Carrossel da Coleção
  - `/cart` (`src/routes/cart.tsx`) — Carrinho de NFTs sincronizado entre Desktop/Mobile, Seletor de Cupons e Cotação Decimal
  - `/checkout` (`src/routes/checkout.tsx`) — Checkout Não-Custodial, Revalidação de Cotação, Idempotência e Recibo Imutável
  - `/profile` (`src/routes/profile.tsx`) — Perfil do Colecionador (`?tab=details`), Seletor de Avatar e Gestão de Carteiras (`?tab=wallets`)
  - `/wishlist` (`src/routes/wishlist.tsx`) — Lista de Interesse / Meus Favoritos sincronizada com Optimistic UI
  - `/offers` (`src/routes/offers.tsx`) — Central de Ofertas Recebidas e Enviadas em ETH
  - `/downloads` (`src/routes/downloads.tsx`) — Arquivos Baixados, Artes Master 4K e Certificados JSON IPFS
  - `/support` (`src/routes/support.tsx`) — Central de Suporte Web3, Diagnóstico de Hash `0x` On-Chain e Protocolos Prioritários
  - `/creators` (`src/routes/creators.tsx`) — Diretório de Criadores Verificados, Métricas de Volume e Royalties On-Chain
  - `/learn` (`src/routes/learn.tsx`) — Guia Interativo de Propriedade Digital, Padrões ERC-721/SPL, Gas Fees e Segurança

---

## 2. Contratos REST (`/api/*`)

| Método e Rota | Descrição | Códigos de Resposta |
| :--- | :--- | :--- |
| `POST /api/auth/login` | Autentica usuário e retorna `{ user, token, expiresAt }` | `200`, `400`, `401` |
| `POST /api/auth/register` | Cria conta de colecionador com verificação de conflito de e-mail | `201`, `400`, `409` |
| `GET /api/auth/me` | Consulta a sessão ativa a partir do token Bearer | `200`, `401`, `404` |
| `POST /api/auth/logout` | Encerra a sessão atual | `200` |
| `GET /api/nfts` | Listagem com `search`, `category`, `network`, `tab`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` | `200`, `500` |
| `GET /api/nfts/preferences` | Recupera preferências persistidas de filtros/ordenação do catálogo | `200` |
| `PUT /api/nfts/preferences` | Persiste preferências de navegação do catálogo no banco local | `200` |
| `GET /api/nfts/:id` | Detalhe completo do NFT por identificador | `200`, `404` |
| `GET /api/favorites` | Lista os NFTs favoritados (`{ items, nftIds }`) pelo usuário autenticado | `200`, `401` |
| `POST /api/favorites/:id` | Adiciona NFT aos favoritos (suporta atualização otimista e rollback) | `201`, `404`, `500` |
| `DELETE /api/favorites/:id` | Remove NFT dos favoritos (suporta atualização otimista e rollback) | `200`, `500` |
| `GET /api/cart` | Retorna os itens e contagem total do carrinho (`{ items, itemCount }`) | `200`, `401` |
| `POST /api/cart/items` | Adiciona item respeitando o estoque disponível (`availableEditions`) | `200`, `400`, `409` |
| `PATCH /api/cart/items/:id` | Atualiza a quantidade inteira de edições de um item no carrinho | `200`, `400` |
| `DELETE /api/cart/items/:id` | Remove um item do carrinho | `200` |
| `POST /api/cart/merge` | Mescla o carrinho de visitante (`guestCart`) na conta recém-autenticada | `200`, `401` |
| `POST /api/cart/quote` | Calcula subtotal, desconto de cupom (`JUNGLE10`, `ETH5`), gas fee (`0.016 ETH`) e total via `Decimal.js` | `200`, `400`, `409` |
| `POST /api/orders` | Criação idempotente de pedido via cabeçalho obrigatório `Idempotency-Key` | `201`, `200`, `400`, `409`, `504` |
| `GET /api/orders/:id` | Consulta estado do pedido (`PENDING`, `CONFIRMED`, `REJECTED`) | `200`, `404` |
| `GET /api/orders/:id/receipt` | Retorna o snapshot imutável do recibo (`quotationSnapshot` + `transactionHash`) | `200`, `404` |
| `GET /api/profile` | Retorna os dados do perfil autenticado | `200`, `401`, `404` |
| `PUT /api/profile` | Atualiza nome de exibição, bio/ENS e foto de perfil (`avatarUrl`) | `200`, `401`, `404` |
| `PUT /api/profile/password` | Valida a senha atual (hash simulado) e atualiza a senha da conta | `200`, `400`, `401` |
| `GET /api/wallets` | Lista carteiras principais e secundárias vinculadas ao usuário | `200`, `401` |
| `POST /api/wallets` | Cadastra nova carteira principal ou secundária (`Ethereum`, `Polygon`, `Solana`) | `201`, `400`, `401` |
| `PATCH /api/wallets/:id` | Atualiza apelido, rede ou define carteira como principal (`isPrimary`) | `200`, `404` |

---

## 3. Eventos em Tempo Real (Socket.IO + MSW) e Reconciliação

A simulação de WebSocket utiliza `@mswjs/socket.io-binding` em `src/mocks/socket/socketHandler.ts`, interceptando conexões reais do `socket.io-client` (`wss://api.jungle.io`).

- **`nft.updated`**:
  - **Payload**: `{ nftId, version, priceEth, isAvailable, availableEditions, updatedAt }`.
  - **Proteção contra eventos fora de ordem**: Os consumidores em `src/routes/index.tsx` e `src/routes/market.tsx` comparam `event.version > (nft.version || 0)` antes de atualizar o cache do TanStack Query, descartando pacotes obsoletos.
  - **Impacto no Carrinho e Checkout**: Em `src/routes/cart.tsx` e `src/routes/checkout.tsx`, eventos `nft.updated` invalidam `['cart']` e `['cart-quote']`, exigindo revisão quando há alteração de preço ou disponibilidade.
- **`order.updated`**:
  - **Payload**: `{ orderId, status, transactionHash, updatedAt }`.
  - **Reconciliação**: Atualiza o estado do pedido em andamento (`PENDING` -> `CONFIRMED` ou `REJECTED`) e sincroniza o cache na reconexão (`socket.on('connect')`).
- **Limitações conhecidas no ambiente de simulação**:
  - Como o interceptador WebSocket do MSW roda no Service Worker do navegador, no primeiro carregamento a frio (antes da ativação do Service Worker) o navegador pode registrar um aviso de tentativa de handshake inicial antes de o MSW assumir o canal WebSocket.

---

## 4. Estratégia de Cache, Sessão, Optimistic UI e Precisão Decimal

- **Política de Cache (TanStack Query)**:
  - Queries de catálogo e detalhes utilizam cancelamento automático via `AbortSignal` (`{ signal }`) fornecido pelo TanStack Query para descartar respostas obsoletas em mudanças rápidas de filtros/busca.
  - Isolamento por chaves compostas (`['nfts', 'catalog', searchParams]`, `['nfts', 'detail', activeNftId]`, `['cart-quote', items, appliedCoupon]`).
- **Atualização Otimista com Rollback (`Optimistic UI`)**:
  - Implementada nas mutações de favoritos em `src/routes/index.tsx`, `src/routes/market.tsx` e `src/routes/wishlist.tsx`. Ao clicar no ícone de coração, o cache `['favorites']` é atualizado instantaneamente em `onMutate`; caso o cenário `failFavorites` esteja ativo ou ocorra erro `500`, o callback `onError` restaura `context.previousFavorites` e notifica o usuário.
- **Isolamento de Sessão e Segurança**:
  - Senhas nunca são armazenadas em texto puro (utilizam prefixo de hash simulado `simulated_hash_*`).
  - No logout ou expiração de sessão (`401`), o token é removido e `queryClient.removeQueries` limpa imediatamente dados sensíveis (`['profile']`, `['wallets']`, `['favorites']`).
- **Precisão Financeira (`Decimal.js`)**:
  - Todos os valores em ETH trafegam como strings decimais nos contratos REST/Socket e são calculados exclusivamente com `decimal.js`, eliminando desvios de ponto flutuante IEEE 754 em subtotais, descontos percentuais/fixos e taxas de rede (`gasFee`).
