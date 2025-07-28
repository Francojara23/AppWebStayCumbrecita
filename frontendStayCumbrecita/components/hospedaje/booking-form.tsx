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
  initialCheckIn?: Date
  initialCheckOut?: Date
  initialGuests?: number
  initialRooms?: number
  selectedRooms?: any[] // Habitaciones seleccionadas (array vacío si no hay selección)
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
      }
    })
    
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
  initialCheckIn,
  initialCheckOut,
  initialGuests = 2,
  initialRooms = 1,
  selectedRooms = []
}: BookingFormProps) {
  const [guests, setGuests] = useState(initialGuests)
  const [rooms, setRooms] = useState(initialRooms)
  
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
            onChange={(e) => setRooms(Number.parseInt(e.target.value))}
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
            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">
                {selectedRooms.length === 1 ? 'Habitación elegida:' : `${selectedRooms.length} habitaciones elegidas:`}
              </div>
              {selectedRooms.map((room, index) => (
                <div key={room.id} className="text-blue-900">
                  {index + 1}. {room.nombre}
                </div>
              ))}
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
        className="w-full bg-[#CD6C22] hover:bg-[#A83921] h-12 text-lg" 
        onClick={onReservation}
        disabled={!checkInDate || !checkOutDate || !selectedRooms || selectedRooms.length === 0}
      >
        {selectedRooms && selectedRooms.length > 0 ? 'Reservar' : 'Elige una habitación'}
      </Button>


    </div>
  )
}
