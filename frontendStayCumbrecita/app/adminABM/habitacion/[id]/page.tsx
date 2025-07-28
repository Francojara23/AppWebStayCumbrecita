"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Upload } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { PriceRulesBuilder } from "@/components/price-rules-builder"
import { getTiposHabitacion, type TipoHabitacion } from "@/app/actions/types/getTiposHabitacion"
import { getServicesByType, type Servicio } from "@/app/actions/services/getServicesByType"
import { createHabitacionWithFiles } from "@/app/actions/habitaciones/createHabitacionWithFiles"
import { TempImage } from "@/lib/types/habitacion"
import ImageUploadModal from "@/components/ui/image-upload-modal"
import { useUserPermissions } from "@/hooks/use-user-permissions"

export default function AgregarHabitacionPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const hotelId = params.id as string
  
  // Verificar si el usuario puede administrar el hospedaje
  const { ownedHospedajes, adminHospedajes, isLoading: permissionsLoading } = useUserPermissions()
  
  // Calcular permisos solo cuando tenemos todos los datos
  const canManage = hotelId && !permissionsLoading ? 
    (ownedHospedajes.includes(hotelId) || adminHospedajes.includes(hotelId)) : 
    null

  // Estados de carga de datos del backend
  const [loading, setLoading] = useState(false)
  const [isLoadingTipos, setIsLoadingTipos] = useState(true)
  const [isLoadingServicios, setIsLoadingServicios] = useState(true)

  // Datos del backend
  const [tiposHabitacion, setTiposHabitacion] = useState<TipoHabitacion[]>([])
  const [services, setServices] = useState<Servicio[]>([])
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [imageAddCount, setImageAddCount] = useState(0)

  // Estado para el formulario
  const [formData, setFormData] = useState({
    name: "",
    shortDescription: "",
    longDescription: "",
    type: "",
    capacity: "",
    photos: [] as TempImage[],
    services: [] as string[],
    ajustesPrecio: [] as any[],
    precioBase: "",
  })

  // Cargar tipos de habitación del backend
  const loadTiposHabitacion = async () => {
    try {
      setIsLoadingTipos(true)
      const response = await getTiposHabitacion()
      
      if (response.success && response.data) {
        setTiposHabitacion(response.data)
      } else {
        console.error("Error cargando tipos de habitación:", response.error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los tipos de habitación",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cargando tipos de habitación:", error)
      toast({
        title: "Error",
        description: "Error de conexión al cargar tipos de habitación",
        variant: "destructive",
      })
    } finally {
      setIsLoadingTipos(false)
    }
  }

  // Cargar servicios de habitación del backend
  const loadServiciosHabitacion = async () => {
    try {
      setIsLoadingServicios(true)
      const response = await getServicesByType("HABITACION")
      
      if (response.success && response.data) {
        setServices(response.data)
      } else {
        console.error("Error cargando servicios de habitación:", response.error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los servicios de habitación",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cargando servicios de habitación:", error)
      toast({
        title: "Error",
        description: "Error de conexión al cargar servicios de habitación",
        variant: "destructive",
      })
    } finally {
      setIsLoadingServicios(false)
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([loadTiposHabitacion(), loadServiciosHabitacion()])
    }
    fetchData()
  }, [])

  // Verificar permisos una vez que se cargan todos los datos
  useEffect(() => {
    if (!permissionsLoading && hotelId && canManage === false) {
      console.log('🔐 Verificando permisos para agregar habitación:', {
        hotelId,
        ownedHospedajes,
        adminHospedajes,
        canManage
      })
      
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para agregar habitaciones a este hospedaje",
        variant: "destructive",
      })
      router.push(`/adminABM/habitaciones/${hotelId}`)
    }
  }, [permissionsLoading, hotelId, canManage, ownedHospedajes, adminHospedajes, router])

  const handleBack = () => {
    router.push(`/adminABM/habitaciones/${hotelId}`)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value,
    })
  }

  const handleServiceChange = (serviceId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        services: [...formData.services, serviceId],
      })
    } else {
      setFormData({
        ...formData,
        services: formData.services.filter((id) => id !== serviceId),
      })
    }
  }

  const handleAddImage = (image: Omit<TempImage, 'id'>) => {
    if (!image.file) {
      console.error('Intento de agregar imagen con archivo nulo')
      toast({
        title: "Error",
        description: "No se pudo agregar la imagen. El archivo no es válido.",
        variant: "destructive",
      })
      return
    }

    const newImage: TempImage = {
      ...image,
      id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    
    setFormData(prev => ({
      ...prev,
      photos: [...prev.photos, newImage]
    }))

    // Incrementar contador para mostrar toast consolidado al final
    setImageAddCount(prev => prev + 1)
  }

  // Efecto para mostrar toast cuando se terminen de agregar imágenes desde el modal
  useEffect(() => {
    if (imageAddCount > 0) {
      const timer = setTimeout(() => {
        toast({
          title: "Imágenes agregadas",
          description: `Se ${imageAddCount === 1 ? 'ha agregado 1 imagen' : `han agregado ${imageAddCount} imágenes`} a la lista.`,
        })
        setImageAddCount(0)
      }, 100) // Pequeño delay para que se agreguen todas las imágenes

      return () => clearTimeout(timer)
    }
  }, [imageAddCount])

  const handleRemoveImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(img => img.id !== id)
    }))

    toast({
      title: "Imagen eliminada",
      description: "La imagen se ha eliminado de la lista.",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (!formData.name) {
      toast({
        title: "Error",
        description: "El nombre de la habitación es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (!formData.type) {
      toast({
        title: "Error",
        description: "Debe seleccionar un tipo de habitación",
        variant: "destructive",
      })
      return
    }

    if (!formData.capacity) {
      toast({
        title: "Error",
        description: "Debe seleccionar la capacidad",
        variant: "destructive",
      })
      return
    }

    if (!formData.precioBase || isNaN(Number(formData.precioBase)) || Number(formData.precioBase) <= 0) {
      toast({
        title: "Error",
        description: "El precio base debe ser un número mayor a 0",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Preparar datos para el backend
      const habitacionData = {
        nombre: formData.name,
        descripcionCorta: formData.shortDescription,
        descripcionLarga: formData.longDescription,
        tipoHabitacionId: formData.type,
        capacidad: parseInt(formData.capacity),
        precioBase: Number(formData.precioBase),
        servicios: formData.services,
        tempImages: formData.photos,
        ajustesPrecio: formData.ajustesPrecio
      }

      const result = await createHabitacionWithFiles(hotelId, habitacionData)

      if (result.success) {
        toast({
          title: "Habitación guardada",
          description: result.message || "La habitación ha sido agregada exitosamente",
        })
        
        // Invalidar las queries de habitaciones para que se actualicen automáticamente
        queryClient.invalidateQueries({ queryKey: ['habitaciones'] })
        
        // Redirigir al listado de habitaciones
        router.push(`/adminABM/habitaciones/${hotelId}`)
      } else {
        console.error("Error en createHabitacionWithFiles:", result)
        throw new Error(result.error || `Error al crear habitación: ${JSON.stringify(result)}`)
      }
    } catch (error) {
      console.error("Error creating habitacion:", error)
      console.error("Error details:", JSON.stringify(error, null, 2))
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ha ocurrido un error al crear la habitación",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica el permiso
  if (canManage === null) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">Hospedajes / Registrados / Habitación</h1>
          <Button variant="ghost" onClick={handleBack} className="text-orange-600">
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
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-corta">Descripción corta</Label>
                <Input
                  id="descripcion-corta"
                  placeholder="Ingresar descripción corta"
                  className="mt-1"
                  value={formData.shortDescription}
                  onChange={(e) => handleInputChange("shortDescription", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-larga">Descripción larga</Label>
                <Textarea
                  id="descripcion-larga"
                  placeholder="Ingresar descripción larga"
                  className="mt-1"
                  value={formData.longDescription}
                  onChange={(e) => handleInputChange("longDescription", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => handleInputChange("type", value)}
                  disabled={isLoadingTipos}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={isLoadingTipos ? "Cargando tipos..." : "Seleccionar"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposHabitacion.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="capacidad">Cantidad de personas por habitación</Label>
                <Select value={formData.capacity} onValueChange={(value) => handleInputChange("capacity", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((num) => (
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
            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
              <Button 
                type="button"
                variant="outline" 
                className="mx-auto"
                onClick={() => setIsImageModalOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Cargar imagen
              </Button>
            </div>
            
            {/* Mostrar imágenes seleccionadas */}
            {formData.photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                {formData.photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <img
                      src={URL.createObjectURL(photo.file)}
                      alt={photo.descripcion || "Imagen"}
                      className="w-full h-32 object-cover rounded-md"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(photo.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Servicios */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Servicios de la habitación</h2>
            {isLoadingServicios ? (
              <div className="text-center py-4">Cargando servicios...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {services.map((servicio) => (
                  <div key={servicio.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`servicio-${servicio.id}`}
                      checked={formData.services.includes(servicio.id)}
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
            )}
          </section>

          {/* Precios */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Precio</h2>

            {/* Precio base */}
            <div className="mb-6">
              <Label htmlFor="precio-base">Precio base por noche</Label>
              <div className="flex items-center mt-1">
                <span className="bg-gray-100 px-3 py-2 text-gray-500 border border-r-0 rounded-l-md">$</span>
                <Input
                  id="precio-base"
                  type="number"
                  placeholder="0"
                  className="rounded-l-none"
                  value={formData.precioBase}
                  onChange={(e) => handleInputChange("precioBase", e.target.value)}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Este es el precio base que siempre se cobrará por noche.</p>
            </div>

            {/* Reglas de precio */}
            <div className="mt-6">
              <h3 className="text-md font-medium mb-2">Reglas de precio adicionales</h3>
              <PriceRulesBuilder
                rules={formData.ajustesPrecio}
                onRulesChange={(rules) => setFormData({ ...formData, ajustesPrecio: rules })}
                basePrice={Number(formData.precioBase) || 0}
              />
            </div>
          </section>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={handleBack}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </main>

      {/* Modal para subir imágenes */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onAddImage={handleAddImage}
      />
    </>
  )
}
