"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface BookingFormProps {
  basePrice: number
  priceAdjustments?: any[] // Ajustes de precio de la habitación principal
  onReservation: () => void
  onDatesChange?: (checkIn: Date, checkOut: Date, guests: number) => void // Callback para actualizar URL
  onGuestsRoomsChange?: (guests: number, rooms: number) => void // Callback para actualizar URL incluso sin fechas
  initialCheckIn?: Date
  initialCheckOut?: Date
  initialGuests?: number
  initialRooms?: number
  selectedRooms?: any[] // Habitaciones seleccionadas (array vacío si no hay selección)
  onRemoveRoom?: (uniqueId: string) => void // Función para quitar habitación individual
  onClearAllRooms?: () => void // Función para limpiar todas las habitaciones
}

// Función para formatear precios en formato argentino
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price)
}

// Función para calcular diferencia de días entre dos fechas (noches de estadía)
const calculateNights = (from: Date, to: Date): number => {
  const diffTime = to.getTime() - from.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays) // Asegurar que no sea negativo
}

// Función para verificar si una fecha es fin de semana (sábado o domingo)
const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6 // 0 = domingo, 6 = sábado
}

// Función para verificar si una fecha es día de semana (lunes a jueves)
const isWeekday = (date: Date): boolean => {
  const day = date.getDay()
  return day >= 1 && day <= 4 // 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves
}

// Función para verificar si una fecha está en un rango de temporada
const isInTemporadaRange = (date: Date, desde: string, hasta: string): boolean => {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return dateStr >= desde && dateStr <= hasta
}

