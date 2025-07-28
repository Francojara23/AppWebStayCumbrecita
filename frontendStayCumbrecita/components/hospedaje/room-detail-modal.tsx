"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Wifi, Coffee, Wind, Tv, Bath, Users } from "lucide-react"
import { useServiciosHabitacion } from "@/hooks/use-api"

// Tipo para los servicios de la habitación
type RoomService = {
  name: string
  icon: string
}

// Tipo para la habitación
export type RoomType = {
  id: string
  name: string
  description: string
  capacity: number
  price: number
  available: number
  image: string
  services?: RoomService[]
  images?: string[]
  descripcionLarga?: string
  isAvailable?: boolean // Flag para indicar si está disponible en fechas específicas
  unavailableReason?: 'dates' | 'capacity' | 'dates_and_capacity' | null // Motivo específico de no disponibilidad
}

// Tipo para los servicios de habitación que vienen del backend
interface ServicioHabitacion {
  id: string
  servicio: {
    id: string
    nombre: string
    descripcion: string
    icono?: string
    tipo: string
  }
  precioExtra: string
  observaciones?: string
}

interface RoomDetailModalProps {
  room: RoomType | null
  isOpen: boolean
  onClose: () => void
  onReserve: (roomId: string) => void
  initialQuantity?: number
}

export default function RoomDetailModal({
  room,
  isOpen,
  onClose,
  onReserve,
  initialQuantity = 1,
}: RoomDetailModalProps) {
  const [quantity, setQuantity] = useState(initialQuantity)

  // 🔥 NUEVA FUNCIONALIDAD: Obtener servicios reales de la habitación
  const { data: servicios, isLoading: isLoadingServicios } = useServiciosHabitacion(room?.id || '')

  // Actualizar la cantidad cuando cambie initialQuantity
  useEffect(() => {
    if (room) {
      setQuantity(initialQuantity)
    }
  }, [initialQuantity, room])

  // Si no hay habitación seleccionada, no mostramos el contenido pero mantenemos el componente
  if (!room) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Cargando...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  // Imágenes de la habitación
  const roomImages = room.images || [
    room.image,
    "/mountain-cabin-retreat.png",
    "/alpine-vista-retreat.png",
    "/forest-cabin-retreat.png",
  ]

  // 🔥 NUEVA LÓGICA: Mapear servicios reales del backend
  const roomServices = servicios && servicios.length > 0
    ? (servicios as unknown as ServicioHabitacion[]).map(servicioItem => ({
        name: servicioItem.servicio.nombre,
        icon: servicioItem.servicio.icono || 'Settings'
      }))
    : [
        { name: "Wi-Fi gratis", icon: "Wifi" },
        { name: "Desayuno incluido", icon: "Coffee" },
        { name: "Aire acondicionado", icon: "Wind" },
        { name: "TV de pantalla plana", icon: "Tv" },
        { name: "Baño privado", icon: "Bath" },
      ]

  // Función para renderizar el icono correcto según el nombre
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "Wifi":
        return <Wifi className="h-5 w-5 text-[#C84A31]" />
      case "Coffee":
        return <Coffee className="h-5 w-5 text-[#C84A31]" />
      case "Wind":
        return <Wind className="h-5 w-5 text-[#C84A31]" />
      case "Tv":
        return <Tv className="h-5 w-5 text-[#C84A31]" />
      case "Bath":
        return <Bath className="h-5 w-5 text-[#C84A31]" />
      default:
        return <Wifi className="h-5 w-5 text-[#C84A31]" />
    }
  }

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1)
    }
  }

  const increaseQuantity = () => {
    if (quantity < room.available) {
      setQuantity(quantity + 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{room.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="details" className="flex-1">
              Descripción y servicios
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">
              Fotos
            </TabsTrigger>
          </TabsList>

          {/* Pestaña de Descripción y Servicios */}
          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="relative h-48 md:h-64 w-full rounded-lg overflow-hidden">
                  <Image src={room.image || "/placeholder.svg"} alt={room.name} fill className="object-cover" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-2">{room.name}</h3>
                <div className="flex items-center mb-2">
                  <Users className="h-5 w-5 text-gray-600 mr-2" />
                  <span>Capacidad: {room.capacity} personas</span>
                </div>
                <p className="text-gray-700 mb-4">
                  {room.description}
                </p>
                <div className="text-2xl font-bold text-[#CD6C22]">
                  ${new Intl.NumberFormat('es-AR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  }).format(room.price)} / noche
                </div>
                <div className="text-sm text-gray-500 mb-4">Disponibles: {room.available} habitaciones</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">
                Servicios de la habitación
                {isLoadingServicios && <span className="text-sm text-gray-500 ml-2">(Cargando...)</span>}
              </h3>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roomServices.map((service, index) => (
                    <div key={index} className="flex items-center">
                      {renderIcon(service.icon)}
                      <span className="ml-2 text-sm">{service.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <span className="mr-3">Cantidad:</span>
                  <div className="flex items-center border rounded">
                    <button
                      className="px-3 py-1 border-r hover:bg-gray-100"
                      onClick={decreaseQuantity}
                      disabled={quantity <= 1}
                    >
                      −
                    </button>
                    <span className="px-4 py-1">{quantity}</span>
                    <button
                      className="px-3 py-1 border-l hover:bg-gray-100"
                      onClick={increaseQuantity}
                      disabled={quantity >= room.available}
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button className="bg-[#CD6C22] hover:bg-[#A83921]" onClick={() => onReserve(room.id)}>
                  Reservar ahora
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Pestaña de Fotos */}
          <TabsContent value="photos">
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roomImages.map((image, index) => (
                  <div key={index} className="relative h-48 rounded-lg overflow-hidden">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`${room.name} - Imagen ${index + 1}`}
                      fill
                      className="object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
