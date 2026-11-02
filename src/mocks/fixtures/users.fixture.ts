import type { User } from '../../api/contracts';

export interface UserRecord extends User {
  // Purely simulated password comparison string, documented as non-production mock
  simulatedPasswordHash: string;
}

export const initialUsersFixture: UserRecord[] = [
  {
    id: 'user-alex',
    name: 'Alex Jungle',
    email: 'alex@jungle.io',
    bio: 'Curador e colecionador de arte digital inspirada em biomas tropicais e arte generativa.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    simulatedPasswordHash: 'simulated_hash_Password123!',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'user-sam',
    name: 'Sam Web3',
    email: 'sam@jungle.io',
    bio: 'Desenvolvedor web3 e gamer. Focado em NFTs com utilidade e coleções exclusivas de jogos.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    simulatedPasswordHash: 'simulated_hash_Password123!',
    createdAt: '2026-02-01T14:30:00.000Z',
  },
];
