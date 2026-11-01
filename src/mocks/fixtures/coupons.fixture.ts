export interface Coupon {
  code: string;
  type: 'percent' | 'fixed_eth';
  value: string; // "10" for 10% or "0.05" for 0.05 ETH
  expiresAt: string;
}

export const initialCouponsFixture: Coupon[] = [
  {
    code: 'JUNGLE10',
    type: 'percent',
    value: '10', // 10% de desconto
    expiresAt: '2028-12-31T23:59:59.000Z',
  },
  {
    code: 'ETH5',
    type: 'fixed_eth',
    value: '0.05', // 0.05 ETH de desconto
    expiresAt: '2028-12-31T23:59:59.000Z',
  },
  {
    code: 'EXPIRED2025',
    type: 'percent',
    value: '25',
    expiresAt: '2025-01-01T00:00:00.000Z', // Expirado para teste determinístico de erro 400
  },
];
