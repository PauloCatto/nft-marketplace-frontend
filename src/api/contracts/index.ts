import { z } from 'zod';
import type { EthAmount } from '../../types';





export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthSessionResponse {
  token: string;
  user: User;
  expiresAt: string;
}





export interface NFTTrait {
  trait_type: string;
  value: string;
  rarityPercent: number;
}

export interface NFTHistoryItem {
  id: string;
  event: 'Mint' | 'Transfer' | 'Sale' | 'PriceUpdate';
  from: string;
  to: string;
  priceEth?: EthAmount;
  timestamp: string;
  transactionHash: string;
}

export type NFTCategory =
  | 'Art'
  | 'Gaming'
  | 'Photography'
  | 'Collectibles'
  | 'Arte digital'
  | 'Fotografia'
  | 'Música'
  | 'Arte 3D'
  | 'Colecionáveis'
  | 'Generativo'
  | 'Jogos'
  | 'Assinaturas'
  | 'Utilidade';

export type NFTNetwork = 'Ethereum' | 'Polygon' | 'Solana';

export interface NFT {
  id: string;
  version: number;
  name: string;
  collection: string;
  category: NFTCategory;
  network?: NFTNetwork;
  description: string;
  imageUrl: string;
  priceEth: EthAmount;
  originalPriceEth?: EthAmount;
  priceUsd: string;
  isNewLaunch?: boolean;
  isTrending?: boolean;
  creator: {
    name: string;
    address: string;
    avatarUrl: string;
  };
  owner: {
    name: string;
    address: string;
    avatarUrl: string;
  };
  traits: NFTTrait[];
  isAvailable: boolean;
  totalEditions: number;
  availableEditions: number;
  likesCount: number;
  viewsCount: number;
  updatedAt: string;
  history: NFTHistoryItem[];
}

export const catalogQuerySchema = z.object({
  search: z.string().optional().default(''),
  category: z.string().optional().default('All'),
  network: z.string().optional().default('All'),
  tab: z.enum(['all', 'new', 'trending']).optional().default('all'),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional().default('newest'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(9),
});

export type CatalogQueryParams = Partial<z.infer<typeof catalogQuerySchema>>;

export interface NFTListResponse {
  items: NFT[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}





export interface FavoritesResponse {
  items: NFT[];
  nftIds: string[];
}





export interface CartItem {
  nftId: string;
  nft: NFT;
  quantity: number;
  priceAtAddition: EthAmount;
}

export interface CartResponse {
  items: CartItem[];
  itemCount: number;
}

export const addToCartSchema = z.object({
  nftId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export type AddToCartRequest = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>;

export interface Quotation {
  quoteId: string;
  items: Array<{
    nftId: string;
    name: string;
    priceEth: EthAmount;
    quantity: number;
  }>;
  subtotalEth: EthAmount;
  discountEth: EthAmount;
  couponCode?: string;
  couponDiscountPercent?: number;
  gasFeeEth: EthAmount;
  totalEth: EthAmount;
  totalUsd: string;
  expiresAt: string;
}

export const quoteRequestSchema = z.object({
  couponCode: z.string().optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;





export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export const createOrderSchema = z.object({
  quoteId: z.string(),
  walletAddress: z.string().min(10, 'Endereço de carteira inválido'),
  network: z.enum(['Ethereum', 'Polygon', 'Solana']),
});

export type CreateOrderRequest = z.infer<typeof createOrderSchema>;

export interface Receipt {
  orderId: string;
  transactionHash: string;
  blockNumber: number;
  confirmedAt: string;
  totalPaidEth: EthAmount;
  walletAddress: string;
  network: string;
  itemsPurchased: Array<{
    nftId: string;
    name: string;
    priceEth: EthAmount;
    quantity: number;
  }>;
}

export interface Order {
  id: string;
  idempotencyKey: string;
  payloadHash: string;
  userId: string;
  status: OrderStatus;
  quotationSnapshot: Quotation;
  walletAddress: string;
  network: string;
  failureReason?: string;
  createdAt: string;
  receipt?: Receipt;
}





export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  bio: z.string().max(300, 'Bio deve ter no máximo 300 caracteres').optional(),
  avatarUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Senha atual inválida'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
});

export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

export interface Wallet {
  id: string;
  userId: string;
  address: string;
  label: string;
  network: 'Ethereum' | 'Polygon' | 'Solana';
  isPrimary: boolean;
  connectedAt: string;
}

export const createWalletSchema = z.object({
  address: z.string().min(10, 'Endereço da carteira inválido'),
  label: z.string().min(1, 'Label é obrigatório'),
  network: z.enum(['Ethereum', 'Polygon', 'Solana']),
  isPrimary: z.boolean().default(false),
});

export type CreateWalletRequest = z.infer<typeof createWalletSchema>;

export const updateWalletSchema = z.object({
  label: z.string().min(1).optional(),
  isPrimary: z.boolean().optional(),
});

export type UpdateWalletRequest = z.infer<typeof updateWalletSchema>;





export interface NftUpdatedEvent {
  nftId: string;
  version: number;
  priceEth: EthAmount;
  isAvailable: boolean;
  availableEditions: number;
  updatedAt: string;
}

export interface OrderUpdatedEvent {
  orderId: string;
  version: number;
  status: OrderStatus;
  transactionHash?: string;
  failureReason?: string;
  updatedAt: string;
}
