"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { useCheckout } from "@/components/checkout-context"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useServiciosHospedaje } from "@/hooks/use-api"

interface ReservationStepProps {
  onNext: () => void
}

export default function ReservationStep({ onNext }: ReservationStepProps) {
  const { reservation, updateReservation } = useCheckout()
  const [specialRequests, setSpecialRequests] = useState(reservation.specialRequests)

  // Hook para obtener servicios del hospedaje - solo si el ID es válido (no hardcodeado)
  const isValidHotelId = reservation.hotel.id && 
                        reservation.hotel.id !== "hotel-1" && 
                        reservation.hotel.id.length > 10 // UUIDs son más largos
  const { data: serviciosHospedaje, isLoading: isLoadingServiciosHospedaje } = useServiciosHospedaje(
    isValidHotelId ? reservation.hotel.id : ""
  )

  // Debug: ver qué servicios se están recibiendo
  console.log('🔍 Servicios en ReservationStep:', {
    amenities: reservation.room.amenities,
    length: reservation.room.amenities?.length,
    serviciosHospedaje: serviciosHospedaje,
    reservation: reservation
  })

  const handleSpecialRequestsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSpecialRequests(e.target.value)
  }

  const handleContinue = () => {
    updateReservation({ specialRequests })
    onNext()
  }

  // Componente para mostrar servicios con modal
  const ServiciosDisplay = ({ 
    servicios, 
    titulo, 
    modalTitle 
  }: { 
    servicios: string[], 
    titulo: string,
    modalTitle: string 
  }) => {
    const serviciosFiltrados = servicios.filter(servicio => servicio && servicio.trim() !== '')
    const serviciosVisibles = serviciosFiltrados.slice(0, 4)
    const serviciosRestantes = serviciosFiltrados.slice(4)

    if (serviciosFiltrados.length === 0) {
      return (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">{titulo}:</p>
          <div className="flex items-center p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-2 flex-shrink-0"></div>
            <span className="text-sm text-gray-500 italic">Servicios no especificados</span>
          </div>
        </div>
      )
    }

    return (
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">{titulo}:</p>
        <div className="flex flex-wrap gap-2">
          {serviciosVisibles.map((servicio, index) => (
            <div
              key={index}
              className="inline-flex items-center bg-gray-50 text-gray-800 text-xs px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors duration-200 font-medium"
            >
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2 flex-shrink-0"></div>
              {servicio}
            </div>
          ))}
          {serviciosRestantes.length > 0 && (
                         <Dialog>
               <DialogTrigger asChild>
                 <button className="inline-block bg-orange-50 text-orange-700 text-xs px-3 py-1.5 rounded-md border border-orange-200 hover:bg-orange-100 hover:border-orange-300 transition-all duration-200 font-medium">
                   Ver más ({serviciosRestantes.length})
                 </button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
                 <DialogHeader className="border-b pb-4">
                   <DialogTitle className="text-xl font-bold text-gray-900">{modalTitle}</DialogTitle>
                   <p className="text-sm text-gray-600 mt-1">
                     {serviciosFiltrados.length} servicios disponibles
                   </p>
                 </DialogHeader>
                 
                 <div className="flex-1 overflow-y-auto py-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     {serviciosFiltrados.map((servicio, index) => (
                       <div
                         key={index}
                         className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors duration-200"
                       >
                         <div className="w-2 h-2 bg-orange-600 rounded-full mr-3 flex-shrink-0"></div>
                         <span className="text-sm text-gray-800 font-medium leading-tight">
                           {servicio}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
                 
                 <div className="border-t pt-4">
                   <p className="text-xs text-gray-500 text-center">
                     Estos servicios están incluidos en su reserva
                   </p>
                 </div>
               </DialogContent>
             </Dialog>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Datos de la reserva</h2>

          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="font-medium mb-2">Hospedaje</h3>
                <div className="flex gap-4 items-start mb-3">
                  <div className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={reservation.hotel.image || "/placeholder.svg"}
                      alt={reservation.hotel.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{reservation.hotel.name}</h4>
                    <p className="text-sm text-gray-600">{reservation.hotel.location}</p>
                  </div>
                </div>
                
                {/* Servicios del hospedaje */}
                {!isLoadingServiciosHospedaje && isValidHotelId && (
                  <ServiciosDisplay
                    servicios={serviciosHospedaje?.map((s: any) => s.servicio?.nombre || s.nombre) || []}
                    titulo="Servicios del hospedaje"
                    modalTitle="Todos los servicios del hospedaje"
                  />
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-medium mb-2">Habitación</h3>
                <p className="font-medium mb-2">{reservation.room.name}</p>
                <p className="text-sm text-gray-600 mb-3">
                  {reservation.guests.adults} {reservation.guests.adults === 1 ? "huésped" : "huéspedes"}
                  {reservation.guests.children > 0 &&
                    ` (${reservation.guests.adults} ${reservation.guests.adults === 1 ? "adulto" : "adultos"}, ${reservation.guests.children} ${reservation.guests.children === 1 ? "niño" : "niños"})`}
                </p>
                
                {/* Servicios de la habitación */}
                <ServiciosDisplay
                  servicios={reservation.room.amenities || []}
                  titulo="Servicios de la habitación"
                  modalTitle="Todos los servicios de la habitación"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium mb-2">Fechas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-md p-3">
                <div className="text-sm text-gray-500">Check-in</div>
                <div className="font-medium">
                  {format(reservation.dates.checkIn, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
                <div className="text-sm text-gray-500">A partir de las 15:00</div>
              </div>
              <div className="border rounded-md p-3">
                <div className="text-sm text-gray-500">Check-out</div>
                <div className="font-medium">
                  {format(reservation.dates.checkOut, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
                <div className="text-sm text-gray-500">Hasta las 11:00</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Peticiones especiales</h3>
            <Textarea
              placeholder="Ingrese cualquier petición especial (opcional)"
              value={specialRequests}
              onChange={handleSpecialRequestsChange}
              className="min-h-[100px]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Las peticiones especiales no se garantizan, pero el alojamiento hará todo lo posible por atenderlas.
            </p>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen de la reserva</h2>

            <div className="mb-4">
              <h3 className="font-medium">{reservation.hotel.name}</h3>
              <p className="text-sm text-gray-600">{reservation.hotel.location}</p>
            </div>

            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span>Check-in</span>
                <span className="font-medium">{format(reservation.dates.checkIn, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out</span>
                <span className="font-medium">{format(reservation.dates.checkOut, "dd/MM/yyyy")}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>
                  Precio por {reservation.dates.nights} {reservation.dates.nights === 1 ? 'noche' : 'noches'}
                </span>
                <span>${reservation.price.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos y cargos</span>
                <span>${reservation.price.taxes.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-600">${reservation.price.grandTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <Button className="w-full mt-6 bg-orange-600 hover:bg-orange-700" onClick={handleContinue}>
              Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
