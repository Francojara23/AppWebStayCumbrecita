"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface ServiciosModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  servicios: Array<{ id: string; nombre: string; descripcion?: string }>
  selectedServicios: string[]
  onServiciosChange: (servicios: string[]) => void
}

export default function ServiciosModal({
  isOpen,
  onClose,
  title,
  servicios,
  selectedServicios,
  onServiciosChange
}: ServiciosModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [tempSelected, setTempSelected] = useState<string[]>(selectedServicios)

  // Filtrar servicios por término de búsqueda
  const filteredServicios = servicios.filter(servicio =>
    servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleServicioToggle = (servicioId: string) => {
    setTempSelected(prev =>
      prev.includes(servicioId)
        ? prev.filter(id => id !== servicioId)
        : [...prev, servicioId]
    )
  }

  const handleSelectAll = () => {
    if (tempSelected.length === filteredServicios.length) {
      // Si todos están seleccionados, deseleccionar todos
      setTempSelected([])
    } else {
      // Seleccionar todos los filtrados
      setTempSelected(filteredServicios.map(s => s.id))
    }
  }

  const handleApply = () => {
    onServiciosChange(tempSelected)
    onClose()
  }

  const handleCancel = () => {
    setTempSelected(selectedServicios)
    setSearchTerm("")
    onClose()
  }

  // Resetear estado temporal cuando se abre el modal
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempSelected(selectedServicios)
      setSearchTerm("")
    } else {
      handleCancel()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Botón seleccionar todos */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">
            {tempSelected.length} de {filteredServicios.length} servicios seleccionados
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            {tempSelected.length === filteredServicios.length ? "Deseleccionar todos" : "Seleccionar todos"}
          </Button>
        </div>

        {/* Lista de servicios */}
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          <div className={`grid gap-1 ${filteredServicios.length > 10 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {filteredServicios.map((servicio) => (
              <div key={servicio.id} className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 rounded">
                <Checkbox
                  id={servicio.id}
                  checked={tempSelected.includes(servicio.id)}
                  onCheckedChange={() => handleServicioToggle(servicio.id)}
                />
                <label htmlFor={servicio.id} className="text-sm cursor-pointer flex-1 leading-tight">
                  {servicio.nombre}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleApply} className="bg-orange-600 hover:bg-orange-700">
            Aplicar ({tempSelected.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 