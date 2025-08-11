"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Search, Plus, Edit, Trash, FileText, Eye, Loader2, Image as ImageIcon, MapPin, Phone, Mail } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { useCambiarEstadoHospedaje, useHospedaje, useHabitacionesHospedaje } from "@/hooks/use-api"
import { useHospedajesFiltros, ESTADOS_OPCIONES } from "@/hooks/use-hospedajes-filtros"
import { getTiposHospedaje, type TipoHospedaje } from "@/app/actions/types/getTiposHospedaje"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { useUserPermissions, useIsHospedajeOwner, useCanManageHospedaje } from "@/hooks/use-user-permissions"
import { getClientApiUrl } from "@/lib/utils/api-urls"

// Usar solo hospedajes reales del backend - fallbacks eliminados

// Componente para cada fila de hotel que maneja permisos individuales
function HotelRow({ hotel, onViewDetails, onEditHotel, onDeleteHotel, router }: {
  hotel: any
  onViewDetails: (hotel: any) => void
  onEditHotel: (hotelId: string) => void
  onDeleteHotel: (hotelId: string) => void
  router: any
}) {
  const isOwner = useIsHospedajeOwner(hotel.id)
  const canManage = useCanManageHospedaje(hotel.id)

  return (
    <TableRow key={hotel.id}>
      <TableCell>{hotel.name}</TableCell>
      <TableCell>{hotel.type}</TableCell>
      <TableCell>{hotel.status}</TableCell>
      <TableCell>{hotel.rooms > 0 ? hotel.rooms : "-"}</TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-blue-500"
          onClick={() => onViewDetails(hotel)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
      <TableCell>
        {canManage ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full bg-green-500 text-white hover:bg-green-600"
            onClick={() => router.push(`/adminABM/habitaciones/${hotel.id}`)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8"></div>
        )}
      </TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          className="text-orange-600 border-orange-600 hover:bg-orange-50"
          onClick={() => router.push(`/adminABM/habitaciones/${hotel.id}`)}
        >
          Ver habitaciones
        </Button>
      </TableCell>
      <TableCell>
        {canManage ? (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEditHotel(hotel.id)}>
            <Edit className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8"></div>
        )}
      </TableCell>
      <TableCell>
        {isOwner ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
            onClick={() => onDeleteHotel(hotel.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        ) : (
          <div className="h-8 w-8"></div>
        )}
      </TableCell>
    </TableRow>
  )
}

export default function AdminABMPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [typeFilter, setTypeFilter] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Hook para verificar permisos del usuario
  const { hasAdminAccess } = useUserPermissions()

  // Estado para el diálogo de confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [hotelToDelete, setHotelToDelete] = useState<string | null>(null)

  // Estado para el modal de detalles
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null)

  // Estado para tipos de hospedaje
  const [tiposHospedaje, setTiposHospedaje] = useState<TipoHospedaje[]>([])
  const [isLoadingTipos, setIsLoadingTipos] = useState(true)

  // Hook personalizado para filtros con habitaciones
  const { 
    hospedajes: filteredHotels, 
    totalItems: totalFilteredItems, 
    totalPages: totalFilteredPages, 
    isLoading, 
    error,
    stats 
  } = useHospedajesFiltros({
    searchTerm,
    statusFilter,
    typeFilter,
    page: currentPage,
    limit: itemsPerPage
  })

  const cambiarEstadoMutation = useCambiarEstadoHospedaje()

  // Función para cargar tipos de hospedaje
  const loadTiposHospedaje = async () => {
    try {
      setIsLoadingTipos(true)
      const response = await getTiposHospedaje()
      
      if (response.success && response.data) {
        console.log('🏨 Tipos de hospedaje cargados:', response.data)
        setTiposHospedaje(response.data)
      } else {
        console.error("Error cargando tipos de hospedaje:", response.error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los tipos de hospedaje",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cargando tipos de hospedaje:", error)
      toast({
        title: "Error",
        description: "Error de conexión al cargar tipos de hospedaje",
        variant: "destructive",
      })
    } finally {
      setIsLoadingTipos(false)
    }
  }

  // Cargar tipos de hospedaje al montar el componente
  useEffect(() => {
    loadTiposHospedaje()
  }, [])

  // Debug: Log de estadísticas del hook
  useEffect(() => {
    if (stats) {
      console.log('📊 Estadísticas filtros:', stats)
    }
    if (filteredHotels.length > 0) {
      console.log('🏨 Hospedajes filtrados:', filteredHotels.map((h: any) => ({ 
        name: h.name, 
        type: h.type, 
        status: h.status, 
        rooms: h.rooms 
      })))
    }
  }, [stats, filteredHotels.length])

  // Función para cambiar de página
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalFilteredPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Función para ver/editar habitaciones de un hotel
  const editHotel = (hotelId: string) => {
    router.push(`/adminABM/editar-hospedaje/${hotelId}`)
  }

  // Función para abrir el diálogo de confirmación de eliminación
  const handleDeleteHotel = (hotelId: string) => {
    setHotelToDelete(hotelId)
    setIsDeleteDialogOpen(true)
  }

  // Función para confirmar la eliminación
  const handleConfirmDelete = () => {
    if (hotelToDelete) {
      // En una implementación real, aquí se eliminaría el hotel de la base de datos
      console.log(`Eliminar hotel ${hotelToDelete}`)

      toast({
        title: "Hotel eliminado",
        description: "El hotel ha sido eliminado exitosamente",
      })

      setIsDeleteDialogOpen(false)
      setHotelToDelete(null)
    }
  }

  // Función para abrir el modal de detalles
  const viewHotelDetails = (hotel: any) => {
    setSelectedHotelId(hotel.id)
    setIsViewDialogOpen(true)
  }

  // Hook para obtener los datos completos del hospedaje seleccionado
  const { data: selectedHospedaje, isLoading: loadingHospedaje } = useHospedaje(
    selectedHotelId || ""
  )

  // Hook para obtener las habitaciones del hospedaje seleccionado
  const { data: habitaciones, isLoading: loadingHabitaciones } = useHabitacionesHospedaje(
    selectedHotelId || "",
  )

  // Estado y función para obtener servicios del hospedaje
  const [serviciosHospedaje, setServiciosHospedaje] = useState<any[]>([])
  const [loadingServicios, setLoadingServicios] = useState(false)

  // Función para cargar servicios del hospedaje
  const loadServiciosHospedaje = async (hospedajeId: string) => {
    if (!hospedajeId) return
    
    try {
      setLoadingServicios(true)
              const response = await fetch(`${getClientApiUrl()}/servicios/hospedajes/${hospedajeId}/servicios`)
      
      if (response.ok) {
        const servicios = await response.json()
        setServiciosHospedaje(servicios)
      } else {
        console.error('Error cargando servicios:', response.statusText)
        setServiciosHospedaje([])
      }
    } catch (error) {
      console.error('Error cargando servicios:', error)
      setServiciosHospedaje([])
    } finally {
      setLoadingServicios(false)
    }
  }

  // Cargar servicios cuando se selecciona un hospedaje
  useEffect(() => {
    if (selectedHotelId) {
      loadServiciosHospedaje(selectedHotelId)
    } else {
      setServiciosHospedaje([])
    }
  }, [selectedHotelId])

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">Hospedajes / Registrados</h1>
          <div className="flex gap-2">
            {/* Botón Alta hospedaje - Solo para propietarios */}
            {hasAdminAccess && (
              <Button
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => router.push("/adminABM/alta-hospedaje")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Alta hospedaje
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_OPCIONES.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter} disabled={isLoadingTipos}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder={isLoadingTipos ? "Cargando..." : "Tipo"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                {tiposHospedaje.map((tipo) => (
                  <SelectItem key={tipo.id} value={tipo.nombre.toLowerCase()}>
                    {tipo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Cant. habitaciones</TableHead>
                <TableHead>Ver detalles</TableHead>
                <TableHead>Habitación</TableHead>
                <TableHead>Ver habitaciones</TableHead>
                <TableHead>Editar</TableHead>
                <TableHead>Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">No se encontraron hospedajes con los filtros aplicados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredHotels.map((hotel: any) => (
                  <HotelRow
                    key={hotel.id}
                    hotel={hotel}
                    onViewDetails={viewHotelDetails}
                    onEditHotel={editHotel}
                    onDeleteHotel={handleDeleteHotel}
                    router={router}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredHotels.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalFilteredItems)} de{" "}
              {totalFilteredItems} resultados
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <span className="text-sm mr-2">Elementos por página:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center mx-2">
                  {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                    // Mostrar páginas alrededor de la página actual
                    let pageToShow
                    if (totalFilteredPages <= 5) {
                      pageToShow = i + 1
                    } else if (currentPage <= 3) {
                      pageToShow = i + 1
                    } else if (currentPage >= totalFilteredPages - 2) {
                      pageToShow = totalFilteredPages - 4 + i
                    } else {
                      pageToShow = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageToShow ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0 mx-1"
                        onClick={() => paginate(pageToShow)}
                      >
                        {pageToShow}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalFilteredPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Diálogo de confirmación de eliminación */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar eliminación"
        description="¿Está seguro que desea eliminar este hospedaje? Esta acción no se puede deshacer."
      />

      {/* Modal de detalles del hospedaje */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-orange-700">
              Detalles del Hospedaje
            </DialogTitle>
          </DialogHeader>

          {loadingHospedaje ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
              <span className="ml-2 text-gray-600">Cargando datos del hospedaje...</span>
            </div>
          ) : selectedHospedaje ? (
            <div className="space-y-6">
              {/* Debug: mostrar la estructura de datos */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm text-gray-500">Debug: Ver datos del hospedaje</summary>
                  <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto">
                    {JSON.stringify(selectedHospedaje, null, 2)}
                  </pre>
                </details>
              )}
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{selectedHospedaje.nombre}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{(selectedHospedaje as any).tipoHotel?.nombre || "Sin tipo"}</Badge>
                      <Badge variant={(selectedHospedaje as any).estado === 'ACTIVO' ? 'default' : 'destructive'}>
                        {(selectedHospedaje as any).estado || "Sin estado"}
                      </Badge>
                    </div>
                    {(selectedHospedaje as any).telefonoContacto && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {(selectedHospedaje as any).telefonoContacto}
                      </div>
                    )}
                    {(selectedHospedaje as any).mailContacto && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        {(selectedHospedaje as any).mailContacto}
                      </div>
                    )}
                    {selectedHospedaje.direccion && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        {selectedHospedaje.direccion}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {(selectedHospedaje as any).descripcionCorta || (selectedHospedaje as any).descripcionLarga || "Sin descripción disponible"}
                  </p>
                </div>
              </div>

              {/* Habitaciones */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span>Habitaciones</span>
                  {loadingHabitaciones && <Loader2 className="h-4 w-4 animate-spin" />}
                </h4>
                {loadingHabitaciones ? (
                  <div className="text-sm text-gray-500">Cargando habitaciones...</div>
                ) : habitaciones?.data && habitaciones.data.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {habitaciones.data.map((habitacion: any, index: number) => (
                      <div key={habitacion.id || index} className="p-3 border rounded-md bg-gray-50">
                        <div className="font-medium text-sm">{habitacion.nombre || `Habitación ${index + 1}`}</div>
                        <div className="text-xs text-gray-600">
                          {habitacion.tipoHabitacion?.nombre || "Tipo no especificado"}
                        </div>
                        {habitacion.capacidad && (
                          <div className="text-xs text-gray-600">
                            Capacidad: {habitacion.capacidad} personas
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No hay habitaciones registradas
                  </div>
                )}
              </div>

              {/* Servicios */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <span>Servicios</span>
                  {loadingServicios && <Loader2 className="h-4 w-4 animate-spin" />}
                </h4>
                {/* Debug: mostrar estructura de servicios */}
                {process.env.NODE_ENV === 'development' && serviciosHospedaje && (
                  <details className="mb-2">
                    <summary className="cursor-pointer text-xs text-gray-400">Debug: Ver estructura de servicios ({serviciosHospedaje.length})</summary>
                    <pre className="mt-1 p-1 bg-gray-50 text-xs overflow-auto">
                      {JSON.stringify(serviciosHospedaje, null, 2)}
                    </pre>
                  </details>
                )}
                {loadingServicios ? (
                  <div className="text-sm text-gray-500">Cargando servicios...</div>
                ) : serviciosHospedaje && serviciosHospedaje.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {serviciosHospedaje.map((hospedajeServicio: any, index: number) => (
                      <Badge key={hospedajeServicio.id || index} variant="secondary">
                        {hospedajeServicio.servicio?.nombre || "Servicio sin nombre"}
                        {hospedajeServicio.precioExtra && (
                          <span className="ml-1 text-xs text-gray-500">
                            (+${hospedajeServicio.precioExtra})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">
                    No hay servicios registrados
                  </div>
                )}
              </div>

              {/* Imágenes */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Imágenes</span>
                </h4>
                {(selectedHospedaje as any).imagenes && (selectedHospedaje as any).imagenes.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {(selectedHospedaje as any).imagenes.map((imagen: any, index: number) => (
                      <div key={imagen.id || index} className="aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={imagen.url}
                          alt={imagen.descripcion || `Imagen ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(imagen.url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    No hay imágenes registradas
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se encontraron datos del hospedaje
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Cerrar
            </Button>
            {selectedHotelId && (
              <Button
                onClick={() => {
                  setIsViewDialogOpen(false)
                  editHotel(selectedHotelId)
                }}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Editar Hospedaje
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}