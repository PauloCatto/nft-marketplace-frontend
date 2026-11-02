import type { Wallet } from '../../api/contracts';

export const initialWalletsFixture: Wallet[] = [
  {
    id: 'wallet-alex-1',
    userId: 'user-alex',
    address: '0x71C...498bE84',
    label: 'MetaMask Principal',
    network: 'Ethereum',
    isPrimary: true,
    connectedAt: '2026-01-20T11:00:00.000Z',
  },
  {
    id: 'wallet-alex-2',
    userId: 'user-alex',
    address: '0x32A...897c112',
    label: 'Polygon Gaming',
    network: 'Polygon',
    isPrimary: false,
    connectedAt: '2026-02-10T14:30:00.000Z',
  },
  {
    id: 'wallet-sam-1',
    userId: 'user-sam',
    address: '0x999...1111FFF',
    label: 'Coinbase Vault',
    network: 'Ethereum',
    isPrimary: true,
    connectedAt: '2026-02-05T09:15:00.000Z',
  },
];
