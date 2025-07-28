'use client'

import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ImageIcon, Loader2 } from 'lucide-react'

interface LazyImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
  priority?: boolean
  quality?: number
  sizes?: string
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  fallbackSrc?: string
  onLoad?: () => void
  onError?: () => void
  lazy?: boolean
}

export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  priority = false,
  quality = 75,
  sizes,
  placeholder = 'empty',
  blurDataURL,
  fallbackSrc = '/images/placeholder.jpg',
  onLoad,
  onError,
  lazy = true,
  ...props
}: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageSrc, setImageSrc] = useState(src)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef<HTMLDivElement>(null)

  // Intersection Observer para lazy loading
  useEffect(() => {
    if (!lazy || isInView) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy, isInView])

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc)
      setHasError(false)
    } else {
      setHasError(true)
      setIsLoading(false)
    }
    onError?.()
  }

  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'bg-muted animate-pulse flex items-center justify-center',
          className
        )}
        style={{ width, height }}
      >
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  if (hasError) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center border border-border',
          className
        )}
        style={{ width, height }}
      >
        <div className="text-center p-4">
          <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Error al cargar imagen</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={imgRef} className={cn('relative overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center z-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      <Image
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        fill={fill}
        priority={priority}
        quality={quality}
        sizes={sizes}
        placeholder={placeholder}
        blurDataURL={blurDataURL}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100'
        )}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
} 