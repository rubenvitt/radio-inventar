import * as React from 'react'
import { forwardRef } from 'react'
import { type VariantProps } from 'class-variance-authority'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type TouchTargetSize } from '@/lib/touch-targets'

// Statische Mapping zu CSS Klassen (von globals.css)
const touchSizeClasses: Record<TouchTargetSize, string> = {
  sm: 'touch-target-sm',
  md: 'touch-target-md',
  lg: 'touch-target-lg',
  xl: 'touch-target-xl',
}

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export interface TouchButtonProps extends Omit<ButtonProps, 'size'> {
  touchSize?: TouchTargetSize
  size?: VariantProps<typeof buttonVariants>['size']
}

export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  function TouchButton({ touchSize = 'md', className, ...props }, ref) {
    return (
      <Button
        ref={ref}
        className={cn(
          touchSizeClasses[touchSize],
          'text-lg',
          className
        )}
        style={{ touchAction: 'manipulation' }}
        {...props}
      />
    )
  }
)

TouchButton.displayName = 'TouchButton'
