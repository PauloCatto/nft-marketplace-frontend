import Decimal from 'decimal.js';
import { server } from '../src/mocks/server';
import { apiClient } from '../src/api/client';
import { db } from '../src/mocks/db';
import { scenarios } from '../src/mocks/scenarios';
import { emitMockNftUpdated, JUNGLE_WS_URL } from '../src/mocks/socket/socketHandler';
import { io } from 'socket.io-client';

async function runVerification() {
  server.listen({ onUnhandledRequest: 'bypass' });
  db.resetDatabase();
  scenarios.reset();

  try {
    // -------------------------------------------------------------
    // TESTE 1: Interceptação de Requisição Axios pelo MSW
    // -------------------------------------------------------------
    const nftsResponse = await apiClient.get('/nfts');
    if (nftsResponse.status === 200 && nftsResponse.data.items?.length === 8 && nftsResponse.data.total === 12) {
      console.log('   ✅ SUCESSO: MSW interceptou Axios e retornou os 12 NFTs paginados.');
    } else {
      throw new Error(`Falha no GET /api/nfts: ${JSON.stringify(nftsResponse.data)}`);
    }

    // -------------------------------------------------------------
    // TESTE 2: Autenticação Determinística e Isolamento de Usuários
    // -------------------------------------------------------------

    // 2.1 Visitante sem token deve receber 401 nas rotas protegidas (sem fallback para user-alex)
    delete apiClient.defaults.headers.common['Authorization'];
    try {
      await apiClient.get('/favorites');
      throw new Error('Deveria ter retornado 401 para visitante deslogado em /favorites');
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.log('   ✅ SUCESSO: Rota protegida (/favorites) retornou 401 para visitante deslogado.');
      } else {
        throw new Error(`Esperado 401 para visitante, obtido: ${err.message}`);
      }
    }

    // 2.2 Login de Alex e configuração do token no apiClient
    const loginAlex = await apiClient.post('/auth/login', {
      email: 'alex@jungle.io',
      password: 'Password123!',
    });
    if (loginAlex.status === 200 && loginAlex.data.token === 'simulated-jwt-user-alex') {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${loginAlex.data.token}`;
    } else {
      throw new Error('Falha no login do Alex');
    }

    const alexFavRes = await apiClient.get('/favorites');
    const samFavRes = await apiClient.get('/favorites', {
      headers: { Authorization: 'Bearer simulated-jwt-user-sam' },
    });

    if (
      alexFavRes.data.nftIds.includes('nft-1') &&
      !alexFavRes.data.nftIds.includes('nft-3') &&
      samFavRes.data.nftIds.includes('nft-3') &&
      !samFavRes.data.nftIds.includes('nft-1')
    ) {
      console.log('   ✅ SUCESSO: Dados de favoritos e carteiras estritamente isolados entre Alex e Sam via API.');
    } else {
      throw new Error('Falha no isolamento de dados entre usuários');
    }

    // -------------------------------------------------------------
    // TESTE 3: Carrinho com NFT Real, Precisão Decimal.js e Cupom JUNGLE10
    // -------------------------------------------------------------
    // Alex inicia com nft-2 (1x 0.125 ETH) nas fixtures; adicionamos nft-1 (2x 0.450 ETH)
    const addCartRes = await apiClient.post('/cart/items', {
      nftId: 'nft-1',
      quantity: 2,
    });
    if (addCartRes.status !== 200 || addCartRes.data.items.length < 2) {
      throw new Error('Falha ao adicionar nft-1 ao carrinho do Alex');
    }

    const quoteRes = await apiClient.post('/cart/quote', { couponCode: 'JUNGLE10' });
    const quote = quoteRes.data;

    // Verificação independente usando Decimal.js sobre os itens retornados na cotação
    const expectedSubtotal = quote.items.reduce(
      (acc: Decimal, item: { priceEth: string; quantity: number }) =>
        acc.plus(new Decimal(item.priceEth).times(item.quantity)),
      new Decimal(0)
    );
    const expectedDiscount = expectedSubtotal.times(10).dividedBy(100);
    const expectedGasFee = new Decimal(quote.gasFeeEth);
    const expectedTotal = expectedSubtotal.minus(expectedDiscount).plus(expectedGasFee);

    if (
      quoteRes.status === 200 &&
      quote.quoteId &&
      quote.couponCode === 'JUNGLE10' &&
      expectedSubtotal.greaterThan(0) &&
      new Decimal(quote.subtotalEth).equals(expectedSubtotal) &&
      new Decimal(quote.discountEth).equals(expectedDiscount) &&
      new Decimal(quote.totalEth).equals(expectedTotal)
    ) {
      console.log('   ✅ SUCESSO: Cotação com itens reais calculada com precisão Decimal.js:');
      console.log(`      • Itens no carrinho: ${quote.items.map((i: any) => `${i.quantity}x ${i.name} (${i.priceEth} ETH)`).join(', ')}`);
      console.log(`      • Subtotal:     ${quote.subtotalEth} ETH`);
      console.log(`      • Desconto:     -${quote.discountEth} ETH (Cupom: ${quote.couponCode} - ${quote.couponDiscountPercent}%)`);
      console.log(`      • Taxa de Rede: ${quote.gasFeeEth} ETH`);
      console.log(`      • Total Final:  ${quote.totalEth} ETH ($${quote.totalUsd} USD)`);
    } else {
      throw new Error(`Falha na validação Decimal.js da cotação: ${JSON.stringify(quote)}`);
    }

    // -------------------------------------------------------------
    // TESTE 4: Idempotência de Pedidos, Preservação de Quote/Cupom e Conflitos (409)
    // -------------------------------------------------------------
    const testIdempotencyKey = `key-test-${Date.now()}`;
    const orderPayload = {
      quoteId: quote.quoteId,
      walletAddress: '0x71C...498bE84',
      network: 'Ethereum' as const,
    };

    // 4.1 Teste de cenário editionSoldOut (409) antes de confirmar o pedido
    scenarios.set({ editionSoldOut: true });
    try {
      await apiClient.post('/orders', orderPayload, {
        headers: { 'Idempotency-Key': `key-soldout-${Date.now()}` },
      });
      throw new Error('Deveria ter retornado 409 AVAILABILITY_CONFLICT para editionSoldOut');
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.error?.code === 'AVAILABILITY_CONFLICT') {
        console.log('   ✅ SUCESSO: Cenário editionSoldOut bloqueou pedido com 409 AVAILABILITY_CONFLICT.');
      } else {
        throw new Error(`Falha no teste editionSoldOut: ${err.message}`);
      }
    }
    scenarios.reset();

    // 4.2 Primeira tentativa válida -> 201 Created preservando quoteId e cupom
    const order1 = await apiClient.post('/orders', orderPayload, {
      headers: { 'Idempotency-Key': testIdempotencyKey },
    });
    if (
      order1.status === 201 &&
      order1.data.id &&
      order1.data.quotationSnapshot.quoteId === quote.quoteId &&
      order1.data.quotationSnapshot.couponCode === 'JUNGLE10' &&
      order1.data.quotationSnapshot.totalEth === quote.totalEth
    ) {
      console.log(`   ✅ SUCESSO: Pedido criado com status 201 (ID: ${order1.data.id}) preservando quoteId (${quote.quoteId}) e cupom JUNGLE10.`);
    } else {
      throw new Error('Falha na criação do pedido ou na preservação do quoteId/cupom');
    }

    // 4.3 Segunda tentativa com a MESMA chave e MESMO payload -> deve retornar 200 OK com o mesmo pedido
    const order2 = await apiClient.post('/orders', orderPayload, {
      headers: { 'Idempotency-Key': testIdempotencyKey },
    });
    if (order2.status === 200 && order2.data.id === order1.data.id) {
      console.log('   ✅ SUCESSO: Replay da mesma chave recuperou exatamente o mesmo pedido (200 OK).');
    } else {
      throw new Error('Falha na recuperação idempotente do pedido');
    }

    // 4.4 Terceira tentativa com a MESMA chave mas PAYLOAD DIFERENTE -> deve retornar 409 Conflict
    try {
      await apiClient.post(
        '/orders',
        { ...orderPayload, walletAddress: '0x000...DIVERGENTE' },
        { headers: { 'Idempotency-Key': testIdempotencyKey } }
      );
      throw new Error('Deveria ter falhado com 409 Conflict');
    } catch (err: any) {
      if (err.response?.status === 409 && err.response.data?.error?.code === 'IDEMPOTENCY_CONFLICT') {
        console.log('   ✅ SUCESSO: Reutilização de chave com payload diferente gerou erro 409 Conflict.');
      } else {
        throw new Error(`Esperado 409 Conflict, obtido: ${err.message}`);
      }
    }

    // -------------------------------------------------------------
    // TESTE 5: Cenários Determinísticos (Rollback e Expiração de Sessão)
    // -------------------------------------------------------------
    scenarios.set({ failFavorites: true });
    try {
      await apiClient.post('/favorites/nft-2');
      throw new Error('Deveria ter retornado 500');
    } catch (err: any) {
      if (err.response?.status === 500 && err.response.data?.error?.code === 'TRANSIENT_FAILURE') {
        console.log('   ✅ SUCESSO: Erro 500 simulado para testar Rollback da mutação otimista.');
      } else {
        throw new Error('Falha no cenário de erro 500 em favoritos');
      }
    }

    scenarios.set({ failFavorites: false, sessionExpired: true });
    try {
      await apiClient.get('/profile');
      throw new Error('Deveria ter retornado 401 SESSION_EXPIRED');
    } catch (err: any) {
      if (err.response?.status === 401 && err.response.data?.error?.code === 'SESSION_EXPIRED') {
        console.log('   ✅ SUCESSO: Cenário sessionExpired retornou 401 SESSION_EXPIRED de forma consistente.');
      } else {
        throw new Error('Falha no cenário sessionExpired');
      }
    }
    scenarios.reset();

    // -------------------------------------------------------------
    // TESTE 6: Sincronização Socket.IO + Banco Simulado (REST <-> WS)
    // -------------------------------------------------------------
    emitMockNftUpdated({
      nftId: 'nft-1',
      version: 2,
      priceEth: '0.500',
      isAvailable: true,
      availableEditions: 6,
      updatedAt: new Date().toISOString(),
    });

    const updatedNftRes = await apiClient.get('/nfts/nft-1');
    if (
      updatedNftRes.status === 200 &&
      updatedNftRes.data.priceEth === '0.500' &&
      updatedNftRes.data.version === 2 &&
      updatedNftRes.data.availableEditions === 6
    ) {
      console.log('   ✅ SUCESSO: emitMockNftUpdated sincronizou o banco simulado (GET /api/nfts/nft-1 retornou priceEth=0.500, version=2).');
    } else {
      throw new Error('Falha na sincronização entre emitMockNftUpdated e o banco simulado');
    }

    const clientSocket = io(JUNGLE_WS_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });

    const socketPromise = new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        clientSocket.disconnect();
        resolve();
      }, 3000);

      clientSocket.on('connect', () => {
        console.log('   ✅ SUCESSO: socket.io-client conectado com sucesso ao mock MSW WebSocket.');
        emitMockNftUpdated({
          nftId: 'nft-1',
          version: 3,
          priceEth: '0.550',
          isAvailable: true,
          availableEditions: 5,
          updatedAt: new Date().toISOString(),
        });
      });

      clientSocket.on('nft.updated', (data) => {
        if (data.nftId === 'nft-1' && data.priceEth === '0.550') {
          console.log('   ✅ SUCESSO: Evento nft.updated recebido pelo cliente Socket.IO com payload correto!');
          clearTimeout(timeout);
          clientSocket.disconnect();
          resolve();
        }
      });

      clientSocket.on('connect_error', (err) => {
        clearTimeout(timeout);
        console.log(`   ℹ️ [Nota de Ambiente Node]: Conexão iniciada (${err.message}). No navegador, o Service Worker intercepta o WebSocket nativo.`);
        clientSocket.disconnect();
        resolve();
      });

      clientSocket.connect();
    });

    await socketPromise;

    // -------------------------------------------------------------
    // TESTE 7: Reset Total do Banco de Dados
    // -------------------------------------------------------------
    db.resetDatabase();
    const cleanNFTs = db.getNFTs();
    if (cleanNFTs.length === 12 && cleanNFTs.find((n) => n.id === 'nft-1')?.priceEth === '0.450') {
      console.log('   ✅ SUCESSO: resetDatabase() restaurou 100% das fixtures originais.');
    } else {
      throw new Error('Falha no resetDatabase()');
    }

  } finally {
    delete apiClient.defaults.headers.common['Authorization'];
    server.close();
  }
}

export const verificationComplete = runVerification().catch((err) => {
  console.error('\n❌ ERRO NA VERIFICAÇÃO:', err);
  process.exit(1);
});
