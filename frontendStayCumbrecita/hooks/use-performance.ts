import { useState, useEffect, useCallback, useRef, useMemo } from 'react'

// Hook para debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Hook para throttle
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value)
  const lastRan = useRef<number>(Date.now())

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value)
        lastRan.current = Date.now()
      }
    }, limit - (Date.now() - lastRan.current))

    return () => {
      clearTimeout(handler)
    }
  }, [value, limit])

  return throttledValue
}

// Hook para lazy state - solo se inicializa cuando se necesita
export function useLazyState<T>(
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const [isInitialized, setIsInitialized] = useState(false)
  const [state, setState] = useState<T>(() => {
    if (typeof initialValue === 'function') {
      return (initialValue as () => T)()
    }
    return initialValue
  })

  const setStateWrapper = useCallback((value: React.SetStateAction<T>) => {
    if (!isInitialized) {
      setIsInitialized(true)
    }
    setState(value)
  }, [isInitialized])

  return [state, setStateWrapper, isInitialized]
}

// Hook para memoizar valores computados costosos
export function useExpensiveComputation<T>(
  computeFn: () => T,
  deps: React.DependencyList
): T {
  return useMemo(computeFn, deps)
}

// Hook para previous value
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}

// Hook para detectar cambios en el valor
export function useDidValueChange<T>(value: T): boolean {
  const previous = usePrevious(value)
  return previous !== value
}

// Hook para performance monitoring
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>(0)
  const [metrics, setMetrics] = useState<{
    name: string
    duration?: number
    memory?: number
  }>({ name })

  const start = useCallback(() => {
    startTime.current = performance.now()
  }, [])

  const end = useCallback(() => {
    const duration = performance.now() - startTime.current
    const memory = (performance as any).memory?.usedJSHeapSize || 0
    
    setMetrics({
      name,
      duration,
      memory,
    })

    // Log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance [${name}]:`, {
        duration: `${duration.toFixed(2)}ms`,
        memory: `${(memory / 1024 / 1024).toFixed(2)}MB`,
      })
    }
  }, [name])

  return { metrics, start, end }
}

// Hook para intersection observer optimizado
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref, options.threshold, options.rootMargin])

  return { isIntersecting, entry }
}

// Hook para resize observer
export function useResizeObserver(
  ref: React.RefObject<Element>
) {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    if (!ref.current) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref])

  return size
}

// Hook para optimizar re-renders con callback memoization
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps)
}

// Hook para batch updates
export function useBatchUpdates() {
  const [updates, setUpdates] = useState<Array<() => void>>([])
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const batchUpdate = useCallback((updateFn: () => void) => {
    setUpdates(prev => [...prev, updateFn])

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setUpdates(currentUpdates => {
        // Ejecutar todas las actualizaciones en batch
        currentUpdates.forEach(fn => fn())
        return []
      })
    }, 0)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return batchUpdate
}

// Hook para virtual scrolling básico
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    }
  }, [items, itemHeight, containerHeight, scrollTop])

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return {
    ...visibleItems,
    handleScroll,
  }
} 