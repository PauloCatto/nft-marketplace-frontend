import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-[38px] w-full rounded-[4px] border border-[#3e2517] bg-[#1d110a] px-3.5 py-2 text-xs text-[#f5efe8] placeholder:text-[#846953] focus-visible:border-[#cc7a3c] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'
