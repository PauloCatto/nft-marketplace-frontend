import Decimal from 'decimal.js'


Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

export type EthAmount = string

export function createDecimal(value: string | number | Decimal): Decimal {
  return new Decimal(value)
}

export function formatEthDisplay(value: EthAmount, maxDecimals = 6): string {
  try {
    const d = new Decimal(value)
    if (d.isZero()) return '0 ETH'
    return `${d.toFixed(maxDecimals).replace(/(\.\d*?[1-9])0+$|\.0*$/, '$1')} ETH`
  } catch {
    return `${value} ETH`
  }
}
