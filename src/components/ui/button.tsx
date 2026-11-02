import * as React from 'react'
import { cn } from '../../lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default: 'bg-[#cc7a3c] text-[#170e09] hover:bg-[#dd8847] font-semibold',
  outline:
    'border border-[#432919] bg-transparent text-[#f5efe8] hover:border-[#cc7a3c] hover:text-[#cc7a3c]',
  ghost: 'bg-transparent text-[#d3c1b0] hover:bg-[#2a1910] hover:text-[#f5efe8]',
  secondary: 'bg-[#2a1910] text-[#f5efe8] hover:bg-[#382216]',
  destructive: 'bg-[#3d1711] text-[#f28b7d] border border-[#7c2e22] hover:bg-[#4f1e17]',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-10 px-4 py-2 text-xs',
  sm: 'h-8 px-3 text-[11px]',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-9 w-9 p-0',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cc7a3c] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    )
  },
)

Button.displayName = 'Button'
