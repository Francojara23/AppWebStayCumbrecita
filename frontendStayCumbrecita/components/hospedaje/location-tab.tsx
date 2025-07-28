import EnhancedGoogleMap from "@/components/ui/enhanced-google-map"

interface PointOfInterest {
  name: string
  distance: string
}

interface LocationTabProps {
  hotelName: string
  address: string
  latitud?: number
  longitud?: number
  directions: string
  pointsOfInterest: PointOfInterest[]
}

export default function LocationTab({ hotelName, address, latitud, longitud, directions, pointsOfInterest }: LocationTabProps) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Ubicación</h2>
      
      {/* Enhanced Google Map */}
      <div className="rounded-lg overflow-hidden">
        <EnhancedGoogleMap 
          address={address} 
          latitud={latitud}
          longitud={longitud}
          hotelName={hotelName}
          className="h-80" 
        />
      </div>
      
      <div className="mt-6">
        <h3 className="font-bold">Dirección</h3>
        <p className="text-gray-700">{address}</p>

        <h3 className="font-bold mt-4">Cómo llegar</h3>
        <p className="text-gray-700">{directions}</p>

        {pointsOfInterest.length > 0 && (
          <>
            <h3 className="font-bold mt-4">Puntos de interés cercanos</h3>
            <ul className="list-disc list-inside text-gray-700">
              {pointsOfInterest.map((point, index) => (
                <li key={index}>
                  {point.name} ({point.distance})
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
