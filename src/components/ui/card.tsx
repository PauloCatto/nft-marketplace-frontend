import * as React from 'react'
import { cn } from '../../lib/utils'

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-[8px] border border-[#331e12] bg-[#24150d] text-[#f5efe8]', className)}
      {...props}
    />
  ),
)

Card.displayName = 'Card'
