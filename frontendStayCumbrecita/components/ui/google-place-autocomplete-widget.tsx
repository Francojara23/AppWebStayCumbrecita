"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'

// Tipos para el componente
interface GooglePlaceAutocompleteWidgetProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

interface PlacePrediction {
  text: string
  placeId: string
  placePrediction: any
}

// Extender Window para incluir la función de callback
declare global {
  interface Window {
    initGooglePlaceAutocomplete?: () => void
  }
}

let globalInitialized = false

export default function GooglePlaceAutocompleteWidget({
  value = "",
  onChange,
  placeholder = "Busca una dirección...",
  className
}: GooglePlaceAutocompleteWidgetProps) {
  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const isMountedRef = useRef(true)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTokenRef = useRef<any>(null)
  const newestRequestIdRef = useRef(0)

  // Crear o refrescar session token
  const refreshSessionToken = useCallback(() => {
    if ((window as any).google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new (window as any).google.maps.places.AutocompleteSessionToken()
      console.log('🔄 Session token creado/refrescado')
    }
  }, [])

  // Función para obtener predicciones usando AutocompleteSuggestion
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 2) {
      setPredictions([])
      setShowDropdown(false)
      return
    }

    if (!isGoogleMapsLoaded || !(window as any).google?.maps?.places?.AutocompleteSuggestion) {
      console.log('⏳ Google Maps aún no está cargado')
      return
    }

    console.log('🔍 Buscando predicciones para:', input)

    try {
      setIsLoading(true)
      
      // Crear session token si no existe
      if (!sessionTokenRef.current) {
        refreshSessionToken()
      }

      // Configurar request para la nueva API
      const request = {
        input: input,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['AR'],
        includedPrimaryTypes: ['street_address', 'route', 'premise', 'establishment']
      }

      // Incrementar ID de request para evitar race conditions
      const requestId = ++newestRequestIdRef.current

      console.log('📤 Enviando request:', request)

      // Realizar la búsqueda con la nueva API
      const { suggestions } = await (window as any).google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)

      // Verificar si este request es el más reciente
      if (requestId !== newestRequestIdRef.current) {
        console.log('🚫 Request obsoleto, ignorando resultados')
        return
      }

      console.log('📥 Respuesta recibida:', suggestions)

      if (isMountedRef.current) {
        if (suggestions && suggestions.length > 0) {
          const formattedPredictions = suggestions.slice(0, 5).map((suggestion: any) => ({
            text: suggestion.placePrediction.text.text || suggestion.placePrediction.text,
            placeId: suggestion.placePrediction.placeId,
            placePrediction: suggestion.placePrediction
          }))

          console.log('✅ Predicciones formateadas:', formattedPredictions)
          setPredictions(formattedPredictions)
          setShowDropdown(true)
        } else {
          console.log('❌ No se encontraron predicciones')
          setPredictions([])
          setShowDropdown(false)
        }
      }
    } catch (error) {
      console.error('❌ Error al obtener predicciones:', error)
      setPredictions([])
      setShowDropdown(false)
    } finally {
      setIsLoading(false)
    }
  }, [isGoogleMapsLoaded, refreshSessionToken])

  // Manejar cambios en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange?.(newValue)

    // Debounce para las predicciones
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchPredictions(newValue)
    }, 300)
  }

  // Manejar selección de predicción
  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    try {
      console.log('📍 Lugar seleccionado:', prediction)
      
      // Intentar obtener detalles del lugar
      try {
        const place = prediction.placePrediction.toPlace()
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location']
        })

        console.log('✅ Detalles del lugar:', {
          displayName: place.displayName,
          formattedAddress: place.formattedAddress,
          location: place.location
        })

        const selectedAddress = place.formattedAddress || place.displayName || prediction.text
        setInputValue(selectedAddress)
        onChange?.(selectedAddress)
      } catch (placeError) {
        console.log('⚠️ No se pudieron obtener detalles, usando texto de predicción')
        // Fallback: usar el texto de la predicción directamente
        setInputValue(prediction.text)
        onChange?.(prediction.text)
      }
      
      setShowDropdown(false)
      setPredictions([])
      
      // Refrescar session token después de la selección
      refreshSessionToken()
      
      inputRef.current?.focus()
    } catch (error) {
      console.error('❌ Error al procesar selección:', error)
      // Fallback: usar el texto de la predicción
      setInputValue(prediction.text)
      onChange?.(prediction.text)
      setShowDropdown(false)
      setPredictions([])
    }
  }

  // Manejar blur del input
  const handleInputBlur = () => {
    // Pequeño delay para permitir clics en las predicciones
    setTimeout(() => {
      setShowDropdown(false)
    }, 150)
  }

  // Función de inicialización global
  useEffect(() => {
    isMountedRef.current = true

    if (!globalInitialized) {
      window.initGooglePlaceAutocomplete = () => {
        console.log('✅ Google Maps cargado correctamente')
        setIsGoogleMapsLoaded(true)
      }
      globalInitialized = true
    }

    // Verificar si Google Maps ya está cargado
    if ((window as any).google?.maps?.places?.AutocompleteSuggestion) {
      console.log('🔍 Google Maps AutocompleteSuggestion ya disponible')
      setIsGoogleMapsLoaded(true)
    } else {
      console.log('⏳ Cargando Google Maps...')
      
      // Cargar script si no existe
      if (!document.querySelector('script[src*="maps.googleapis.com"]')) {
        const script = document.createElement('script')
        const apiKey = process.env.NEXT_PUBLIC_MAPS_API_GOOGLE_KEY || process.env.NEXT_PUBLIC_GMAPS_KEY
        
        console.log('🔑 API Key encontrada:', apiKey ? 'Sí' : 'No')
        
        if (!apiKey) {
          console.error('❌ No se encontró la clave de API de Google Maps')
          return
        }

        // Usar la nueva API con la URL correcta
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&callback=initGooglePlaceAutocomplete&v=3.56`
        script.async = true
        script.defer = true
        script.onerror = () => {
          console.error('❌ Error al cargar Google Maps JavaScript API')
        }

        document.head.appendChild(script)
        console.log('📂 Script de Google Maps agregado con URL:', script.src)
      }
    }

    return () => {
      isMountedRef.current = false
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  // Crear session token cuando Google Maps esté listo
  useEffect(() => {
    if (isGoogleMapsLoaded) {
      refreshSessionToken()
    }
  }, [isGoogleMapsLoaded, refreshSessionToken])

  // Sincronizar con prop value
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
    }
  }, [value, inputValue])

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => {
          if (predictions.length > 0) {
            setShowDropdown(true)
          }
        }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      
      {/* Indicador de estado de carga */}
      {!isGoogleMapsLoaded && (
        <div className="absolute right-3 top-3 text-xs text-gray-400">
          Cargando...
        </div>
      )}
      
      {/* Dropdown de predicciones */}
      {showDropdown && (predictions.length > 0 || isLoading) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">
              Buscando direcciones...
            </div>
          ) : (
            predictions.map((prediction, index) => (
              <div
                key={prediction.placeId}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                onClick={() => handlePredictionSelect(prediction)}
                onMouseDown={(e) => e.preventDefault()} // Prevenir blur del input
              >
                <div className="font-medium text-gray-900">
                  {prediction.text}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
} 