// Función para calcular el precio con ajustes por día
const calculateDailyPrices = (
  checkIn: Date, 
  checkOut: Date, 
  basePrice: number, 
  ajustes: any[]
): { totalPrice: number, breakdown: Array<{date: string, price: number, adjustments: string[]}> } => {
  const breakdown: Array<{date: string, price: number, adjustments: string[]}> = []
  let totalPrice = 0
  
  const currentDate = new Date(checkIn)
  
  while (currentDate < checkOut) {
    let dayPrice = basePrice
    const adjustments: string[] = []
    
    // Aplicar ajustes en orden de prioridad
    ajustes.forEach(ajuste => {
      if (!ajuste.active) return
      
      if (ajuste.tipo === 'FINDE' && isWeekend(currentDate)) {
        const increment = basePrice * (ajuste.incrementoPct / 100)
        dayPrice += increment
        adjustments.push(`Fin de semana +${ajuste.incrementoPct}%`)
      } else if (ajuste.tipo === 'TEMPORADA' && isInTemporadaRange(currentDate, ajuste.desde, ajuste.hasta)) {
        const increment = basePrice * (ajuste.incrementoPct / 100)
        dayPrice += increment
        adjustments.push(`Temporada +${ajuste.incrementoPct}%`)
      } else if (ajuste.tipo === 'DIAS_SEMANA' && isWeekday(currentDate)) {
        const adjustment = basePrice * (ajuste.incrementoPct / 100)
        dayPrice += adjustment
        const sign = ajuste.incrementoPct >= 0 ? '+' : ''
        adjustments.push(`Días de semana ${sign}${ajuste.incrementoPct}%`)
      }
    })
    
    // Asegurar que el precio no sea negativo (mínimo $1)
    dayPrice = Math.max(dayPrice, 1)
    
    breakdown.push({
      date: currentDate.toISOString().split('T')[0],
      price: Math.round(dayPrice),
      adjustments
    })
    
    totalPrice += Math.round(dayPrice)
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return { totalPrice, breakdown }
}

export default function BookingForm({ 
  basePrice, 
  priceAdjustments = [],
  onReservation, 
  onDatesChange,
  onGuestsRoomsChange,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  initialRooms = 1,
  selectedRooms = [],
  onRemoveRoom,
  onClearAllRooms
}: BookingFormProps) {
  const [guests, setGuests] = useState(initialGuests)
  const [rooms, setRooms] = useState(initialRooms)
  
  // Función para calcular capacidad total de habitaciones seleccionadas
  const calculateTotalCapacity = () => {
    return selectedRooms.reduce((total, room) => {
      return total + (room.capacity || room.capacidad || 0)
    }, 0)
  }
  
  // Verificar si la capacidad total cumple con los huéspedes solicitados
  const totalCapacity = calculateTotalCapacity()
  const isCapacityValid = totalCapacity >= guests
  const capacityMessage = selectedRooms.length > 0 
    ? `Capacidad total: ${totalCapacity} huéspedes (necesitas ${guests})`
    : null
  
  // Estados para el calendario
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(initialCheckIn)
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(initialCheckOut)
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false)

  // Función para obtener la fecha actual sin horas (solo fecha)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Efecto para actualizar estados cuando cambien los props iniciales
  useEffect(() => {
    if (initialCheckIn) setCheckInDate(initialCheckIn)
  }, [initialCheckIn])

  useEffect(() => {
    if (initialCheckOut) setCheckOutDate(initialCheckOut)
  }, [initialCheckOut])

  useEffect(() => {
    setGuests(initialGuests)
  }, [initialGuests])

  useEffect(() => {
    setRooms(initialRooms)
  }, [initialRooms])

  // Calcular número de noches
  const nights = checkInDate && checkOutDate ? calculateNights(checkInDate, checkOutDate) : 1

  // Calcular precios con ajustes por día para todas las habitaciones seleccionadas
  const priceCalculation = checkInDate && checkOutDate && nights > 0 && selectedRooms.length > 0
    ? (() => {
        let totalPrice = 0
        selectedRooms.forEach(room => {
          const roomBasePrice = parseFloat(room.precioBase?.toString() || '0')
          const roomAdjustments = (room as any).ajustesPrecio || []
          const roomCalculation = calculateDailyPrices(checkInDate, checkOutDate, roomBasePrice, roomAdjustments)
          totalPrice += roomCalculation.totalPrice
        })
        return { totalPrice, breakdown: [] }
      })()
    : { totalPrice: 0, breakdown: [] }



  const subtotal = priceCalculation.totalPrice
  const taxes = Math.round(subtotal * 0.21) // IVA 21%
  const totalPrice = subtotal + taxes

  // Funciones para manejar selección de fechas
  const handleCheckInSelect = (date: Date | undefined) => {
    if (date) {
      setCheckInDate(date)
      setIsCheckInOpen(false)
      // Si no hay fecha de checkout o es anterior a la de checkin, abrir checkout
      if (!checkOutDate || date >= checkOutDate) {
        setCheckOutDate(undefined)
        setTimeout(() => setIsCheckOutOpen(true), 200)
      } else if (checkOutDate && onDatesChange) {
        // Si ya hay fecha de checkout válida, notificar el cambio
        onDatesChange(date, checkOutDate, guests)
      }
    }
  }

  const handleCheckOutSelect = (date: Date | undefined) => {
    if (date && checkInDate && date > checkInDate) {
      setCheckOutDate(date)
      setIsCheckOutOpen(false)
      // Notificar el cambio de fechas
      if (onDatesChange) {
        onDatesChange(checkInDate, date, guests)
      }
    }
  }

  // Función para manejar cambio de huéspedes
  const handleGuestsChange = (newGuests: number) => {
    setGuests(newGuests)
    // Notificar cambio de filtros aunque no existan fechas
    if (onGuestsRoomsChange) {
      onGuestsRoomsChange(newGuests, rooms)
    }
    // Notificar el cambio si hay fechas válidas
    if (checkInDate && checkOutDate && onDatesChange) {
      onDatesChange(checkInDate, checkOutDate, newGuests)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-24">
      <h2 className="text-xl font-bold mb-4">Reservar ahora</h2>

      {/* Fecha de llegada */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de llegada</label>
        <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !checkInDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkInDate ? format(checkInDate, "dd MMM, yyyy", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkInDate}
              onSelect={handleCheckInSelect}
              disabled={(date) => date < today}
              defaultMonth={checkInDate || new Date()}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Fecha de salida */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de salida</label>
        <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !checkOutDate && "text-muted-foreground"
              )}
              disabled={!checkInDate}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {checkOutDate ? format(checkOutDate, "dd MMM, yyyy", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={checkOutDate}
              onSelect={handleCheckOutSelect}
              disabled={(date) => !checkInDate || date <= checkInDate || date < today}
              defaultMonth={checkInDate ? new Date(checkInDate.getTime() + 24 * 60 * 60 * 1000) : new Date()}
              initialFocus
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Guests and Rooms */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Huéspedes</label>
          <select
            className="w-full border rounded-md p-2"
            value={guests}
            onChange={(e) => handleGuestsChange(Number.parseInt(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Habitaciones</label>
          <select
            className="w-full border rounded-md p-2"
            value={rooms}
          onChange={(e) => {
            const newRooms = Number.parseInt(e.target.value)
            setRooms(newRooms)
            // Notificar cambio de filtros aunque no existan fechas
            if (onGuestsRoomsChange) {
              onGuestsRoomsChange(guests, newRooms)
            }
            // Si hay fechas válidas, mantener comportamiento existente
            if (checkInDate && checkOutDate && onDatesChange) {
              onDatesChange(checkInDate, checkOutDate, guests)
            }
          }}
          >
            {[1, 2, 3, 4].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Price Summary */}
      <div className="border-t pt-4 mb-6">
        {selectedRooms && selectedRooms.length > 0 ? (
          <>
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm font-semibold text-gray-800">
                  {selectedRooms.length === 1 ? 'Habitación seleccionada:' : `${selectedRooms.length} habitaciones seleccionadas:`}
                </div>
                {onClearAllRooms && selectedRooms.length > 1 && (
                  <button
                    onClick={onClearAllRooms}
                    className="text-xs text-gray-600 hover:text-[#CD6C22] transition-colors underline"
                  >
                    Limpiar todo
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {selectedRooms.map((room, index) => (
                  <div key={room.uniqueId || room.id} className="flex justify-between items-center bg-white p-3 rounded border border-gray-100 shadow-sm">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">
                        {room.nombre || room.name}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Capacidad: {room.capacity || room.capacidad} huéspedes
                      </div>
                    </div>
                    {onRemoveRoom && room.uniqueId && (
                      <button
                        onClick={() => onRemoveRoom(room.uniqueId)}
                        className="ml-3 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#CD6C22] hover:bg-orange-50 rounded-full transition-colors"
                        title="Quitar habitación"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between mb-2">
              <span>
                Precio por {nights} {nights === 1 ? 'noche' : 'noches'}
              </span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Impuestos y tasas</span>
              <span>${formatPrice(taxes)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-4">
              <span>Total</span>
              <span>${formatPrice(totalPrice)}</span>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-gray-500 mb-2">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-gray-600 text-sm">
              Elige una habitación en la pestaña<br />
              "Habitaciones" para ver el precio
            </p>
          </div>
        )}
      </div>

      {/* Book Button */}
      <Button 
        className="w-full bg-[#CD6C22] hover:bg-[#A83921] h-12 text-lg mb-3" 
        onClick={onReservation}
        disabled={!checkInDate || !checkOutDate || !selectedRooms || selectedRooms.length === 0 || !isCapacityValid}
      >
        {selectedRooms && selectedRooms.length > 0 
          ? (isCapacityValid ? 'Reservar' : 'Selecciona más habitaciones')
          : 'Elige una habitación'
        }
      </Button>

      {/* Mensaje de validación de capacidad - Debajo del botón */}
      {selectedRooms && selectedRooms.length > 0 && (
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-center">
            {isCapacityValid ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-[#CD6C22]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-bold text-gray-800">
                  Capacidad confirmada: {totalCapacity} huéspedes para {guests} personas
                </span>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-bold text-gray-700">
                    Capacidad: {totalCapacity} de {guests} huéspedes necesarios
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Agrega más habitaciones para completar la capacidad requerida
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
}
