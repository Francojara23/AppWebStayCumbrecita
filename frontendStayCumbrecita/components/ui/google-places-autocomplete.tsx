"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import AddressInputFallback from "./address-input-fallback"

interface GooglePlacesAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  onPlaceSelected?: (place: google.maps.places.PlaceResult) => void
}

declare global {
  interface Window {
    initGooglePlaces?: () => void
  }
}

export default function GooglePlacesAutocomplete({
  value,
  onChange,
  placeholder = "Ingresa tu dirección",
  className,
  disabled = false,
  onPlaceSelected
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const isScriptLoaded = useRef(false)
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return

    try {
      // Limpiar autocompletado existente
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }

      // Crear nuevo autocompletado
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ar" },
        fields: ["address_components", "geometry", "formatted_address"],
        types: ["address"]
      })

      // Agregar listener para cuando se selecciona un lugar
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace()
        if (place && place.formatted_address) {
          onChange(place.formatted_address)
          onPlaceSelected?.(place)
        }
      })

      setHasError(false)
      setIsLoading(false)
      console.log("✅ Google Places Autocomplete initialized successfully")
    } catch (error) {
      console.error("❌ Error initializing Google Places Autocomplete:", error)
      setHasError(true)
      setIsLoading(false)
    }
  }, [onChange, onPlaceSelected])

  const loadGoogleMapsScript = useCallback(() => {
    if (isScriptLoaded.current || window.google?.maps?.places) {
      initializeAutocomplete()
      return
    }

    const apiKey = process.env.NEXT_PUBLIC_MAPS_API_GOOGLE_KEY
    if (!apiKey || apiKey === 'TU_API_KEY_AQUI') {
      console.error("🚨 Google Maps API key not configured properly!")
      console.error("Please set NEXT_PUBLIC_MAPS_API_GOOGLE_KEY in your .env.local file")
      setHasError(true)
      setIsLoading(false)
      return
    }

    console.log("🗺️ Loading Google Maps API...")

    // Verificar si ya existe un script de Google Maps
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log("Google Maps script already exists, waiting for load...")
      // Esperar a que se cargue
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(checkInterval)
          initializeAutocomplete()
        }
      }, 100)
      return
    }

    // Función global para inicializar después de cargar el script
    window.initGooglePlaces = () => {
      console.log("✅ Google Maps API loaded successfully")
      isScriptLoaded.current = true
      initializeAutocomplete()
    }

    // Crear y agregar el script - usando v=weekly para la API más reciente
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces&language=es&region=AR&v=weekly`
    script.async = true
    script.defer = true
    script.onerror = (error) => {
      console.error("❌ Error loading Google Maps API:", error)
      console.error("Check your API key and billing settings in Google Cloud Console")
      console.error("Make sure to enable Places API (New) instead of the legacy version")
      setHasError(true)
      setIsLoading(false)
    }

    document.head.appendChild(script)
  }, [initializeAutocomplete])

  useEffect(() => {
    loadGoogleMapsScript()

    // Timeout para detectar si la API no se carga
    const timeout = setTimeout(() => {
      if (!window.google?.maps?.places && !hasError) {
        console.warn("⏰ Google Maps API took too long to load, using fallback")
        setHasError(true)
        setIsLoading(false)
      }
    }, 10000) // 10 segundos

    return () => {
      clearTimeout(timeout)
      // Cleanup al desmontar
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
    }
  }, [loadGoogleMapsScript, hasError])

  // Reinicializar cuando se monta el input
  useEffect(() => {
    if (window.google?.maps?.places && inputRef.current) {
      initializeAutocomplete()
    }
  }, [initializeAutocomplete])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevenir envío del formulario con Enter cuando se está usando autocompletado
    if (e.key === "Enter") {
      e.preventDefault()
    }
  }

  // Si hay error o la API no está disponible, usar el componente de fallback
  if (hasError || (!isLoading && !window.google?.maps?.places)) {
    return (
      <AddressInputFallback
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
    )
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={cn(className)}
      disabled={disabled}
      autoComplete="off"
    />
  )
} 