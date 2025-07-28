'use client'

import { useUIStore } from '@/lib/store/ui-store'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingOverlayProps {
  isLoading?: boolean
  text?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'overlay' | 'inline' | 'page'
  children?: React.ReactNode
}

export function LoadingOverlay({
  isLoading,
  text = 'Cargando...',
  className,
  size = 'md',
  variant = 'overlay',
  children,
}: LoadingOverlayProps) {
  const { globalLoading } = useUIStore()
  const showLoading = isLoading ?? globalLoading

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const Spinner = () => (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          {text}
        </p>
      )}
    </div>
  )

  if (variant === 'inline') {
    return showLoading ? <Spinner /> : <>{children}</>
  }

  if (variant === 'page') {
    return showLoading ? (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Spinner />
      </div>
    ) : (
      <>{children}</>
    )
  }

  // variant === 'overlay'
  return (
    <div className={cn('relative', className)}>
      {children}
      {showLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-md">
          <Spinner />
        </div>
      )}
    </div>
  )
}

// Componente específico para loading de botones
interface LoadingButtonProps {
  isLoading?: boolean
  children: React.ReactNode
  className?: string
  disabled?: boolean
  [key: string]: any
}

export function LoadingButton({
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <Loader2 className="h-4 w-4 animate-spin absolute" />
      )}
      <span className={cn(isLoading && 'opacity-0')}>{children}</span>
    </button>
  )
}

// Componente para skeleton loading personalizable
interface SkeletonProps {
  className?: string
  lines?: number
  variant?: 'text' | 'card' | 'avatar' | 'button'
}

export function Skeleton({ className, lines = 1, variant = 'text' }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted rounded'

  const variantClasses = {
    text: 'h-4',
    card: 'h-24 w-full',
    avatar: 'h-10 w-10 rounded-full',
    button: 'h-10 w-24',
  }

  if (lines === 1) {
    return (
      <div
        className={cn(
          baseClasses,
          variantClasses[variant],
          className
        )}
      />
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            baseClasses,
            variantClasses[variant],
            i === 0 && variant === 'text' && 'w-3/4',
            i === 1 && variant === 'text' && 'w-1/2',
            i === 2 && variant === 'text' && 'w-5/6'
          )}
        />
      ))}
    </div>
  )
}

// Hook para controlar loading global
export function useGlobalLoading() {
  const { globalLoading, setGlobalLoading } = useUIStore()

  return {
    isLoading: globalLoading,
    setLoading: setGlobalLoading,
    startLoading: () => setGlobalLoading(true),
    stopLoading: () => setGlobalLoading(false),
  }
} 