"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, CalendarIcon } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function SearchBox() {
  const router = useRouter()
  const [guests, setGuests] = useState(2)
  const [rooms, setRooms] = useState(1)
  
  // Estados para los calendarios
  const [checkInDate, setCheckInDate] = useState<Date | undefined>()
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>()
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false)

  // Fecha actual sin horas para validaciones
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Funciones para manejar selección de fechas
  const handleCheckInSelect = (date: Date | undefined) => {
    if (date) {
      setCheckInDate(date)
      setIsCheckInOpen(false)
      // Si no hay fecha de checkout o es anterior a la de checkin, abrir checkout
      if (!checkOutDate || date >= checkOutDate) {
        setCheckOutDate(undefined)
        setTimeout(() => setIsCheckOutOpen(true), 200)
      }
    }
  }

  const handleCheckOutSelect = (date: Date | undefined) => {
    if (date && checkInDate && date > checkInDate) {
      setCheckOutDate(date)
      setIsCheckOutOpen(false)
    }
  }

  const handleSearch = () => {
    // Construir la URL con parámetros de búsqueda
    const params = new URLSearchParams()
    if (checkInDate) {
      params.set('fechaInicio', checkInDate.toISOString().split('T')[0])
    }
    if (checkOutDate) {
      params.set('fechaFin', checkOutDate.toISOString().split('T')[0])
    }
    params.set('huespedes', guests.toString())
    params.set('habitaciones', rooms.toString())

    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="md:absolute md:right-4 md:top-1/2 md:transform md:-translate-y-1/2 md:max-w-md w-full mt-8 md:mt-0">
      <div className="bg-[#CD6C22] bg-opacity-90 p-6 rounded-lg shadow-lg">
        <div className="space-y-4">
          {/* Fecha de llegada */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">Llegada</label>
            <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#DD7C32] border border-white/30 text-white hover:bg-[#CD6C22]",
                    !checkInDate && "text-white/70"
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
          <div>
            <label className="block text-sm font-medium text-white mb-1">Salida</label>
            <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-[#DD7C32] border border-white/30 text-white hover:bg-[#CD6C22]",
                    !checkOutDate && "text-white/70"
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

          {/* Huéspedes y Habitaciones */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-1">Huéspedes</label>
              <Select value={guests.toString()} onValueChange={(value) => setGuests(Number(value))}>
                <SelectTrigger className="bg-[#DD7C32] border border-white/30 text-white">
                  <SelectValue>
                    {guests} {guests === 1 ? "huésped" : "huéspedes"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "huésped" : "huéspedes"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Habitaciones</label>
              <Select value={rooms.toString()} onValueChange={(value) => setRooms(Number(value))}>
                <SelectTrigger className="bg-[#DD7C32] border border-white/30 text-white">
                  <SelectValue>
                    {rooms} {rooms === 1 ? "habitación" : "habitaciones"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "habitación" : "habitaciones"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full bg-white text-[#CD6C22] hover:bg-gray-100 mt-2" 
            onClick={handleSearch}
          >
            <Search className="h-4 w-4 mr-2" /> Buscar Hoteles
          </Button>
        </div>
      </div>
    </div>
  )
}
