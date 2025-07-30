"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Upload, Image as ImageIcon, Save, Loader2, MapPin, FileText, X } from "lucide-react"
import { Label } from "@/components/ui/label"
import { getTiposHospedaje, type TipoHospedaje } from "@/app/actions/types/getTiposHospedaje"
import { getServicesByType, type Servicio } from "@/app/actions/services/getServicesByType"
import { toast } from "@/hooks/use-toast"
import DocumentUploadModal from "@/components/ui/document-upload-modal"
import ImageUploadModal from "@/components/ui/image-upload-modal"
import GooglePlaceAutocompleteWidget from "@/components/ui/google-place-autocomplete-widget"
import { HospedajeFormData, TempDocument, TempImage } from "@/lib/types/hospedaje"
import { createHospedajeWithFiles } from "@/app/actions/hospedajes/createHospedajeWithFiles"

export default function AltaHospedajeForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tiposHospedaje, setTiposHospedaje] = useState<TipoHospedaje[]>([])
  const [isLoadingTipos, setIsLoadingTipos] = useState(true)
  const [serviciosHospedaje, setServiciosHospedaje] = useState<Servicio[]>([])
  const [isLoadingServicios, setIsLoadingServicios] = useState(true)
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado del formulario completo
  const [formData, setFormData] = useState<HospedajeFormData>({
    nombre: "",
    descripcionCorta: "",
    descripcionLarga: "",
    tipoHotelId: "",
    estado: "PENDIENTE",
    documentoInscripcion: undefined, // Opcional: se puede llenar automáticamente
    responsable: "",
    telefonoContacto: "",
    mailContacto: "",
    direccion: "",
    servicios: [],
    tempDocuments: [],
    tempImages: [],
  })

  const handleBack = () => {
    router.push("/adminABM")
  }

  const handleOpenDocumentModal = () => {
    setIsDocumentModalOpen(true)
  }

  const handleOpenImageModal = () => {
    setIsImageModalOpen(true)
  }

  const handleAddDocument = (document: Omit<TempDocument, 'id'>) => {
    const newDocument: TempDocument = {
      ...document,
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
    
    setFormData(prev => ({
      ...prev,
      tempDocuments: [...prev.tempDocuments, newDocument]
    }))

    toast({
      title: "Documento agregado",
      description: `${document.nombre} se ha agregado a la lista de documentos.`,
    })
  }

  const handleAddImage = (image: Omit<TempImage, 'id'>) => {
    // Validar que el archivo no sea null o undefined
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
      tempImages: [...prev.tempImages, newImage]
    }))

    toast({
      title: "Imagen agregada",
      description: "La imagen se ha agregado a la lista de imágenes.",
    })
  }

  const handleRemoveDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tempDocuments: prev.tempDocuments.filter(doc => doc.id !== id)
    }))

    toast({
      title: "Documento eliminado",
      description: "El documento se ha eliminado de la lista.",
    })
  }

  const handleRemoveImage = (id: string) => {
    setFormData(prev => ({
      ...prev,
      tempImages: prev.tempImages.filter(img => img.id !== id)
    }))

    toast({
      title: "Imagen eliminada",
      description: "La imagen se ha eliminado de la lista.",
    })
  }

  // Helper para crear URL de imagen de manera segura
  const createImageUrl = (file: File | null | undefined): string => {
    if (!file || !(file instanceof File)) {
      console.warn('Invalid file provided to createImageUrl:', file)
      return ''
    }
    try {
      const url = URL.createObjectURL(file)
      // No revocar inmediatamente, dejar que React maneje el lifecycle
      return url
    } catch (error) {
      console.error('Error creating object URL:', error)
      return ''
    }
  }

  const handleInputChange = (field: keyof HospedajeFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleServiceToggle = (servicioId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      servicios: checked 
        ? [...prev.servicios, servicioId]
        : prev.servicios.filter(id => id !== servicioId)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.nombre.trim()) {
      toast({
        title: "Campo requerido",
        description: "El nombre del hospedaje es obligatorio.",
        variant: "destructive",
      })
      return
    }

    if (!formData.tipoHotelId) {
      toast({
        title: "Campo requerido",
        description: "Debe seleccionar un tipo de hospedaje.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createHospedajeWithFiles(formData)

      if (result.success) {
        toast({
          title: "Hospedaje creado exitosamente",
          description: result.message,
        })
        
        // Invalidar las queries de hospedajes para que se actualicen automáticamente
        queryClient.invalidateQueries({ queryKey: ['hospedajes'] })
        
        // Redirigir a la lista de hospedajes
        router.push("/adminABM")
      } else {
        toast({
          title: "Error al crear hospedaje",
          description: result.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating hospedaje:", error)
      toast({
        title: "Error inesperado",
        description: "Ha ocurrido un error al crear el hospedaje.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cleanup de URLs de objetos cuando el componente se desmonte
  useEffect(() => {
    const createdUrls = new Set<string>()
    
    return () => {
      // Limpiar solo las URLs que fueron creadas y almacenadas
      createdUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url)
        } catch (error) {
          console.error('Error revoking object URL:', error)
        }
      })
      createdUrls.clear()
    }
  }, []) // Solo se ejecuta al desmontar

  // Cargar tipos de hospedaje y servicios al montar el componente
  useEffect(() => {
    const loadData = async () => {
      // Cargar tipos de hospedaje y servicios en paralelo
      const loadTiposHospedaje = async () => {
        try {
          setIsLoadingTipos(true)
          const response = await getTiposHospedaje()
          if (response.success && response.data) {
            setTiposHospedaje(response.data)
          } else {
            toast({
              title: "Error",
              description: "No se pudieron cargar los tipos de hospedaje",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Error al cargar tipos de hospedaje:", error)
          toast({
            title: "Error",
            description: "Error al cargar los tipos de hospedaje",
            variant: "destructive",
          })
        } finally {
          setIsLoadingTipos(false)
        }
      }

      const loadServiciosHospedaje = async () => {
        try {
          setIsLoadingServicios(true)
          const response = await getServicesByType("HOSPEDAJE")
          if (response.success && response.data) {
            setServiciosHospedaje(response.data)
          } else {
            toast({
              title: "Error",
              description: "No se pudieron cargar los servicios de hospedaje",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Error al cargar servicios de hospedaje:", error)
          toast({
            title: "Error",
            description: "Error al cargar los servicios de hospedaje",
            variant: "destructive",
          })
        } finally {
          setIsLoadingServicios(false)
        }
      }

      // Ejecutar ambas cargas en paralelo
      await Promise.all([loadTiposHospedaje(), loadServiciosHospedaje()])
    }

    loadData()
  }, [])

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
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información general */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Información general del hospedaje</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="nombre">Nombre del lugar *</Label>
                <Input 
                  id="nombre" 
                  placeholder="Ingresar nombre" 
                  className="mt-1"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-corta">Descripción corta *</Label>
                <Input 
                  id="descripcion-corta" 
                  placeholder="Ingresar descripción corta" 
                  className="mt-1"
                  value={formData.descripcionCorta}
                  onChange={(e) => handleInputChange('descripcionCorta', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="descripcion-larga">Descripción larga *</Label>
                <Textarea 
                  id="descripcion-larga" 
                  placeholder="Ingresar descripción larga" 
                  className="mt-1"
                  value={formData.descripcionLarga}
                  onChange={(e) => handleInputChange('descripcionLarga', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  disabled={isLoadingTipos}
                  value={formData.tipoHotelId}
                  onValueChange={(value) => handleInputChange('tipoHotelId', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={isLoadingTipos ? "Cargando..." : "Seleccionar"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposHospedaje.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="estado">Estado</Label>
                <Select 
                  value={formData.estado}
                  onValueChange={(value) => handleInputChange('estado', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVO">Activo</SelectItem>
                    <SelectItem value="INACTIVO">Inactivo</SelectItem>
                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Nota informativa sobre habitaciones */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>📌 Nota:</strong> Las habitaciones se agregan después de crear el hospedaje. 
                Ve a la sección "Habitaciones" en la lista de hospedajes para crear las habitaciones individuales o múltiples.
              </p>
            </div>
          </section>

          {/* Información administrativa */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Información administrativa del hospedaje</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="responsable">Responsable *</Label>
                <Input 
                  id="responsable" 
                  placeholder="Nombre del responsable" 
                  className="mt-1"
                  value={formData.responsable}
                  onChange={(e) => handleInputChange('responsable', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="constancia">Constancia de inscripción</Label>
                <div className="flex items-center mt-1 gap-2">
                  {formData.tempDocuments.length > 0 ? (
                    <>
                      <div className="flex-1 flex items-center gap-2 p-2 border rounded-md bg-green-50 border-green-200">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-800 font-medium truncate">
                          {formData.tempDocuments[0].nombre}
                        </span>
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveDocument(formData.tempDocuments[0].id)}
                        title="Quitar archivo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10"
                        onClick={handleOpenDocumentModal}
                        title="Cambiar archivo"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      type="button"
                      variant="outline" 
                      className="flex-1"
                      onClick={handleOpenDocumentModal}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Subir archivo
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="direccion">Dirección *</Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400 z-10" />
                  <GooglePlaceAutocompleteWidget
                    value={formData.direccion}
                    onChange={(value) => handleInputChange('direccion', value)}
                    placeholder="Ingresa la dirección del hospedaje"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Información de contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="telefono">Teléfono de contacto *</Label>
                <Input 
                  id="telefono" 
                  placeholder="Incluir código de área" 
                  className="mt-1"
                  value={formData.telefonoContacto}
                  onChange={(e) => handleInputChange('telefonoContacto', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email de contacto *</Label>
                <Input 
                  id="email" 
                  placeholder="Email de contacto" 
                  className="mt-1" 
                  type="email"
                  value={formData.mailContacto}
                  onChange={(e) => handleInputChange('mailContacto', e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Fotografías */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Fotografías del hospedaje</h2>
            <div className="space-y-4">
              {/* Botón para agregar imágenes */}
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <Button 
                  type="button"
                  variant="outline" 
                  className="mx-auto"
                  onClick={handleOpenImageModal}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {formData.tempImages.length > 0 ? 'Agregar más imágenes' : 'Cargar imágenes'}
                </Button>
              </div>

              {/* Lista de imágenes cargadas */}
              {formData.tempImages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700">
                    Imágenes cargadas ({formData.tempImages.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.tempImages
                      .filter(image => image.file) // Filtrar imágenes con archivos válidos
                      .sort((a, b) => (a.orden || 999) - (b.orden || 999)) // Ordenar por orden establecido
                      .map((image, displayIndex) => (
                        <div key={image.id} className="relative group border rounded-lg bg-blue-50 border-blue-200 p-3 hover:shadow-md transition-shadow">
                          {/* Thumbnail de la imagen */}
                          <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 mb-3">
                            {image.file ? (
                              <img
                                src={createImageUrl(image.file)}
                                alt={`Imagen ${displayIndex + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error('Error loading image:', e)
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <ImageIcon className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          
                          {/* Información de la imagen */}
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-blue-800 truncate" title={image.file?.name || 'Archivo sin nombre'}>
                              {image.file?.name || 'Archivo sin nombre'}
                            </p>
                            {image.descripcion && (
                              <p className="text-xs text-blue-600 line-clamp-2" title={image.descripcion}>
                                {image.descripcion}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              {image.orden ? (
                                <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                                  Orden: {image.orden}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Sin orden</span>
                              )}
                              <span className="text-xs text-gray-500">
                                {image.file ? (image.file.size / 1024 / 1024).toFixed(1) + ' MB' : 'Tamaño desconocido'}
                              </span>
                            </div>
                          </div>

                          {/* Botón de eliminar */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveImage(image.id)}
                            className="absolute top-2 right-2 text-red-500 hover:text-red-700 bg-white hover:bg-red-50 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            title="Eliminar imagen"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Servicios */}
          <section>
            <h2 className="text-lg font-medium text-orange-700 mb-4">Servicios del hospedaje</h2>
            {isLoadingServicios ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-gray-500">Cargando servicios...</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {serviciosHospedaje.map((servicio) => (
                  <div key={servicio.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`servicio-${servicio.id}`}
                      checked={formData.servicios.includes(servicio.id)}
                      onCheckedChange={(checked) => handleServiceToggle(servicio.id, !!checked)}
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



          {/* Botones de acción */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Hospedaje
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      {/* Modal para subir documentos */}
      <DocumentUploadModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        onAddDocument={handleAddDocument}
      />

      {/* Modal para subir imágenes */}
      <ImageUploadModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onAddImage={handleAddImage}
      />
    </>
  )
}
