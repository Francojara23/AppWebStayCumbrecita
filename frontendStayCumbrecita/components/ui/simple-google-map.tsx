'use client';

import { useEffect, useRef, useState } from 'react';

interface SimpleGoogleMapProps {
  address: string;
  className?: string;
}

// Coordenadas fijas de La Cumbrecita, Córdoba
const LA_CUMBRECITA_COORDS = {
  lat: -31.9167,
  lng: -64.7833
};

export default function SimpleGoogleMap({ address, className = '' }: SimpleGoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGoogleMapsScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Verificar si ya está cargado
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps ya está cargado');
        resolve();
        return;
      }

      // Verificar si el script ya existe
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Error cargando Google Maps')));
        return;
      }

      console.log('📍 Cargando Google Maps script (versión simplificada)...');
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

  const initializeMap = async () => {
    try {
      console.log('🗺️ Inicializando mapa simplificado...');
      
      if (!mapRef.current) {
        throw new Error('Referencia del mapa no encontrada');
      }

      if (!window.google?.maps) {
        throw new Error('Google Maps no disponible');
      }

      console.log('📍 Usando coordenadas fijas de La Cumbrecita:', LA_CUMBRECITA_COORDS);

      // Crear mapa
      const map = new window.google.maps.Map(mapRef.current, {
        center: LA_CUMBRECITA_COORDS,
        zoom: 15,
        mapTypeId: (window.google.maps.MapTypeId as any).ROADMAP,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      // Crear marcador
      const marker = new window.google.maps.Marker({
        position: LA_CUMBRECITA_COORDS,
        map: map,
        title: 'La Cumbrecita, Córdoba',
        icon: {
          url: '/icons/map-pin.svg',
          scaledSize: new window.google.maps.Size(32, 32),
        }
      });

      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">La Cumbrecita</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">Córdoba, Argentina</p>
            <p style="margin: 4px 0 0 0; color: #888; font-size: 12px;">${address}</p>
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
        console.log('🚀 Iniciando carga de mapa simplificado...');
        
        await loadGoogleMapsScript();
        await initializeMap();
        
      } catch (error) {
        console.error('❌ Error en initMap:', error);
        setError(error instanceof Error ? error.message : 'Error cargando el mapa');
      }
    };

    initMap();
  }, [address]);

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
            Verifica que la API de Google Maps esté habilitada en Google Cloud Console
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
            <p className="text-sm text-gray-600">Cargando mapa simplificado...</p>
          </div>
        </div>
      )}
    </div>
  );
} 