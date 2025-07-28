"use client"

import { useEffect, useRef, useState } from "react"

interface GoogleMapProps {
  address: string
  className?: string
  height?: string
}

// Función para cargar el script de Google Maps si no está cargado
const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log('🔍 Checking Google Maps API status...')
    
    // Si ya está cargado, resolver inmediatamente
    if (window.google?.maps) {
      console.log('✅ Google Maps API already loaded')
      resolve()
      return
    }

    // Si ya existe el script, esperar a que se cargue
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      console.log('⏳ Google Maps script exists, waiting for load...')
      let attempts = 0
      const maxAttempts = 50 // 5 segundos
      const checkInterval = setInterval(() => {
        attempts++
        if (window.google?.maps) {
          console.log('✅ Google Maps API loaded successfully')
          clearInterval(checkInterval)
          resolve()
        } else if (attempts >= maxAttempts) {
          console.error('❌ Timeout waiting for Google Maps API')
          clearInterval(checkInterval)
          reject(new Error('Timeout waiting for Google Maps API'))
        }
      }, 100)
      return
    }

    // Crear el script
    const script = document.createElement('script')
    const apiKey = process.env.NEXT_PUBLIC_MAPS_API_GOOGLE_KEY

    if (!apiKey) {
      console.error('❌ Google Maps API key not found')
      console.error('Environment variables:', { apiKey: process.env.NEXT_PUBLIC_MAPS_API_GOOGLE_KEY })
      reject(new Error('Google Maps API key not configured'))
      return
    }

    console.log('🗺️ Loading Google Maps API with key:', apiKey.substring(0, 10) + '...')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&language=es&region=AR&v=weekly`
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.log('✅ Google Maps script loaded')
      // Dar un pequeño tiempo para que se inicialice completamente
      setTimeout(() => {
        if (window.google?.maps) {
          console.log('✅ Google Maps API fully initialized')
          resolve()
        } else {
          console.error('❌ Google Maps API not available after script load')
          reject(new Error('Google Maps API not available after script load'))
        }
      }, 100)
    }
    
    script.onerror = (error) => {
      console.error('❌ Error loading Google Maps script:', error)
      reject(new Error('Failed to load Google Maps script'))
    }

    document.head.appendChild(script)
    console.log('📂 Google Maps script added to document head')
  })
}

export default function GoogleMap({ address, className, height = "400px" }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Función para geocodificar la dirección
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    console.log('🔍 Starting geocoding for:', address)
    
    if (!window.google?.maps) {
      console.error('❌ Google Maps not available for geocoding')
      return null
    }

    if (!window.google?.maps?.Geocoder) {
      console.error('❌ Geocoder not available')
      return null
    }

    const geocoder = new google.maps.Geocoder()
    console.log('✅ Geocoder instance created')
    
    try {
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        console.log('📍 Sending geocoding request...')
        geocoder.geocode(
          { 
            address: address,
            region: 'AR', // Restringir a Argentina
            componentRestrictions: { country: 'AR' }
          },
          (results, status) => {
            console.log('📍 Geocoding response:', { status, results })
            if (status === 'OK' && results) {
              console.log('✅ Geocoding successful')
              resolve(results)
            } else {
              console.error(`❌ Geocoding failed with status: ${status}`)
              reject(new Error(`Geocoding failed: ${status}`))
            }
          }
        )
      })

      if (result && result.length > 0) {
        const location = result[0].geometry.location
        const coordinates = {
          lat: location.lat(),
          lng: location.lng()
        }
        console.log('📍 Extracted coordinates:', coordinates)
        return coordinates
      }
      
      console.error('❌ No results found in geocoding response')
      return null
    } catch (error) {
      console.error('❌ Error geocoding address:', error)
      return null
    }
  }

  // Función para inicializar el mapa
  const initializeMap = async () => {
    console.log('🗺️ Initializing map for address:', address)
    
    if (!mapRef.current) {
      console.error('❌ Map container ref not available')
      return
    }
    
    if (!address) {
      console.error('❌ No address provided')
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      console.log('📍 Starting map initialization process...')

      // Cargar Google Maps si no está cargado
      console.log('⏳ Loading Google Maps script...')
      await loadGoogleMapsScript()
      console.log('✅ Google Maps script loaded successfully')

      // Geocodificar la dirección
      console.log('🔍 Geocoding address:', address)
      const coordinates = await geocodeAddress(address)
      
      if (!coordinates) {
        console.error('❌ Failed to geocode address:', address)
        setError('No se pudo encontrar la ubicación de la dirección proporcionada')
        setIsLoading(false)
        return
      }
      
      console.log('📍 Coordinates found:', coordinates)

      // Configuración del mapa
      const mapOptions: google.maps.MapOptions = {
        center: coordinates,
        zoom: 16,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "on" }]
          }
        ]
      }

      // Crear el mapa
      console.log('🗺️ Creating map instance...')
      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions)
      console.log('✅ Map instance created')

      // Crear el marcador
      console.log('📌 Creating marker...')
      markerRef.current = new google.maps.Marker({
        position: coordinates,
        map: mapInstanceRef.current,
        title: address,
        animation: google.maps.Animation.DROP,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new google.maps.Size(32, 32)
        }
      })
      console.log('✅ Marker created')

      // Crear una ventana de información para el marcador
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 250px;">
            <h4 style="margin: 0 0 8px 0; font-weight: bold; color: #1f2937;">Ubicación del hospedaje</h4>
            <p style="margin: 0; color: #4b5563; font-size: 14px;">${address}</p>
          </div>
        `
      })

      // Mostrar la ventana de información al hacer clic en el marcador
      markerRef.current.addListener('click', () => {
        infoWindow.open(mapInstanceRef.current!, markerRef.current!)
      })

      setIsLoading(false)
      console.log('✅ Map initialized successfully with coordinates:', coordinates)
    } catch (error) {
      console.error('❌ Error initializing map:', error)
      setError(`Error al cargar el mapa: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      setIsLoading(false)
    }
  }

  // Efecto para inicializar el mapa cuando cambie la dirección
  useEffect(() => {
    if (address) {
      initializeMap()
    }

    // Cleanup al desmontar
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null
      }
    }
  }, [address])

  // Render del componente
  if (isLoading) {
    return (
      <div 
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Cargando mapa...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div 
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    />
  )
} 