import { apiClient, AUTH_TOKEN_KEY } from '../client';
import type {
  LoginRequest,
  RegisterRequest,
  AuthSessionResponse,
  NFTListResponse,
  NFT,
  CatalogQueryParams,
  FavoritesResponse,
  CartResponse,
  AddToCartRequest,
  UpdateCartItemRequest,
  Quotation,
  QuoteRequest,
  Order,
  CreateOrderRequest,
  Receipt,
  User,
  UpdateProfileRequest,
  ChangePasswordRequest,
  Wallet,
  CreateWalletRequest,
  UpdateWalletRequest,
} from '../contracts';

export const authService = {
  login: async (data: LoginRequest): Promise<AuthSessionResponse> => {
    const res = await apiClient.post<AuthSessionResponse>('/auth/login', data);
    if (res.data.token && typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
    }
    return res.data;
  },

  register: async (data: RegisterRequest): Promise<AuthSessionResponse> => {
    const res = await apiClient.post<AuthSessionResponse>('/auth/register', data);
    if (res.data.token && typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
    }
    return res.data;
  },

  me: async (): Promise<{ user: User }> => {
    const res = await apiClient.get<{ user: User }>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<void> => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    await apiClient.post('/auth/logout');
  },
};

export const nftsService = {
  list: async (params?: CatalogQueryParams): Promise<NFTListResponse> => {
    const res = await apiClient.get<NFTListResponse>('/nfts', { params });
    return res.data;
  },

  getById: async (id: string): Promise<NFT> => {
    const res = await apiClient.get<NFT>(`/nfts/${id}`);
    return res.data;
  },
};

export const favoritesService = {
  get: async (): Promise<FavoritesResponse> => {
    const res = await apiClient.get<FavoritesResponse>('/favorites');
    return res.data;
  },

  add: async (nftId: string): Promise<{ success: boolean; nftIds: string[] }> => {
    const res = await apiClient.post<{ success: boolean; nftIds: string[] }>(`/favorites/${nftId}`);
    return res.data;
  },

  remove: async (nftId: string): Promise<{ success: boolean; nftIds: string[] }> => {
    const res = await apiClient.delete<{ success: boolean; nftIds: string[] }>(`/favorites/${nftId}`);
    return res.data;
  },
};

export const cartService = {
  get: async (): Promise<CartResponse> => {
    const res = await apiClient.get<CartResponse>('/cart');
    return res.data;
  },

  addItem: async (data: AddToCartRequest): Promise<CartResponse> => {
    const res = await apiClient.post<CartResponse>('/cart/items', data);
    return res.data;
  },

  updateQuantity: async (nftId: string, data: UpdateCartItemRequest): Promise<CartResponse> => {
    const res = await apiClient.patch<CartResponse>(`/cart/items/${nftId}`, data);
    return res.data;
  },

  removeItem: async (nftId: string): Promise<CartResponse> => {
    const res = await apiClient.delete<CartResponse>(`/cart/items/${nftId}`);
    return res.data;
  },

  merge: async (): Promise<CartResponse & { removedUnavailable: string[] }> => {
    const res = await apiClient.post<CartResponse & { removedUnavailable: string[] }>('/cart/merge');
    return res.data;
  },

  getQuote: async (data?: QuoteRequest): Promise<Quotation> => {
    const res = await apiClient.post<Quotation>('/cart/quote', data || {});
    return res.data;
  },
};

export const ordersService = {
  create: async (data: CreateOrderRequest, idempotencyKey: string): Promise<Order> => {
    const res = await apiClient.post<Order>('/orders', data, {
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    });
    return res.data;
  },

  getById: async (id: string): Promise<Order> => {
    const res = await apiClient.get<Order>(`/orders/${id}`);
    return res.data;
  },

  getReceipt: async (id: string): Promise<Receipt> => {
    const res = await apiClient.get<Receipt>(`/orders/${id}/receipt`);
    return res.data;
  },
};

export const profileService = {
  get: async (): Promise<User> => {
    const res = await apiClient.get<User>('/profile');
    return res.data;
  },

  update: async (data: UpdateProfileRequest): Promise<User> => {
    const res = await apiClient.put<User>('/profile', data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<{ success: boolean; message: string }> => {
    const res = await apiClient.put<{ success: boolean; message: string }>('/profile/password', data);
    return res.data;
  },
};

export const walletsService = {
  list: async (): Promise<{ items: Wallet[] }> => {
    const res = await apiClient.get<{ items: Wallet[] }>('/wallets');
    return res.data;
  },

  create: async (data: CreateWalletRequest): Promise<Wallet> => {
    const res = await apiClient.post<Wallet>('/wallets', data);
    return res.data;
  },

  update: async (id: string, data: UpdateWalletRequest): Promise<Wallet> => {
    const res = await apiClient.patch<Wallet>(`/wallets/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/wallets/${id}`);
    return res.data;
  },
};
