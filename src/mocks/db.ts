import Decimal from 'decimal.js';
import type { NFT, CartItem, Order, Quotation, Wallet } from '../api/contracts';
import { initialUsersFixture, type UserRecord } from './fixtures/users.fixture';
import { initialNFTsFixture } from './fixtures/nfts.fixture';
import { initialCouponsFixture, type Coupon } from './fixtures/coupons.fixture';
import { initialWalletsFixture } from './fixtures/wallets.fixture';

const DB_STORAGE_KEY = 'kurio_nft_mock_db_v12';

export interface DatabaseState {
  users: UserRecord[];
  nfts: NFT[];
  favorites: Record<string, string[]>; 
  carts: Record<string, CartItem[]>; 
  guestCart: CartItem[];
  quotes: Record<string, Quotation>; 
  orders: Record<string, Order[]>; 
  idempotencyStore: Record<string, { orderId: string; payloadHash: string; order: Order }>;
  wallets: Record<string, Wallet[]>; 
  coupons: Coupon[];
}

function getInitialCartItems(): CartItem[] {
  return [
    {
      nftId: 'nft-1',
      nft: JSON.parse(JSON.stringify(initialNFTsFixture.find((n) => n.id === 'nft-1')!)),
      quantity: 2,
      priceAtAddition: '1.19',
    },
    {
      nftId: 'nft-5',
      nft: JSON.parse(JSON.stringify(initialNFTsFixture.find((n) => n.id === 'nft-5')!)),
      quantity: 6,
      priceAtAddition: '1.39',
    },
    {
      nftId: 'nft-6',
      nft: JSON.parse(JSON.stringify(initialNFTsFixture.find((n) => n.id === 'nft-6')!)),
      quantity: 9,
      priceAtAddition: '1.79',
    },
  ];
}

function getInitialState(): DatabaseState {
  return {
    users: JSON.parse(JSON.stringify(initialUsersFixture)),
    nfts: JSON.parse(JSON.stringify(initialNFTsFixture)),
    favorites: {
      'user-alex': ['nft-1', 'nft-4'],
      'user-sam': ['nft-3', 'nft-8'],
    },
    carts: {
      'user-alex': getInitialCartItems(),
      'user-sam': [],
    },
    guestCart: getInitialCartItems(),
    quotes: {},
    orders: {
      'user-alex': [],
      'user-sam': [],
    },
    idempotencyStore: {},
    wallets: {
      'user-alex': initialWalletsFixture.filter((w) => w.userId === 'user-alex'),
      'user-sam': initialWalletsFixture.filter((w) => w.userId === 'user-sam'),
    },
    coupons: JSON.parse(JSON.stringify(initialCouponsFixture)),
  };
}

