import { authHandlers } from './auth.handlers';
import { nftHandlers } from './nfts.handlers';
import { favoritesHandlers } from './favorites.handlers';
import { cartHandlers } from './cart.handlers';
import { orderHandlers } from './orders.handlers';
import { profileHandlers } from './profile.handlers';
import { walletHandlers } from './wallets.handlers';

export const handlers = [
  ...authHandlers,
  ...nftHandlers,
  ...favoritesHandlers,
  ...cartHandlers,
  ...orderHandlers,
  ...profileHandlers,
  ...walletHandlers,
];
