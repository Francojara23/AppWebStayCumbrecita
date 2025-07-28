'use client'

import { Suspense, lazy, ComponentType, LazyExoticComponent, useState, useCallback, useRef, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LazyComponentProps {
  className?: string
  fallback?: React.ReactNode
  children?: React.ReactNode
}

// Loading spinner por defecto
function DefaultFallback({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

// Skeleton genérico
export function ComponentSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('animate-pulse space-y-4 p-4', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 bg-muted rounded',
            i === 0 && 'w-3/4',
            i === 1 && 'w-1/2',
            i === 2 && 'w-5/6'
          )}
        />
      ))}
    </div>
  )
}

// HOC para lazy loading de componentes
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc)

  return function LazyLoadedComponent(props: P & LazyComponentProps) {
    const { className, fallback: customFallback, ...componentProps } = props

    return (
      <Suspense 
        fallback={
          customFallback || 
          fallback || 
          <DefaultFallback className={className} />
        }
      >
        <LazyComponent {...(componentProps as P)} />
      </Suspense>
    )
  }
}

// Hook para lazy loading de módulos
export function useLazyImport<T = any>(
  importFunc: () => Promise<T>,
  dependencies: any[] = []
) {
  const [state, setState] = useState<{
    loading: boolean
    data: T | null
    error: Error | null
  }>({
    loading: false,
    data: null,
    error: null,
  })

  const loadModule = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))
      const module = await importFunc()
      setState({ loading: false, data: module, error: null })
    } catch (error) {
      setState({ loading: false, data: null, error: error as Error })
    }
  }, dependencies)

  return {
    ...state,
    loadModule,
  }
}

// Componente para lazy loading con Intersection Observer
interface LazyLoadOnViewProps extends LazyComponentProps {
  component: LazyExoticComponent<ComponentType<any>>
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  [key: string]: any
}

export function LazyLoadOnView({
  component: Component,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  fallback,
  className,
  ...props
}: LazyLoadOnViewProps) {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (hasLoaded && triggerOnce) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          if (triggerOnce) {
            setHasLoaded(true)
            observer.disconnect()
          }
        } else if (!triggerOnce) {
          setIsInView(false)
        }
      },
      { threshold, rootMargin }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce, hasLoaded])

  if (!isInView && !hasLoaded) {
    return (
      <div ref={ref} className={className}>
        {fallback || <DefaultFallback className={className} />}
      </div>
    )
  }

  return (
    <div ref={ref} className={className}>
      <Suspense fallback={fallback || <DefaultFallback />}>
        <Component {...props} />
      </Suspense>
    </div>
  )
}

// Utilidades para crear componentes lazy comunes
export const createLazyComponent = {
  // Para componentes de dashboard
  dashboard: (importFunc: () => Promise<{ default: ComponentType<any> }>) =>
    withLazyLoading(importFunc, <ComponentSkeleton lines={5} />),

  // Para modales
  modal: (importFunc: () => Promise<{ default: ComponentType<any> }>) =>
    withLazyLoading(importFunc, <DefaultFallback />),

  // Para páginas completas
  page: (importFunc: () => Promise<{ default: ComponentType<any> }>) =>
    withLazyLoading(importFunc, <ComponentSkeleton lines={8} className="min-h-screen" />),

  // Para componentes de tabla
  table: (importFunc: () => Promise<{ default: ComponentType<any> }>) =>
    withLazyLoading(importFunc, <ComponentSkeleton lines={6} />),
} 