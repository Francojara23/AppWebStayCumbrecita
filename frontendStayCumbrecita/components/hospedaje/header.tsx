import { Star, MapPin } from "lucide-react"

interface HotelHeaderProps {
  name: string
  rating?: number | null
  reviewCount: number
  location: string
  price: number
  className?: string
}

// Función para formatear precios en formato argentino
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

export default function HotelHeader({ name, rating, reviewCount, location, price, className = "" }: HotelHeaderProps) {
  return (
    <div className={`flex flex-col md:flex-row md:justify-between md:items-start mb-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold">{name}</h1>
        <div className="flex items-center mt-2">
          {rating && rating > 0 && reviewCount > 0 && (
            <>
              <div className="flex items-center text-yellow-500">
                <Star className="h-5 w-5 fill-yellow-400" />
                <span className="ml-1 font-bold">{rating.toFixed(1)}</span>
              </div>
              <span className="text-gray-500 ml-2">({reviewCount} reseñas)</span>
            </>
          )}
          <div className={`flex items-center text-gray-600 ${rating && rating > 0 && reviewCount > 0 ? 'ml-4' : ''}`}>
            <MapPin className="h-4 w-4 mr-1" />
            <span>{location}</span>
          </div>
        </div>
      </div>
      <div className="mt-4 md:mt-0 text-right">
        <div className="text-gray-500">Desde</div>
        <div className="text-3xl font-bold">${formatPrice(price)}</div>
        <div className="text-sm text-gray-500">por noche</div>
      </div>
    </div>
  )
}
