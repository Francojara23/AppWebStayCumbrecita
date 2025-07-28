'use client';

import { useEffect, useRef, useState } from 'react';

interface GooglePlacesMapProps {
  hotelName: string;
  address: string;
  latitud?: number;
  longitud?: number;
  className?: string;
}

// Coordenadas fallback de La Cumbrecita, Córdoba
const LA_CUMBRECITA_FALLBACK = {
  lat: -31.9167,
  lng: -64.7833
};

interface PlaceInfo {
  name: string;
  formattedAddress: string;
  location: { lat: number; lng: number };
  placeId: string;
  rating?: number;
  userRatingsTotal?: number;
  website?: string;
  phoneNumber?: string;
  photos?: string[];
}

export default function GooglePlacesMap({ 
  hotelName, 
  address, 
  latitud, 
  longitud, 
  className = '' 
}: GooglePlacesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [coordinateSource, setCoordinateSource] = useState<'places' | 'database' | 'geocoding' | 'fallback'>('fallback');

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

      console.log('📍 Cargando Google Maps script con Places API...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_MAPS_API_GOOGLE_KEY}&libraries=places,geometry&v=weekly`;
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

  const searchPlaceByName = async (hotelName: string, address: string): Promise<PlaceInfo | null> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places?.PlacesService) {
        console.warn('⚠️ Places Service no disponible');
        resolve(null);
        return;
      }

      // Crear un mapa temporal para el service
      const tempDiv = document.createElement('div');
      const tempMap = new window.google.maps.Map(tempDiv);
      const service = new window.google.maps.places.PlacesService(tempMap as any);

      // Buscar por nombre del hotel + La Cumbrecita
      const query = `${hotelName} La Cumbrecita Córdoba Argentina`;
      console.log('🔍 Buscando lugar:', query);

      const request = {
        query,
        fields: [
          'place_id', 'name', 'formatted_address', 'geometry', 'rating', 
          'user_ratings_total', 'website', 'formatted_phone_number', 'photos'
        ]
      };

      service.textSearch(request, (results: any, status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          const place = results[0];
          console.log('✅ Lugar encontrado:', place);

          const placeInfo: PlaceInfo = {
            name: place.name,
            formattedAddress: place.formatted_address,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            placeId: place.place_id,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            website: place.website,
            phoneNumber: place.formatted_phone_number,
            photos: place.photos?.slice(0, 3).map((photo: any) => 
              photo.getUrl({ maxWidth: 400, maxHeight: 400 })
            )
          };

          resolve(placeInfo);
        } else {
          console.warn('⚠️ No se encontró el lugar:', status);
          resolve(null);
        }
      });
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
    console.log('🔍 Determinando coordenadas para:', { hotelName, address, latitud, longitud });

    // Prioridad 1: Buscar en Google Places por nombre del hotel
    try {
      const place = await searchPlaceByName(hotelName, address);
      if (place) {
        console.log('✅ Usando coordenadas de Google Places:', place.location);
        setPlaceInfo(place);
        setCoordinateSource('places');
        return place.location;
      }
    } catch (error) {
      console.warn('⚠️ Búsqueda en Places falló:', error);
    }

    // Prioridad 2: Coordenadas de la base de datos
    if (latitud !== undefined && latitud !== null && 
        longitud !== undefined && longitud !== null) {
      
      const lat = typeof latitud === 'string' ? parseFloat(latitud) : latitud;
      const lng = typeof longitud === 'string' ? parseFloat(longitud) : longitud;
      
      if (typeof lat === 'number' && typeof lng === 'number' &&
          !isNaN(lat) && !isNaN(lng) &&
          isFinite(lat) && isFinite(lng)) {
        console.log('✅ Usando coordenadas de la base de datos:', { lat, lng });
        setCoordinateSource('database');
        return { lat, lng };
      }
    }

    // Prioridad 3: Geocoding de la dirección
    try {
      const geocodedCoords = await geocodeAddress(address);
      setCoordinateSource('geocoding');
      return geocodedCoords;
    } catch (error) {
      console.warn('⚠️ Geocoding falló:', error);
    }

    // Prioridad 4: Fallback a coordenadas conocidas
    console.log('📍 Usando coordenadas fallback de La Cumbrecita');
    setCoordinateSource('fallback');
    return LA_CUMBRECITA_FALLBACK;
  };

  const initializeMap = async () => {
    try {
      console.log('🗺️ Inicializando mapa con Places API...');
      
      if (!mapRef.current) {
        throw new Error('Referencia del mapa no encontrada');
      }

      if (!window.google?.maps) {
        throw new Error('Google Maps no disponible');
      }

      // Determinar coordenadas a usar
      const coords = await determineCoordinates();

      // Validar coordenadas
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
        title: placeInfo?.name || hotelName,
        icon: {
          url: '/icons/map-pin.svg',
          scaledSize: new window.google.maps.Size(32, 32),
        }
      });

      // Info window con información del lugar
      const getInfoContent = () => {
        if (placeInfo) {
          return `
            <div style="padding: 12px; min-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: bold;">
                ${placeInfo.name}
              </h3>
              <p style="margin: 0 0 6px 0; color: #666; font-size: 14px;">
                ${placeInfo.formattedAddress}
              </p>
              ${placeInfo.rating ? `
                <div style="margin: 6px 0; color: #f59e0b; font-size: 14px;">
                  ⭐ ${placeInfo.rating}/5 (${placeInfo.userRatingsTotal || 0} reseñas)
                </div>
              ` : ''}
              ${placeInfo.phoneNumber ? `
                <p style="margin: 4px 0; color: #059669; font-size: 12px;">
                  📞 ${placeInfo.phoneNumber}
                </p>
              ` : ''}
              ${placeInfo.website ? `
                <p style="margin: 4px 0; font-size: 12px;">
                  <a href="${placeInfo.website}" target="_blank" style="color: #2563eb;">
                    🌐 Sitio web
                  </a>
                </p>
              ` : ''}
              <p style="margin: 8px 0 0 0; color: #10b981; font-size: 12px;">
                ✓ Información verificada por Google
              </p>
            </div>
          `;
        } else {
          const sourceText = coordinateSource === 'database' ? 'Ubicación guardada' :
                           coordinateSource === 'geocoding' ? 'Ubicación aproximada' :
                           'Ubicación de referencia - La Cumbrecita';
          
          return `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">${hotelName}</h3>
              <p style="margin: 0; color: #666; font-size: 14px;">${address}</p>
              <p style="margin: 4px 0 0 0; color: #888; font-size: 12px;">
                ${sourceText}
              </p>
            </div>
          `;
        }
      };

      const infoWindow = new window.google.maps.InfoWindow({
        content: getInfoContent()
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
        console.log('🚀 Iniciando mapa con Places API...');
        
        await loadGoogleMapsScript();
        await initializeMap();
        
      } catch (error) {
        console.error('❌ Error en initMap:', error);
        setError(error instanceof Error ? error.message : 'Error cargando el mapa');
      }
    };

    initMap();
  }, [hotelName, address, latitud, longitud]);

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
            <p className="text-sm text-gray-600">Buscando ubicación del hotel...</p>
          </div>
        </div>
      )}

      {/* Indicador de fuente de coordenadas */}
      {mapLoaded && (
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-xs shadow-lg">
          {coordinateSource === 'places' && (
            <span className="text-green-600 font-medium">✓ Google Places</span>
          )}
          {coordinateSource === 'database' && (
            <span className="text-blue-600 font-medium">💾 Base de datos</span>
          )}
          {coordinateSource === 'geocoding' && (
            <span className="text-orange-600 font-medium">📍 Geocodificado</span>
          )}
          {coordinateSource === 'fallback' && (
            <span className="text-gray-600 font-medium">📍 Aproximado</span>
          )}
        </div>
      )}

      {/* Información del lugar encontrado */}
      {mapLoaded && placeInfo && (
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs shadow-lg max-w-xs">
          <div className="font-medium text-green-600">📍 {placeInfo.name}</div>
          {placeInfo.rating && (
            <div className="text-orange-500">⭐ {placeInfo.rating}/5</div>
          )}
        </div>
      )}
    </div>
  );
} 