class MockDatabase {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): DatabaseState {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(DB_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        
      }
    }
    return getInitialState();
  }

  public save(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        
      }
    }
  }

  public resetDatabase(): void {
    this.state = getInitialState();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(DB_STORAGE_KEY);
    }
    this.save();
  }
  
  public findUserByEmail(email: string): UserRecord | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public createUser(userData: { name: string; email: string; passwordHash: string }): UserRecord {
    const newUser: UserRecord = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      bio: '',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${userData.email}`,
      simulatedPasswordHash: userData.passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.state.users.push(newUser);
    this.state.favorites[newUser.id] = [];
    this.state.carts[newUser.id] = [];
    this.state.orders[newUser.id] = [];
    this.state.wallets[newUser.id] = [];
    this.save();
    return newUser;
  }

  public updateUser(userId: string, partial: { name?: string; bio?: string; avatarUrl?: string }): UserRecord | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    if (partial.name !== undefined) user.name = partial.name;
    if (partial.bio !== undefined) user.bio = partial.bio;
    if (partial.avatarUrl !== undefined) user.avatarUrl = partial.avatarUrl;
    this.save();
    return user;
  }

  public updatePassword(userId: string, newHash: string): boolean {
    const user = this.findUserById(userId);
    if (!user) return false;
    user.simulatedPasswordHash = newHash;
    this.save();
    return true;
  }
  
  public getNFTs(): NFT[] {
    return [...this.state.nfts];
  }

  public findNFTById(id: string): NFT | undefined {
    return this.state.nfts.find((n) => n.id === id);
  }

  public updateNFT(id: string, partial: Partial<NFT>): NFT | null {
    const nft = this.findNFTById(id);
    if (!nft) return null;
    const nextVersion = partial.version !== undefined ? partial.version : (nft.version || 1) + 1;
    const nextUpdatedAt = partial.updatedAt || new Date().toISOString();
    Object.assign(nft, partial, {
      version: nextVersion,
      updatedAt: nextUpdatedAt,
    });
    this.save();
    return nft;
  }
  
  public getFavorites(userId: string): NFT[] {
    const ids = this.state.favorites[userId] || [];
    return this.state.nfts.filter((nft) => ids.includes(nft.id));
  }

  public getFavoriteIds(userId: string): string[] {
    return this.state.favorites[userId] || [];
  }

  public addFavorite(userId: string, nftId: string): string[] {
    if (!this.state.favorites[userId]) {
      this.state.favorites[userId] = [];
    }
    if (!this.state.favorites[userId].includes(nftId)) {
      this.state.favorites[userId].push(nftId);
      const nft = this.findNFTById(nftId);
      if (nft) nft.likesCount += 1;
      this.save();
    }
    return this.state.favorites[userId];
  }

  public removeFavorite(userId: string, nftId: string): string[] {
    if (!this.state.favorites[userId]) return [];
    this.state.favorites[userId] = this.state.favorites[userId].filter((id) => id !== nftId);
    const nft = this.findNFTById(nftId);
    if (nft && nft.likesCount > 0) nft.likesCount -= 1;
    this.save();
    return this.state.favorites[userId];
  }
  
  public getCart(userId?: string): CartItem[] {
    if (!userId) return [...this.state.guestCart];
    if (!this.state.carts[userId]) this.state.carts[userId] = [];
    return [...this.state.carts[userId]];
  }

  public addToCart(userId: string | undefined, nftId: string, quantity = 1): { cart: CartItem[]; error?: string } {
    const nft = this.findNFTById(nftId);
    if (!nft) return { cart: this.getCart(userId), error: 'NFT não encontrado' };
    if (!nft.isAvailable || nft.availableEditions <= 0) {
      return { cart: this.getCart(userId), error: 'NFT indisponível ou esgotado' };
    }

    const cart = userId ? (this.state.carts[userId] ||= []) : this.state.guestCart;
    const existing = cart.find((i) => i.nftId === nftId);

    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      if (nextQuantity > nft.availableEditions) {
        return { cart, error: 'Quantidade excede as edições disponíveis' };
      }
      existing.quantity = nextQuantity;
    } else {
      if (quantity > nft.availableEditions) {
        return { cart, error: 'Quantidade excede as edições disponíveis' };
      }
      cart.push({
        nftId,
        nft: JSON.parse(JSON.stringify(nft)),
        quantity,
        priceAtAddition: nft.priceEth,
      });
    }

    this.save();
    return { cart };
  }

  public updateCartQuantity(userId: string | undefined, nftId: string, quantity: number): CartItem[] {
    const cart = userId ? (this.state.carts[userId] ||= []) : this.state.guestCart;
    const item = cart.find((i) => i.nftId === nftId);
    if (item) {
      if (quantity <= 0) {
        return this.removeFromCart(userId, nftId);
      }
      const nft = this.findNFTById(nftId);
      if (nft && quantity > nft.availableEditions) {
        quantity = nft.availableEditions;
      }
      item.quantity = quantity;
      this.save();
    }
    return cart;
  }

  public removeFromCart(userId: string | undefined, nftId: string): CartItem[] {
    if (userId) {
      this.state.carts[userId] = (this.state.carts[userId] || []).filter((i) => i.nftId !== nftId);
    } else {
      this.state.guestCart = this.state.guestCart.filter((i) => i.nftId !== nftId);
    }
    this.save();
    return this.getCart(userId);
  }

  public mergeGuestCart(userId: string): { mergedCart: CartItem[]; removedUnavailable: string[] } {
    const userCart = (this.state.carts[userId] ||= []);
    const removedUnavailable: string[] = [];

    for (const guestItem of this.state.guestCart) {
      const nft = this.findNFTById(guestItem.nftId);
      if (!nft || !nft.isAvailable || nft.availableEditions <= 0) {
        removedUnavailable.push(guestItem.nft.name);
        continue;
      }

      const existingInUser = userCart.find((i) => i.nftId === guestItem.nftId);
      if (existingInUser) {
        const combined = existingInUser.quantity + guestItem.quantity;
        existingInUser.quantity = Math.min(combined, nft.availableEditions);
      } else {
        userCart.push({
          nftId: guestItem.nftId,
          nft: JSON.parse(JSON.stringify(nft)),
          quantity: Math.min(guestItem.quantity, nft.availableEditions),
          priceAtAddition: nft.priceEth,
        });
      }
    }

    this.state.guestCart = [];
    this.save();
    return { mergedCart: userCart, removedUnavailable };
  }
  
  public calculateQuote(userId: string | undefined, couponCode?: string): { quote: Quotation; error?: string } {
    const cart = this.getCart(userId);
    if (cart.length === 0) {
      const emptyQuote: Quotation = {
        quoteId: `quote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        items: [],
        subtotalEth: '0',
        discountEth: '0',
        gasFeeEth: '0.0035',
        totalEth: '0.0035',
        totalUsd: '10.50',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
      this.state.quotes = this.state.quotes || {};
      this.state.quotes[emptyQuote.quoteId] = emptyQuote;
      this.save();
      return { quote: emptyQuote };
    }

    let subtotal = new Decimal(0);
    const quoteItems: Quotation['items'] = [];

    for (const item of cart) {
      const currentNft = this.findNFTById(item.nftId);
      const price = currentNft ? currentNft.priceEth : item.priceAtAddition;
      const itemTotal = new Decimal(price).times(item.quantity);
      subtotal = subtotal.plus(itemTotal);
      quoteItems.push({
        nftId: item.nftId,
        name: item.nft.name,
        priceEth: price,
        quantity: item.quantity,
      });
    }

    let discount = new Decimal(0);
    let appliedPercent = 0;

    if (couponCode) {
      const coupon = this.state.coupons.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
      if (!coupon) {
        return { quote: {} as Quotation, error: 'CUPOM_INVALIDO' };
      }
      if (new Date(coupon.expiresAt) < new Date()) {
        return { quote: {} as Quotation, error: 'CUPOM_EXPIRADO' };
      }

      if (coupon.type === 'percent') {
        appliedPercent = Number(coupon.value);
        discount = subtotal.times(appliedPercent).dividedBy(100);
      } else {
        discount = new Decimal(coupon.value);
        if (discount.greaterThan(subtotal)) {
          discount = subtotal;
        }
      }
    }

    const gasFee = new Decimal('0.016');
    const total = subtotal.minus(discount).plus(gasFee);
    const ethPriceInUsd = new Decimal('3000');
    const totalUsd = total.times(ethPriceInUsd).toFixed(2);

    const quote: Quotation = {
      quoteId: `quote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      items: quoteItems,
      subtotalEth: subtotal.toString(),
      discountEth: discount.toString(),
      couponCode: couponCode || undefined,
      couponDiscountPercent: appliedPercent > 0 ? appliedPercent : undefined,
      gasFeeEth: gasFee.toString(),
      totalEth: total.toString(),
      totalUsd,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };

    this.state.quotes = this.state.quotes || {};
    this.state.quotes[quote.quoteId] = quote;
    this.save();

    return { quote };
  }

  public getQuoteById(quoteId: string): Quotation | undefined {
    this.state.quotes = this.state.quotes || {};
    return this.state.quotes[quoteId];
  }
  
  public findIdempotentOrder(idempotencyKey: string): { orderId: string; payloadHash: string; order: Order } | undefined {
    return this.state.idempotencyStore[idempotencyKey];
  }

  public createOrder(params: {
    userId: string;
    idempotencyKey: string;
    payloadHash: string;
    quotation: Quotation;
    walletAddress: string;
    network: 'Ethereum' | 'Polygon' | 'Solana';
    shouldFailPayment?: boolean;
  }): { order: Order; isReplay: boolean; conflict?: boolean } {
    const existing = this.state.idempotencyStore[params.idempotencyKey];

    if (existing) {
      
      if (existing.payloadHash !== params.payloadHash) {
        return { order: existing.order, isReplay: true, conflict: true };
      }
      
      return { order: existing.order, isReplay: true, conflict: false };
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const status = params.shouldFailPayment ? 'REJECTED' : 'CONFIRMED';

    const order: Order = {
      id: orderId,
      idempotencyKey: params.idempotencyKey,
      payloadHash: params.payloadHash,
      userId: params.userId,
      status,
      quotationSnapshot: JSON.parse(JSON.stringify(params.quotation)),
      walletAddress: params.walletAddress,
      network: params.network,
      failureReason: params.shouldFailPayment ? 'Fundos insuficientes na carteira simulada' : undefined,
      createdAt: new Date().toISOString(),
      receipt:
        status === 'CONFIRMED'
          ? {
            orderId,
            transactionHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            blockNumber: 19827400 + Math.floor(Math.random() * 500),
            confirmedAt: new Date().toISOString(),
            totalPaidEth: params.quotation.totalEth,
            walletAddress: params.walletAddress,
            network: params.network,
            itemsPurchased: params.quotation.items.map((i) => ({
              nftId: i.nftId,
              name: i.name,
              priceEth: i.priceEth,
              quantity: i.quantity,
            })),
          }
          : undefined,
    };

    if (status === 'CONFIRMED') {
      for (const item of params.quotation.items) {
        const nft = this.findNFTById(item.nftId);
        if (nft) {
          nft.availableEditions = Math.max(0, nft.availableEditions - item.quantity);
          if (nft.availableEditions === 0) {
            nft.isAvailable = false;
          }
        }
      }

      if (params.userId === 'guest') {
        this.state.guestCart = [];
      } else {
        this.state.carts[params.userId] = [];
      }
    }

    this.state.idempotencyStore[params.idempotencyKey] = {
      orderId,
      payloadHash: params.payloadHash,
      order,
    };
    (this.state.orders[params.userId] ||= []).unshift(order);

    this.save();
    return { order, isReplay: false };
  }

  public findOrderById(orderId: string): Order | undefined {
    for (const userOrders of Object.values(this.state.orders)) {
      const match = userOrders.find((o) => o.id === orderId);
      if (match) return match;
    }
    return undefined;
  }

  public updateOrderStatus(orderId: string, status: 'CONFIRMED' | 'REJECTED'): Order | null {
    const order = this.findOrderById(orderId);
    if (!order) return null;
    order.status = status;
    if (status === 'CONFIRMED' && !order.receipt) {
      order.receipt = {
        orderId,
        transactionHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        blockNumber: 19827500,
        confirmedAt: new Date().toISOString(),
        totalPaidEth: order.quotationSnapshot.totalEth,
        walletAddress: order.walletAddress,
        network: order.network,
        itemsPurchased: order.quotationSnapshot.items.map((i) => ({
          nftId: i.nftId,
          name: i.name,
          priceEth: i.priceEth,
          quantity: i.quantity,
        })),
      };
    }
    this.save();
    return order;
  }
  
  public getWallets(userId: string): Wallet[] {
    return this.state.wallets[userId] || [];
  }

  public addWallet(userId: string, data: Omit<Wallet, 'id' | 'userId' | 'connectedAt'>): Wallet {
    const wallets = (this.state.wallets[userId] ||= []);
    if (data.isPrimary) {
      wallets.forEach((w) => (w.isPrimary = false));
    }
    const newWallet: Wallet = {
      id: `w-${Date.now()}`,
      userId,
      address: data.address,
      label: data.label,
      network: data.network,
      isPrimary: data.isPrimary || wallets.length === 0,
      connectedAt: new Date().toISOString(),
    };
    wallets.push(newWallet);
    this.save();
    return newWallet;
  }

  public updateWallet(userId: string, walletId: string, data: { label?: string; isPrimary?: boolean }): Wallet | null {
    const wallets = this.state.wallets[userId] || [];
    const wallet = wallets.find((w) => w.id === walletId);
    if (!wallet) return null;

    if (data.isPrimary) {
      wallets.forEach((w) => (w.isPrimary = false));
      wallet.isPrimary = true;
    }
    if (data.label !== undefined) {
      wallet.label = data.label;
    }
    this.save();
    return wallet;
  }

  public deleteWallet(userId: string, walletId: string): boolean {
    const wallets = this.state.wallets[userId] || [];
    const index = wallets.findIndex((w) => w.id === walletId);
    if (index === -1) return false;
    wallets.splice(index, 1);
    this.save();
    return true;
  }
}

export const db = new MockDatabase();
