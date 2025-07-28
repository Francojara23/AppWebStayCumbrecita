"use client"

import Image from "next/image"
import Link from "next/link"
import { Star, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

// Definimos la interfaz para las propiedades
export interface PropertyCardProps {
  id: string // Cambiado a string para soportar UUIDs
  name: string
  location: string
  description: string
  price: number
  rating: number
  reviews: number
  image: string
  featured: boolean
}

export default function PropertyCard({ property }: { property: PropertyCardProps }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-[450px] flex flex-col">
      <div className="relative h-48">
        <Image 
          src={property.image || "/placeholder.svg"} 
          alt={property.name} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover" 
        />
        {property.featured && (
          <div className="absolute top-3 right-3 bg-[#A75719] text-white text-xs font-bold px-3 py-1 rounded-full">
            Destacado
          </div>
        )}
      </div>
      <CardContent className="pt-4 flex-grow">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg">{property.name}</h3>
          {/* Solo mostrar calificación si tiene opiniones reales */}
          {property.reviews > 0 && property.rating > 0 && (
            <div className="flex items-center bg-gray-100 px-2 py-1 rounded">
              <Star className="h-4 w-4 text-yellow-500 mr-1" />
              <span className="font-medium">{property.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 flex items-center mt-1">
          <MapPin className="h-4 w-4 mr-1" /> {property.location}
        </p>
        <p className="mt-2 text-sm text-gray-700">{property.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center mt-auto">
        <div>
          {property.price > 0 ? (
            <>
              <p className="text-sm text-gray-500">Desde</p>
              <p className="font-bold text-lg">${property.price.toLocaleString()} /noche</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">Precio</p>
              <p className="font-bold text-lg text-gray-400">Consultar</p>
            </>
          )}
        </div>
        <Link href={`/hospedaje/${property.id}`}>
          <Button className="bg-[#CD6C22] hover:bg-[#AD5C12]">Ver Detalles</Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
