"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

interface Service {
  id: string
  name: string
  icon?: string
}

interface ServicesMultiSelectProps {
  value: string[]
  onChange: (services: string[]) => void
  placeholder?: string
}

export function ServicesMultiSelect({
  value,
  onChange,
  placeholder = "Seleccionar servicios...",
}: ServicesMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Simulamos la carga de servicios desde la API
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true)
      try {
        // En una implementación real, esto sería una llamada a /api/servicios?tipo=HABITACION
        // Por ahora simulamos con datos estáticos
        const mockServices: Service[] = [
          { id: "wifi", name: "WiFi gratuito", icon: "📶" },
          { id: "aire-acondicionado", name: "Aire acondicionado", icon: "❄️" },
          { id: "calefaccion", name: "Calefacción", icon: "🔥" },
          { id: "tv", name: "TV por cable", icon: "📺" },
          { id: "minibar", name: "Minibar", icon: "🍷" },
          { id: "caja-seguridad", name: "Caja de seguridad", icon: "🔒" },
          { id: "bano-privado", name: "Baño privado", icon: "🚿" },
          { id: "balcon", name: "Balcón", icon: "🏞️" },
          { id: "jacuzzi", name: "Jacuzzi", icon: "🛁" },
          { id: "vista-mar", name: "Vista al mar", icon: "🌊" },
          { id: "vista-montana", name: "Vista a la montaña", icon: "⛰️" },
          { id: "cocina", name: "Cocina equipada", icon: "🍳" },
          { id: "lavanderia", name: "Servicio de lavandería", icon: "👕" },
          { id: "room-service", name: "Room service", icon: "🍽️" },
          { id: "gimnasio", name: "Acceso al gimnasio", icon: "💪" },
          { id: "piscina", name: "Acceso a piscina", icon: "🏊" },
          { id: "spa", name: "Acceso al spa", icon: "💆" },
          { id: "estacionamiento", name: "Estacionamiento", icon: "🚗" },
          { id: "mascotas", name: "Admite mascotas", icon: "🐕" },
          { id: "fumadores", name: "Habitación para fumadores", icon: "🚬" },
        ]

        // Simular delay de red
        await new Promise((resolve) => setTimeout(resolve, 500))
        setServices(mockServices)
      } catch (error) {
        console.error("Error fetching services:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  const filteredServices = services.filter((service) => service.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const selectedServices = services.filter((service) => value.includes(service.id))

  const handleSelect = (serviceId: string) => {
    if (value.includes(serviceId)) {
      onChange(value.filter((id) => id !== serviceId))
    } else {
      onChange([...value, serviceId])
    }
  }

  const handleRemove = (serviceId: string) => {
    onChange(value.filter((id) => id !== serviceId))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
            {value.length > 0 ? `${value.length} servicios seleccionados` : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput placeholder="Buscar servicios..." value={searchTerm} onValueChange={setSearchTerm} />
            <CommandList>
              <CommandEmpty>{loading ? "Cargando servicios..." : "No se encontraron servicios."}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {filteredServices.map((service) => (
                  <CommandItem key={service.id} value={service.id} onSelect={() => handleSelect(service.id)}>
                    <Check className={cn("mr-2 h-4 w-4", value.includes(service.id) ? "opacity-100" : "opacity-0")} />
                    <span className="mr-2">{service.icon}</span>
                    {service.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Mostrar servicios seleccionados como chips */}
      {selectedServices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedServices.map((service) => (
            <Badge key={service.id} variant="secondary" className="flex items-center gap-1">
              <span>{service.icon}</span>
              <span>{service.name}</span>
              <Button variant="ghost" size="sm" className="h-auto p-0 ml-1" onClick={() => handleRemove(service.id)}>
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
