"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload, Save } from "lucide-react"
import { useUserPermissions } from "@/hooks/use-user-permissions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { useHabitacion, useTiposHabitacion, useUpdateHabitacion, useServicios, useHabitacionServiciosManagement } from "@/hooks/use-api"
import { PriceRulesBuilder } from "@/components/price-rules-builder"
import Image from "next/image"

interface EditarHabitacionPageProps {
  params: Promise<{ id: string }>
}

export default function EditarHabitacionPage({ params }: EditarHabitacionPageProps) {
  const router = useRouter()
  const [roomId, setRoomId] = useState<string>("")
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [originalServices, setOriginalServices] = useState<string[]>([])
  const [formData, setFormData] = useState<any>({})
  const [ajustesPrecio, setAjustesPrecio] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Resolver params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setRoomId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // Obtener datos de la habitación
  const { data: habitacion, isLoading, error } = useHabitacion(roomId)
  
  // Obtener tipos de habitación
  const { data: tiposHabitacion, isLoading: loadingTipos } = useTiposHabitacion()
  
  // Obtener servicios del catálogo
  const { data: serviciosCatalogo, isLoading: loadingServicios } = useServicios()
  
  // Hooks para operaciones
  const updateHabitacion = useUpdateHabitacion()
  const { addServicio, removeServicio } = useHabitacionServiciosManagement(roomId)

  // Verificar si el usuario puede administrar el hospedaje
  const hospedajeId = habitacion?.hospedaje?.id
  const { ownedHospedajes, adminHospedajes, isLoading: permissionsLoading } = useUserPermissions()
  
  // Calcular permisos solo cuando tenemos todos los datos
  const canManage = hospedajeId && !permissionsLoading ? 
    (ownedHospedajes.includes(hospedajeId) || adminHospedajes.includes(hospedajeId)) : 
    null

  // Cargar datos iniciales del formulario
  useEffect(() => {
    if (habitacion) {
      const initialData = {
        nombre: habitacion.nombre,
        descripcionCorta: habitacion.descripcionCorta,
        descripcionLarga: habitacion.descripcionLarga,
        tipoHabitacionId: habitacion.tipoHabitacion?.id,
        capacidad: habitacion.capacidad,
        precioBase: habitacion.precioBase,
      }
      setFormData(initialData)

      // Cargar servicios seleccionados
      if (habitacion.servicios) {
        // Obtener los IDs de los servicios que tiene la habitación
        const serviciosIds = habitacion.servicios
          .filter((hs: any) => hs.servicio) // Solo servicios que tienen la relación completa
          .map((hs: any) => hs.servicio.id)
          .filter(Boolean)
        
        setOriginalServices(serviciosIds)
        setSelectedServices(serviciosIds)
        console.log('🔧 Servicios de la habitación:', serviciosIds)
        console.log('🔧 Servicios completos:', habitacion.servicios.map((s: any) => ({ 
          id: s.servicio?.id, 
          nombre: s.servicio?.nombre 
        })))
      }

      // Cargar ajustes de precio
      if (habitacion.ajustesPrecio) {
        setAjustesPrecio(habitacion.ajustesPrecio)
        console.log('🔧 Ajustes de precio:', habitacion.ajustesPrecio)
      }
    }
  }, [habitacion])

  // Mapear servicios IDs a nombres cuando tengamos el catálogo
  useEffect(() => {
    if (serviciosCatalogo && selectedServices.length > 0) {
      const serviciosNombres = serviciosCatalogo
        .filter(s => selectedServices.includes(s.id) && s.tipo === 'HABITACION')
        .map(s => s.nombre)
      
      console.log('🔧 Servicios mapeados a nombres:', serviciosNombres)
    }
  }, [serviciosCatalogo, selectedServices])

  // Verificar permisos una vez que se cargan todos los datos
  useEffect(() => {
    if (!permissionsLoading && hospedajeId && canManage === false) {
      console.log('🔐 Verificando permisos para habitación:', {
        habitacionId: roomId,
        hospedajeId,
        ownedHospedajes,
        adminHospedajes,
        canManage
      })
      
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para editar habitaciones de este hospedaje",
        variant: "destructive",
      })
      router.push(`/adminABM/habitaciones/${hospedajeId}`)
    }
  }, [permissionsLoading, hospedajeId, canManage, roomId, ownedHospedajes, adminHospedajes, router])

  const handleBack = () => {
    if (hospedajeId) {
      router.push(`/adminABM/habitaciones/${hospedajeId}`)
    } else {
      router.push("/adminABM")
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleServiceChange = (servicioId: string, checked: boolean) => {
    setSelectedServices(prev => 
      checked 
        ? [...prev, servicioId]
        : prev.filter(id => id !== servicioId)
    )
  }

  const handleServiciosChanges = async () => {
    if (!serviciosCatalogo) return

    // Servicios a agregar (están en actuales pero no en originales)
    const serviciosAAgregar = selectedServices.filter(id => !originalServices.includes(id))
    
    // Servicios a quitar (están en originales pero no en actuales)
    const serviciosAQuitar = originalServices.filter(id => !selectedServices.includes(id))
    
    console.log('🔧 Servicios a agregar:', serviciosAAgregar)
    console.log('🔧 Servicios a quitar:', serviciosAQuitar)
    
    // Agregar nuevos servicios
    for (const servicioId of serviciosAAgregar) {
      await addServicio({ servicioId })
    }
    
    // Quitar servicios eliminados
    for (const servicioId of serviciosAQuitar) {
      await removeServicio(servicioId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSaving) return

    // Validación básica
    if (!formData.nombre) {
      toast({
        title: "Error",
        description: "El nombre de la habitación es obligatorio",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      // 1. Actualizar datos básicos de la habitación
      const updateData = {
        nombre: formData.nombre,
        descripcionCorta: formData.descripcionCorta,
        descripcionLarga: formData.descripcionLarga,
        tipoHabitacionId: formData.tipoHabitacionId,
        capacidad: parseInt(formData.capacidad),
        precioBase: parseFloat(formData.precioBase),
      }

      await updateHabitacion.mutateAsync({ id: roomId, data: updateData })

      // 2. Gestionar cambios en servicios
      await handleServiciosChanges()

      // 3. Redirigir al listado de habitaciones
      router.push(`/adminABM/habitaciones/${hospedajeId}`)

    } catch (error: any) {
      console.error('Error al guardar:', error)
      toast({
        title: "Error al guardar",
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Mostrar loading mientras se verifica el permiso o se cargan datos
  if (canManage === null || isLoading || loadingTipos || loadingServicios || !roomId) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos de la habitación...</p>
        </div>
      </div>
    )
  }

  if (error || !habitacion) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-medium text-red-600">Habitación no encontrada</h2>
        <p className="mt-2">No se encontró la habitación con ID: {roomId}</p>
        {error && <p className="mt-1 text-sm text-red-500">Error: {error.message}</p>}
        <Button variant="outline" type="button" onClick={handleBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  // Filtrar servicios de habitación del catálogo
  const serviciosHabitacion = serviciosCatalogo?.filter(s => s.tipo === 'HABITACION') || []

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">
            Hospedajes / {habitacion.hospedaje?.nombre} / Editar Habitación
          </h1>
          <Button variant="ghost" type="button" onClick={handleBack} className="text-orange-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información general */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Información general de la habitación</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="nombre">Nombre o número de habitación</Label>
                <Input
                  id="nombre"
                  placeholder="Ingresar nombre"
                  className="mt-1"
                  value={formData.nombre || ""}
                  onChange={(e) => handleInputChange("nombre", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-corta">Descripción corta</Label>
                <Input
                  id="descripcion-corta"
                  placeholder="Ingresar descripción corta"
                  className="mt-1"
                  value={formData.descripcionCorta || ""}
                  onChange={(e) => handleInputChange("descripcionCorta", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-larga">Descripción larga</Label>
                <Textarea
                  id="descripcion-larga"
                  placeholder="Ingresar descripción larga"
                  className="mt-1"
                  value={formData.descripcionLarga || ""}
                  onChange={(e) => handleInputChange("descripcionLarga", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={formData.tipoHabitacionId || ""} onValueChange={(value) => handleInputChange("tipoHabitacionId", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposHabitacion?.map((tipo: any) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="capacidad">Cantidad de personas por habitación</Label>
                <Select value={formData.capacidad?.toString() || ""} onValueChange={(value) => handleInputChange("capacidad", parseInt(value))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar capacidad" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? "persona" : "personas"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Fotografías */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Fotografías de la habitación</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {habitacion.imagenes?.map((imagen: any, index: number) => (
                <div key={index} className="relative h-40 rounded-md overflow-hidden border">
                  <Image
                    src={imagen.url || "/placeholder.svg"}
                    alt={`Imagen ${index + 1} de ${habitacion.nombre}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <Button variant="outline" className="mx-auto" type="button">
                <Upload className="mr-2 h-4 w-4" />
                Cargar nueva imagen
              </Button>
              <p className="text-sm text-gray-500 mt-2">Funcionalidad próximamente</p>
            </div>
          </section>

          {/* Servicios */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Servicios de la habitación</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {serviciosHabitacion.map((servicio: any) => (
                <div key={servicio.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`servicio-${servicio.id}`}
                    checked={selectedServices.includes(servicio.id)}
                    onCheckedChange={(checked) => handleServiceChange(servicio.id, checked as boolean)}
                  />
                  <label
                    htmlFor={`servicio-${servicio.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {servicio.nombre}
                  </label>
                </div>
              ))}
            </div>
          </section>

          {/* Precios */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Precio</h2>

            {/* Precio base */}
            <div className="mb-6">
              <Label htmlFor="precio-base-section">Precio base por noche</Label>
              <div className="flex items-center mt-1">
                <span className="bg-gray-100 px-3 py-2 text-gray-500 border border-r-0 rounded-l-md">$</span>
                <Input
                  id="precio-base-section"
                  type="number"
                  placeholder="0"
                  className="rounded-l-none"
                  value={formData.precioBase || ""}
                  onChange={(e) => handleInputChange("precioBase", e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Este es el precio base que siempre se cobrará por noche.</p>
            </div>

            {/* Reglas de precio */}
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Reglas de precio adicionales</h3>
              <PriceRulesBuilder
                rules={ajustesPrecio}
                onRulesChange={setAjustesPrecio}
                basePrice={Number(formData.precioBase) || 0}
              />
            </div>
          </section>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" type="button" onClick={handleBack} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving} className="bg-orange-600 hover:bg-orange-700">
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}
