"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Search } from "lucide-react"
import { DateRangePicker } from "@/components/date-range-picker"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter()
  const [destination, setDestination] = useState("La Cumbrecita, Córdoba")
  const [guests, setGuests] = useState(2)

  const handleSearch = () => {
    // Construir la URL con los parámetros de búsqueda
    const searchParams = new URLSearchParams()
    if (destination) searchParams.set("destination", destination)
    if (guests) searchParams.set("guests", guests.toString())

    // Redirigir a la página de búsqueda con los parámetros
    router.push(`/search?${searchParams.toString()}`)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Buscar Hoteles</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">Destino</label>
            <div className="relative">
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} className="pl-9" />
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Fechas</label>
            <DateRangePicker className="w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Huéspedes</label>
            <Input type="number" value={guests} onChange={(e) => setGuests(Number.parseInt(e.target.value))} min="1" />
          </div>
        </div>

        <div className="flex justify-end">
          <Button className="bg-[#C84A31] hover:bg-[#A83921]" onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" /> Buscar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
