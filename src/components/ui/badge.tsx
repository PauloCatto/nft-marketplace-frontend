import * as React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'secondary'
}

const badgeVariants: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[#cc7a3c] text-[#1a0f09] font-bold',
  outline: 'border border-[#432919] text-[#d3c1b0] bg-transparent',
  secondary: 'bg-[#2a1910] text-[#f5efe8]',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[4px] px-2.5 py-0.5 text-[10px] tracking-wider transition-colors',
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  )
}
