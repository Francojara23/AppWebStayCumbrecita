"use client"

import { useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import RoomDetailModal, { type RoomType } from "@/components/hospedaje/room-detail-modal"

interface RoomsTabProps {
  rooms: RoomType[]
  roomQuantities: { [key: string]: number }
  setRoomQuantities: (quantities: { [key: string]: number }) => void
  handleRoomReservation: (roomId: string) => void
  handleRoomSelection: (roomId: string) => void
  selectedRoomIds: string[]
  isLoadingDisponibilidad?: boolean
  requiredGuests?: number
}

export default function RoomsTab({ rooms, roomQuantities, setRoomQuantities, handleRoomReservation, handleRoomSelection, selectedRoomIds, isLoadingDisponibilidad, requiredGuests }: RoomsTabProps) {
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const openRoomDetails = (room: RoomType) => {
    setSelectedRoom(room)
    setIsModalOpen(true)
  }

  const closeRoomDetails = () => {
    setIsModalOpen(false)
  }

  const handleReserveRoom = (roomId: string) => {
    handleRoomReservation(roomId)
    setIsModalOpen(false)
  }

  const updateQuantity = (roomId: string, quantity: number) => {
    setRoomQuantities({
      ...roomQuantities,
      [roomId]: quantity,
    })
  }

  return (
    <div className="space-y-6">
      {isLoadingDisponibilidad && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-blue-800 text-sm">Verificando disponibilidad de habitaciones para las fechas seleccionadas...</span>
          </div>
        </div>
      )}
      {rooms.map((room) => (
        <div key={room.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Imagen */}
            <div className="relative h-48 md:h-full">
              <Image src={room.image || "/placeholder.svg"} alt={room.name} fill className="object-cover" />
            </div>

                          {/* Información */}
            <div className={`p-4 md:col-span-2 ${room.isAvailable === false ? 'opacity-60' : ''}`}>
              <div className="flex flex-col md:flex-row md:justify-between md:items-start">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold">{room.name}</h3>
                    {room.isAvailable === false && (
                      <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        No disponible
                      </span>
                    )}
                  </div>
                  <div className="flex items-center mb-2">
                    <Users className="h-5 w-5 text-gray-600 mr-2" />
                    <span>Capacidad: {room.capacity} personas</span>
                  </div>
                  <p className="text-gray-700 mb-4 line-clamp-2">{room.description}</p>
                  {room.isAvailable === false && room.unavailableReason && (
                    <div className="text-red-600 text-sm font-medium mb-2">
                      {room.unavailableReason === 'dates' && (
                        <p>Esta habitación no está disponible para las fechas seleccionadas.</p>
                      )}
                      {room.unavailableReason === 'capacity' && (
                        <p>Esta habitación no se encuentra disponible para la cantidad de huéspedes solicitada.</p>
                      )}
                      {room.unavailableReason === 'dates_and_capacity' && (
                        <div>
                          <p>Esta habitación no está disponible porque:</p>
                          <ul className="list-disc list-inside ml-2 mt-1">
                            <li>No está disponible para las fechas seleccionadas</li>
                            <li>Capacidad insuficiente ({room.capacity} {room.capacity === 1 ? 'huésped' : 'huéspedes'}, necesitas {requiredGuests || 0})</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right mt-2 md:mt-0">
                  <div className="text-2xl font-bold text-[#CD6C22]">
                    ${new Intl.NumberFormat('es-AR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    }).format(room.price)}
                  </div>
                  <div className="text-sm text-gray-500">por noche</div>
                </div>
              </div>

              {/* Servicios (mostrar solo algunos) */}
              <div className="mt-4 mb-4">
                <h4 className="text-sm font-semibold mb-2">Servicios incluidos:</h4>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {(room.services || []).slice(0, 3).map((service, index) => (
                    <span key={index} className="text-sm text-gray-600">
                      • {service.name}
                    </span>
                  ))}
                  {(room.services || []).length > 3 && <span className="text-sm text-gray-600">• Y más...</span>}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t">
                <div className="flex items-center mb-4 sm:mb-0">
                  <span className="mr-3 text-sm">Cantidad:</span>
                  <div className="flex items-center border rounded">
                    <button
                      className="px-3 py-1 border-r hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        const currentQty = roomQuantities[room.id] || 1
                        if (currentQty > 1) {
                          updateQuantity(room.id, currentQty - 1)
                        }
                      }}
                      disabled={(roomQuantities[room.id] || 1) <= 1 || room.isAvailable === false}
                    >
                      −
                    </button>
                    <span className="px-4 py-1">{roomQuantities[room.id] || 1}</span>
                    <button
                      className="px-3 py-1 border-l hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        const currentQty = roomQuantities[room.id] || 1
                        const maxQuantity = room.esGrupo ? (room.cantidadDisponible || 0) : room.available;
                        if (currentQty < maxQuantity) {
                          updateQuantity(room.id, currentQty + 1)
                        }
                      }}
                      disabled={(roomQuantities[room.id] || 1) >= (room.esGrupo ? (room.cantidadDisponible || 0) : room.available) || room.isAvailable === false}
                    >
                      +
                    </button>
                  </div>
                  <span className="ml-3 text-sm text-gray-500">
                    {room.isAvailable === false ? "No disponible" : (
                      room.esGrupo 
                        ? `${room.cantidadDisponible} disponible${room.cantidadDisponible !== 1 ? "s" : ""} de ${room.cantidadTotal} total${room.cantidadTotal !== 1 ? "es" : ""}`
                        : `${room.available} disponible${room.available !== 1 ? "s" : ""}`
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button className="bg-white text-[#CD6C22] hover:bg-gray-100" onClick={() => openRoomDetails(room)}>
                    Ver detalles
                  </Button>
                  {room.isAvailable === false ? (
                    <Button 
                      disabled
                      className="bg-gray-400 text-white cursor-not-allowed opacity-50"
                    >
                      No disponible
                    </Button>
                  ) : selectedRoomIds.includes(room.id) ? (
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white" 
                      onClick={() => handleRoomSelection(room.id)}
                    >
                      ✓ Elegida
                    </Button>
                  ) : (
                    <Button 
                      className="bg-[#CD6C22] hover:bg-[#A83921]" 
                      onClick={() => handleRoomSelection(room.id)}
                    >
                      Elegir habitación
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Modal de detalles de habitación */}
      <RoomDetailModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={closeRoomDetails}
        onReserve={handleReserveRoom}
        initialQuantity={selectedRoom ? roomQuantities[selectedRoom.id] || 1 : 1}
      />
    </div>
  )
}
