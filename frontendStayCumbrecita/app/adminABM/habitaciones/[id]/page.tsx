"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, Edit, Trash2, Eye, Loader2, MapPin, Phone, Mail } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useHospedaje, useHabitacionesHospedaje } from "@/hooks/use-api"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { useCanManageHospedaje } from "@/hooks/use-user-permissions"

export default function HabitacionesPage() {
  const router = useRouter()
  const params = useParams()
  const accommodationId = params.id as string

  // Estado para modales
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<any>(null)

  // Obtener datos del hospedaje
  const { data: hospedaje, isLoading: loadingHospedaje, error: errorHospedaje } = useHospedaje(accommodationId)
  
  // Obtener habitaciones del hospedaje
  const { data: habitacionesData, isLoading: loadingHabitaciones, error: errorHabitaciones } = useHabitacionesHospedaje(accommodationId)
  
  // Verificar si el usuario puede administrar el hospedaje
  const canManage = useCanManageHospedaje(accommodationId)

  const handleBack = () => {
    router.push("/adminABM")
  }

  const handleAddRoom = () => {
    router.push(`/adminABM/habitacion/${accommodationId}`)
  }

  const handleDeleteRoom = async () => {
    if (!currentRoom) return

    try {
      // TODO: Implementar eliminación real con API
      // await deleteHabitacion(currentRoom.id)
      
      toast({
        title: "Funcionalidad en desarrollo",
        description: "La eliminación de habitaciones estará disponible próximamente",
        variant: "destructive",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la habitación",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setCurrentRoom(null)
    }
  }

  const openDeleteDialog = (room: any) => {
    setCurrentRoom(room)
    setIsDeleteDialogOpen(true)
  }

  const viewRoomDetails = (room: any) => {
    setCurrentRoom(room)
    setIsViewDialogOpen(true)
  }

  const navigateToEditRoom = (roomId: string) => {
    router.push(`/adminABM/habitaciones/editar/${roomId}`)
  }

  // Estados de carga y error
  if (loadingHospedaje) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        <span className="ml-2">Cargando información del hospedaje...</span>
      </div>
    )
  }

  if (errorHospedaje) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-medium text-red-600">Error al cargar hospedaje</h2>
        <p className="mt-2">No se pudo cargar la información del hospedaje.</p>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  if (!hospedaje) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-medium text-red-600">Hospedaje no encontrado</h2>
        <p className="mt-2">No se encontró el hospedaje con ID: {accommodationId}</p>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    )
  }

  const habitaciones = habitacionesData?.data || []

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">
            Hospedajes / {hospedaje.nombre} / Habitaciones
          </h1>
          <Button variant="ghost" onClick={handleBack} className="text-orange-600">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="flex justify-between mb-6">
          <h2 className="text-lg font-medium">Habitaciones de {hospedaje.nombre}</h2>
          {canManage && (
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleAddRoom}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar habitación
            </Button>
          )}
        </div>

        {loadingHabitaciones ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
            <span className="ml-2">Cargando habitaciones...</span>
          </div>
        ) : errorHabitaciones ? (
          <div className="text-center py-8">
            <p className="text-red-600">Error al cargar las habitaciones</p>
            <p className="text-gray-500 mt-2">Intenta recargar la página</p>
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Ver detalles</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {habitaciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No hay habitaciones registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  habitaciones.map((habitacion: any) => (
                    <TableRow key={habitacion.id}>
                      <TableCell className="font-medium">{habitacion.nombre}</TableCell>
                      <TableCell>{habitacion.tipoHabitacion?.nombre || "Sin tipo"}</TableCell>
                      <TableCell>
                        {habitacion.capacidad} {habitacion.capacidad === 1 ? "persona" : "personas"}
                      </TableCell>
                      <TableCell>
                        {habitacion.precioBase 
                          ? `$${Number(habitacion.precioBase).toLocaleString()}` 
                          : "No definido"
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-500"
                          onClick={() => viewRoomDetails(habitacion)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {canManage && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => navigateToEditRoom(habitacion.id)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-500"
                                onClick={() => openDeleteDialog(habitacion)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Modal para ver detalles de la habitación */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-orange-700">Detalles de la Habitación</DialogTitle>
            <DialogDescription>Información completa de la habitación</DialogDescription>
          </DialogHeader>

          {currentRoom && (
            <div className="space-y-6">
              {/* Información general */}
              <div>
                <h3 className="text-lg font-medium text-orange-700 mb-2">Información general</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Nombre</p>
                    <p>{currentRoom.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tipo de habitación</p>
                    <p>{currentRoom.tipoHabitacion?.nombre || "Sin tipo definido"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Capacidad</p>
                    <p>
                      {currentRoom.capacidad} {currentRoom.capacidad === 1 ? "persona" : "personas"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Precio base</p>
                    <p>
                      {currentRoom.precioBase 
                        ? `$${Number(currentRoom.precioBase).toLocaleString()}` 
                        : "No definido"
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Descripción corta */}
              {currentRoom.descripcionCorta && (
                <div>
                  <h3 className="text-lg font-medium text-orange-700 mb-2">Descripción</h3>
                  <p>{currentRoom.descripcionCorta}</p>
                </div>
              )}

              {/* Descripción larga */}
              {currentRoom.descripcionLarga && currentRoom.descripcionLarga !== currentRoom.descripcionCorta && (
                <div>
                  <h3 className="text-lg font-medium text-orange-700 mb-2">Descripción detallada</h3>
                  <p className="text-sm text-gray-600">{currentRoom.descripcionLarga}</p>
                </div>
              )}

              {/* Características del tipo de habitación */}
              {currentRoom.tipoHabitacion && (
                <div>
                  <h3 className="text-lg font-medium text-orange-700 mb-2">Características del tipo</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{currentRoom.tipoHabitacion.nombre}</p>
                    {currentRoom.tipoHabitacion.descripcion && (
                      <p className="text-sm text-gray-600 mt-1">{currentRoom.tipoHabitacion.descripcion}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Servicios */}
              {currentRoom.servicios && currentRoom.servicios.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-orange-700 mb-2">Servicios incluidos</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentRoom.servicios.map((servicio: any, index: number) => (
                      <div key={index} className="flex items-center">
                        <div className="h-4 w-4 rounded-sm bg-orange-100 border border-orange-600 flex items-center justify-center mr-2">
                          <div className="h-2 w-2 rounded-sm bg-orange-600"></div>
                        </div>
                        <span className="text-sm">
                          {servicio.servicio?.nombre || servicio.nombre || "Servicio sin nombre"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imágenes */}
              {currentRoom.imagenes && currentRoom.imagenes.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-orange-700 mb-2">Imágenes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentRoom.imagenes.map((imagen: any, index: number) => (
                      <div key={imagen.id || index} className="relative h-40 rounded-md overflow-hidden border">
                        <img
                          src={imagen.url || "/placeholder.svg"}
                          alt={imagen.descripcion || `Imagen ${index + 1} de ${currentRoom.nombre}`}
                          className="object-cover w-full h-full hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => window.open(imagen.url, '_blank')}
                        />
                        {imagen.descripcion && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2">
                            {imagen.descripcion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información de fechas */}
              <div>
                <h3 className="text-lg font-medium text-orange-700 mb-2">Información del sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-500">Creado</p>
                    <p>{new Date(currentRoom.createdAt).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">Última actualización</p>
                    <p>{new Date(currentRoom.updatedAt).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para eliminar habitación */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteRoom}
        title="Eliminar Habitación"
        description="¿Está seguro que desea eliminar esta habitación? Esta acción no se puede deshacer."
      />
    </>
  )
}
