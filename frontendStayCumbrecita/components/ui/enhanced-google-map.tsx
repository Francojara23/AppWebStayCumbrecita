'use client';

import { useEffect, useRef, useState } from 'react';

interface EnhancedGoogleMapProps {
  address: string;
  latitud?: number;
  longitud?: number;
  hotelName?: string;
  className?: string;
}

// Coordenadas fallback de La Cumbrecita, Córdoba
const LA_CUMBRECITA_FALLBACK = {
  lat: -31.9167,
  lng: -64.7833
};

export default function EnhancedGoogleMap({ 
  address, 
  latitud, 
  longitud,
  hotelName,
  className = '' 
}: EnhancedGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [coordinateSource, setCoordinateSource] = useState<'database' | 'geocoding' | 'fallback'>('fallback');

  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps ya está cargado');
        resolve();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Error cargando Google Maps')));
        return;
      }

      console.log('📍 Cargando Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_GOOGLE_KEY}&v=weekly`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Google Maps script cargado exitosamente');
        resolve();
      };
      
      script.onerror = () => {
        console.error('❌ Error cargando Google Maps script');
        reject(new Error('Error cargando Google Maps'));
      };
      
      document.head.appendChild(script);
    });
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps?.Geocoder) {
        reject(new Error('Geocoder no disponible'));
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      console.log('🔍 Geocodificando dirección:', address);

      geocoder.geocode({ address }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const coords = {
            lat: location.lat(),
            lng: location.lng()
          };
          console.log('✅ Geocodificación exitosa:', coords);
          resolve(coords);
        } else {
          console.warn('⚠️ Geocodificación falló:', status);
          reject(new Error(`Geocoding falló: ${status}`));
        }
      });
    });
  };

  const determineCoordinates = async (): Promise<{ lat: number; lng: number }> => {
    // Debug: mostrar valores recibidos
    console.log('🔍 Debug coordenadas recibidas:', { 
      latitud, 
      longitud, 
      latitudType: typeof latitud, 
      longitudType: typeof longitud 
    });

    // Prioridad 1: Coordenadas de la base de datos
    if (latitud !== undefined && latitud !== null && 
        longitud !== undefined && longitud !== null) {
      
      // Convertir a números si vienen como string
      const lat = typeof latitud === 'string' ? parseFloat(latitud) : latitud;
      const lng = typeof longitud === 'string' ? parseFloat(longitud) : longitud;
      
      console.log('🔍 Coordenadas convertidas:', { lat, lng, originalLat: latitud, originalLng: longitud });
      
      if (typeof lat === 'number' && typeof lng === 'number' &&
          !isNaN(lat) && !isNaN(lng) &&
          isFinite(lat) && isFinite(lng)) {
        console.log('✅ Usando coordenadas de la base de datos:', { lat, lng });
        setCoordinateSource('database');
        return { lat, lng };
      } else {
        console.warn('⚠️ Coordenadas de BD inválidas, usando geocoding');
      }
    }

    // Prioridad 2: Geocoding de la dirección
    try {
      const geocodedCoords = await geocodeAddress(address);
      setCoordinateSource('geocoding');
      return geocodedCoords;
    } catch (error) {
      console.warn('⚠️ Geocoding falló, usando coordenadas fallback:', error);
    }

    // Prioridad 3: Fallback a coordenadas conocidas
    console.log('📍 Usando coordenadas fallback de La Cumbrecita');
    setCoordinateSource('fallback');
    return LA_CUMBRECITA_FALLBACK;
  };

  const initializeMap = async () => {
    try {
      console.log('🗺️ Inicializando mapa mejorado...');
      
      if (!mapRef.current) {
        throw new Error('Referencia del mapa no encontrada');
      }

      if (!window.google?.maps) {
        throw new Error('Google Maps no disponible');
      }

      // Determinar coordenadas a usar
      const coords = await determineCoordinates();
      setCoordinates(coords);

      // Validar coordenadas antes de crear el mapa
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number' ||
          isNaN(coords.lat) || isNaN(coords.lng) || 
          !isFinite(coords.lat) || !isFinite(coords.lng)) {
        throw new Error(`Coordenadas inválidas: ${JSON.stringify(coords)}`);
      }

      console.log('🗺️ Creando mapa con coordenadas validadas:', coords);

      // Crear mapa
      const map = new window.google.maps.Map(mapRef.current, {
        center: coords,
        zoom: 15,
        mapTypeId: (window.google.maps.MapTypeId as any).ROADMAP,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      // Crear marcador
      const marker = new window.google.maps.Marker({
        position: coords,
        map: map,
        title: hotelName || 'Ubicación del hospedaje',
        icon: {
          url: '/icons/map-pin.svg',
          scaledSize: new window.google.maps.Size(32, 32),
        }
      });

      // Info window con información de la fuente de coordenadas
      const getSourceText = () => {
        switch (coordinateSource) {
          case 'database':
            return 'Ubicación exacta';
          case 'geocoding':
            return 'Ubicación aproximada';
          case 'fallback':
            return 'Ubicación de referencia';
          default:
            return 'Ubicación del hospedaje';
        }
      };

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: bold;">
              ${hotelName || 'Hospedaje'}
            </h3>
            <p style="margin: 0 0 6px 0; color: #666; font-size: 14px;">
              ${address}
            </p>
            <p style="margin: 4px 0; color: #888; font-size: 12px;">
              ${getSourceText()}
            </p>
            ${coordinateSource === 'database' ? 
              '<p style="margin: 4px 0 0 0; color: #10b981; font-size: 12px; font-weight: 500;">✓ Ubicación verificada</p>' : 
              ''
            }
            <p style="margin: 6px 0 0 0; color: #999; font-size: 11px;">
              ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}
            </p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });

      setMapLoaded(true);
      console.log('✅ Mapa inicializado correctamente');

    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  useEffect(() => {
    const initMap = async () => {
      try {
        setError(null);
        console.log('🚀 Iniciando carga de mapa mejorado...');
        
        await loadGoogleMapsScript();
        await initializeMap();
        
      } catch (error) {
        console.error('❌ Error en initMap:', error);
        setError(error instanceof Error ? error.message : 'Error cargando el mapa');
      }
    };

    initMap();
  }, [address, latitud, longitud, hotelName]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}>
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.382 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error cargando el mapa</h3>
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <p className="text-xs text-gray-500">
            Verifica que la API de Google Maps esté habilitada
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ minHeight: '300px' }}
      />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Indicador de fuente de coordenadas */}
      {mapLoaded && coordinates && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs shadow-lg">
          {coordinateSource === 'database' && (
            <span className="text-green-600 font-medium">✓ Ubicación exacta</span>
          )}
          {coordinateSource === 'geocoding' && (
            <span className="text-blue-600 font-medium">📍 Geocodificado</span>
          )}
          {coordinateSource === 'fallback' && (
            <span className="text-orange-600 font-medium">📍 Aproximado</span>
          )}
        </div>
      )}
    </div>
  );
} 