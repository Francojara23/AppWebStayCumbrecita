"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, X, Save } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import { useHospedaje, useServicios, useUpdateHospedaje, useHospedajeServicios } from "@/hooks/use-api"
import { useUserPermissions } from "@/hooks/use-user-permissions"

// Datos de ejemplo para hoteles
const mockHotels = [
  {
    id: "HTL-001",
    name: "Hotel Las Cascadas",
    shortDescription: "Rodeado de un entorno de plena naturaleza, es el único hotel con vista Puente al Río del Medio.",
    longDescription:
      "En Las Sierras de Córdoba, en un valle rodeado de montañas y paisajes verdes, que son el resultado de años de arduo trabajo de pobladores que dejaron su huella en estos maravillosos pueblitos que es hoy 'La Cumbrecita', ubicada por ríos y arroyos.",
    type: "Hotel",
    status: "Normal",
    rooms: 12,
    owner: "Juan Perez",
    registrationCertificate: "inscripcion/cuit01.pdf",
    taxId: "20-34556789-2",
    responsible: "Sebastian Fuentes",
    phone: "3514979656",
    email: "sfuentes@lascascadas.com",
    images: ["/cozy-hotel-bed.png", "/city-twilight-view.png", "/modern-hotel-suite.png"],
    services: [
      "Acceso discapacitados",
      "Aire acondicionado",
      "Apto fumadores",
      "Apto mascotas",
      "Asador",
      "Calefacción",
      "Cocina",
      "Desayuno a habitación",
      "Estacionamiento Cub.",
      "Estacionamiento Des.",
      "Habitación standard",
      "Free children",
    ],
  },
  {
    id: "HTL-002",
    name: "Hostel El Viajero",
    shortDescription: "Hostel céntrico con ambiente juvenil",
    longDescription:
      "Ubicado en el corazón de la ciudad, El Viajero ofrece una experiencia única para mochileros y viajeros que buscan conocer gente nueva en un ambiente relajado y divertido.",
    type: "Hostel",
    status: "Normal",
    rooms: 12,
    owner: "María González",
    registrationCertificate: "inscripcion/cuit02.pdf",
    taxId: "27-28456123-3",
    responsible: "Carlos Gómez",
    phone: "3512345678",
    email: "info@elviajero.com",
    images: ["/vibrant-hostel-hangout.png", "/cozy-hostel-bunks.png"],
    services: ["Wifi", "Cocina compartida", "Lockers", "Sala común", "Desayuno", "Terraza"],
  },
  // Otros hoteles...
]

// Los servicios se obtienen dinámicamente del catálogo

