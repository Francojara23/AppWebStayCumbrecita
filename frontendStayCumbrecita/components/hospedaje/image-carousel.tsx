"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Heart, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface HotelImageCarouselProps {
  images: string[]
}

export default function HotelImageCarousel({ images }: HotelImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isFavorite, setIsFavorite] = useState(false)
  const [autoplayTimeout, setAutoplayTimeout] = useState<NodeJS.Timeout | null>(null)

  const goToNext = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
  }, [images.length])

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length)
  }, [images.length])

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const pauseAutoplay = useCallback(() => {
    setIsAutoPlaying(false)
    if (autoplayTimeout) {
      clearTimeout(autoplayTimeout)
    }

    // Resume autoplay after 10 seconds of inactivity
    const timeout = setTimeout(() => {
      setIsAutoPlaying(true)
    }, 10000)

    setAutoplayTimeout(timeout)
  }, [autoplayTimeout])

  // Set up autoplay
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isAutoPlaying) {
      interval = setInterval(() => {
        goToNext()
      }, 5000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isAutoPlaying, goToNext])

  return (
    <div className="relative w-full h-[400px] md:h-[500px] overflow-hidden bg-gray-200">
      {/* Images */}
      {images.map((image, index) => (
        <div
          key={index}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            index === currentIndex ? "opacity-100" : "opacity-0",
          )}
        >
          <Image
            src={image || "/placeholder.svg"}
            alt={`Hotel image ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}

      {/* Overlay for better text visibility */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>

      {/* Navigation arrows */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
        onClick={() => {
          goToPrevious()
          pauseAutoplay()
        }}
        aria-label="Previous image"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
        onClick={() => {
          goToNext()
          pauseAutoplay()
        }}
        aria-label="Next image"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Favorite button */}
      <button
        className="absolute top-4 right-4 bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all"
        onClick={() => setIsFavorite(!isFavorite)}
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart className={cn("h-6 w-6", isFavorite ? "fill-red-500 text-red-500" : "text-gray-700")} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {images.map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex ? "bg-white w-4" : "bg-white bg-opacity-50",
            )}
            onClick={() => {
              goToSlide(index)
              pauseAutoplay()
            }}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