export default function EditHospedajeForm({ hotelId }: { hotelId: string }) {
  const router = useRouter()
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [originalServices, setOriginalServices] = useState<string[]>([])
  const [permissionsChecked, setPermissionsChecked] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  
  // Verificar permisos de administración
  const { ownedHospedajes, adminHospedajes, isLoading: permissionsLoading } = useUserPermissions()
  const canManage = !permissionsLoading && (ownedHospedajes.includes(hotelId) || adminHospedajes.includes(hotelId))
  
  // Obtener datos del hospedaje
  const { data: hospedaje, isLoading, error } = useHospedaje(hotelId)
  
  // Obtener todos los servicios del catálogo
  const { data: serviciosCatalogo, isLoading: loadingServicios } = useServicios()
  
  // Hooks para operaciones
  const updateHospedaje = useUpdateHospedaje()
  const { addServicio, removeServicio } = useHospedajeServicios(hotelId)

  useEffect(() => {
    if (hospedaje) {
      // Cargar datos iniciales del formulario
      const initialData = {
        nombre: hospedaje.nombre,
        descripcionCorta: hospedaje.descripcionCorta,
        descripcionLarga: hospedaje.descripcionLarga,
        tipoHotelId: (hospedaje as any).tipoHotel?.id,
        responsable: (hospedaje as any).responsable,
        telefonoContacto: (hospedaje as any).telefonoContacto,
        mailContacto: (hospedaje as any).mailContacto,
        direccion: hospedaje.direccion,
      }
      setFormData(initialData)
      
      // Cargar servicios seleccionados
      if ((hospedaje as any).servicios) {
        const serviciosNombres = (hospedaje as any).servicios.map((hs: any) => hs.servicio?.nombre).filter(Boolean)
        setSelectedServices(serviciosNombres)
        setOriginalServices(serviciosNombres)
        console.log('🔧 Servicios seleccionados del hospedaje:', serviciosNombres)
      }
    }
  }, [hospedaje])
  
  // Verificar permisos una vez que se cargan
  useEffect(() => {
    if (!permissionsLoading && !permissionsChecked) {
      setPermissionsChecked(true)
      
      console.log('🔐 Verificando permisos para hospedaje:', hotelId)
      console.log('📋 Hospedajes propios:', ownedHospedajes)
      console.log('👨‍💼 Hospedajes como admin:', adminHospedajes)
      console.log('✅ Puede administrar:', canManage)
      
      if (!canManage) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos para editar este hospedaje",
          variant: "destructive",
        })
        router.push("/adminABM")
      }
    }
  }, [permissionsLoading, permissionsChecked, canManage, hotelId, ownedHospedajes, adminHospedajes, router])

  const handleBack = () => {
    router.push("/adminABM")
  }

  const handleSave = async () => {
    if (isSaving) return
    
    try {
      setIsSaving(true)
      
      // 1. Actualizar datos básicos del hospedaje
      const updateData = {
        nombre: formData.nombre,
        descripcionCorta: formData.descripcionCorta,
        descripcionLarga: formData.descripcionLarga,
        tipoHotelId: formData.tipoHotelId,
        responsable: formData.responsable,
        telefonoContacto: formData.telefonoContacto,
        mailContacto: formData.mailContacto,
        direccion: formData.direccion,
      }
      
      await updateHospedaje.mutateAsync({ id: hotelId, data: updateData })
      
      // 2. Gestionar cambios en servicios
      await handleServiciosChanges()
      
      // 3. Redirigir de vuelta a la lista
      router.push("/adminABM")
      
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
  
  const handleServiciosChanges = async () => {
    if (!serviciosCatalogo) return
    
    // Obtener IDs de servicios originales y actuales
    const serviciosOriginalesIds = serviciosCatalogo
      .filter(s => originalServices.includes(s.nombre))
      .map(s => s.id)
    
    const serviciosActualesIds = serviciosCatalogo
      .filter(s => selectedServices.includes(s.nombre))
      .map(s => s.id)
    
    // Servicios a agregar (están en actuales pero no en originales)
    const serviciosAAgregar = serviciosActualesIds.filter(id => !serviciosOriginalesIds.includes(id))
    
    // Servicios a quitar (están en originales pero no en actuales)
    const serviciosAQuitar = serviciosOriginalesIds.filter(id => !serviciosActualesIds.includes(id))
    
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

  const toggleService = (service: string) => {
    setSelectedServices((prev) => (prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]))
  }

  const removeImage = (index: number) => {
    // TODO: Implementar eliminación de imagen
    toast({
      title: "Función en desarrollo",
      description: "La eliminación de imágenes estará disponible pronto",
    })
  }

  // Mostrar loading mientras se verifica permisos o se cargan datos
  if (permissionsLoading || isLoading || loadingServicios) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos del hospedaje...</p>
        </div>
      </div>
    )
  }

  if (error || !hospedaje) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-medium text-red-600">Hospedaje no encontrado</h2>
        <p className="mt-2">No se encontró el hospedaje con ID: {hotelId}</p>
        {error && <p className="mt-1 text-sm text-red-500">Error: {error.message}</p>}
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">Hospedajes / Registrados</h1>
          <Button variant="ghost" onClick={handleBack} className="text-orange-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Atrás
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <form className="space-y-8">
          {/* Información general */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Información general del hospedaje</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="nombre">Nombre del lugar</Label>
                <Input 
                  id="nombre" 
                  value={formData.nombre || ""} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="descripcion-corta">Descripción corta</Label>
                <Input 
                  id="descripcion-corta" 
                  value={formData.descripcionCorta || ""} 
                  onChange={(e) => setFormData({...formData, descripcionCorta: e.target.value})}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="descripcion-larga">Descripción larga</Label>
                <Textarea 
                  id="descripcion-larga" 
                  value={formData.descripcionLarga || ""} 
                  onChange={(e) => setFormData({...formData, descripcionLarga: e.target.value})}
                  className="mt-1" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div>
                <Label htmlFor="tipo">Tipo</Label>
                <Select defaultValue={(hospedaje as any).tipoHotel?.nombre?.toLowerCase()}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="hostel">Hostel</SelectItem>
                    <SelectItem value="apartamento">Apartamento</SelectItem>
                    <SelectItem value="cabaña">Cabaña</SelectItem>
                    <SelectItem value="suites">Suites</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select defaultValue={(hospedaje as any).estado?.toLowerCase()}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="habitaciones">Cantidad de habitaciones</Label>
                <Input 
                  id="habitaciones" 
                  value={(hospedaje as any).cantidadHabitaciones || hospedaje.habitaciones?.length || 0}
                  className="mt-1 bg-gray-50" 
                  readOnly
                />
              </div>
            </div>
          </section>

          {/* Información administrativa */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Información administrativa del hospedaje</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="titular">Titular</Label>
                <Input 
                  id="titular" 
                  value={formData.responsable || ""} 
                  onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="constancia">Constancia de inscripción (nombre)</Label>
                <div className="flex items-center mt-1 gap-2">
                  <div className="flex-1 border rounded-md px-3 py-2 text-sm text-gray-600 bg-gray-50">
                    {hospedaje.documentos?.[0]?.nombre || "Sin documento"}
                  </div>
                  <Button variant="outline" className="h-10">
                    <Upload className="mr-2 h-4 w-4" />
                    Cambiar
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="cuit">CUIT</Label>
                <Input id="cuit" defaultValue="" className="mt-1" placeholder="Ingrese CUIT" />
              </div>
            </div>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="responsable">Responsable</Label>
                <Input 
                  id="responsable" 
                  value={formData.responsable || ""} 
                  onChange={(e) => setFormData({...formData, responsable: e.target.value})}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input 
                  id="telefono" 
                  value={formData.telefonoContacto || ""} 
                  onChange={(e) => setFormData({...formData, telefonoContacto: e.target.value})}
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.mailContacto || ""} 
                  onChange={(e) => setFormData({...formData, mailContacto: e.target.value})}
                  className="mt-1" 
                />
              </div>
            </div>
          </section>

          {/* Fotografías */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Fotografías del hospedaje</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {(hospedaje.imagenes || (hospedaje as any).imagenes)?.map((imagen: any, index: number) => (
                <div key={index} className="relative border rounded-md overflow-hidden h-40">
                  <Image
                    src={imagen.url || "/placeholder.svg"}
                    alt={`Imagen ${index + 1} de ${hospedaje.nombre}`}
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
                    onClick={() => removeImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center h-40">
                <Button variant="outline" className="mx-auto">
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar imagen
                </Button>
              </div>
            </div>
          </section>

          {/* Servicios */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Servicios del hospedaje</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {serviciosCatalogo
                ?.filter((servicio: any) => servicio.tipo === 'HOSPEDAJE')
                .map((servicio: any, index: number) => (
                  <div key={servicio.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`servicio-${servicio.id}`}
                      checked={selectedServices.includes(servicio.nombre)}
                      onCheckedChange={() => toggleService(servicio.nombre)}
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

          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button variant="outline" onClick={handleBack} disabled={isSaving}>
              Cancelar
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSave} disabled={isSaving}>
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
