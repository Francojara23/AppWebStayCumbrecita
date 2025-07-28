"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Eye, Trash2, Search, Plus, FileText, Calendar, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import ReservationCalendarView from "@/components/adminABM/reservation-calendar-view"
import { getReservationsForAdmin, type GetReservationsResponse } from "@/app/actions/reservations/getReservations"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Actualizar el tipo para usar datos del backend
interface Reservation {
  id: string
  checkIn: string
  checkOut: string
  guestName: string
  guestEmail: string
  roomType: string
  adults: number
  children: number
  totalAmount: number
  status: string
  hotelName: string
  paymentId: string | null
  paymentStatus: string | null
  paymentMethod: string | null
}

export default function ReservasPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCanceled, setShowCanceled] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [reservationToDelete, setReservationToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [selectedHospedaje, setSelectedHospedaje] = useState<string>("all")
  const [hospedajes, setHospedajes] = useState<Array<{id: string, nombre: string}>>([])
  const [isLoadingHospedajes, setIsLoadingHospedajes] = useState(false)

  // Fetch reservations from backend
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setIsLoading(true)
        const response = await getReservationsForAdmin()
        if (response && response.data) {
          // Transform backend data to component format
          const transformedData: Reservation[] = response.data.reservations.map((res: any) => {
            // Obtener información del turista
            const guestName = res.turista ? `${res.turista.nombre || ''} ${res.turista.apellido || ''}`.trim() : 'Sin nombre'
            const guestEmail = res.turista?.email || 'Sin email'
            
            // Obtener información del hospedaje
            const hotelName = res.hospedaje?.nombre || 'Sin hospedaje'
            
            // Obtener nombres de habitaciones (primera habitación o concatenar si hay varias)
            const roomNames = res.lineas?.map((linea: any) => 
              linea.habitacion?.nombre || 'Habitación sin nombre'
            ) || ['Sin habitación']
            const roomType = roomNames.join(', ')
            
            // Calcular total de personas de todas las líneas
            const totalPersonas = res.lineas?.reduce((total: number, linea: any) => total + (linea.personas || 0), 0) || 0
            
            // Obtener información del pago (primer pago si existe)
            const firstPayment = res.pagos && res.pagos.length > 0 ? res.pagos[0] : null
            
            return {
              id: res.id,
              checkIn: new Date(res.fechaInicio).toLocaleDateString('es-ES'),
              checkOut: new Date(res.fechaFin).toLocaleDateString('es-ES'),
              guestName,
              guestEmail,
              roomType,
              adults: totalPersonas, // Usamos el total de personas como adultos
              children: 0, // Por ahora no manejamos niños separadamente
                             totalAmount: Number(res.montoTotal) || 0,
              status: res.estado,
              hotelName,
              paymentId: firstPayment?.id || null,
              paymentStatus: firstPayment?.estado || null,
              paymentMethod: firstPayment ? 'Tarjeta/Transferencia' : null, // Simplificado
            }
          })
          setReservations(transformedData)
          
          // Extraer hospedajes únicos para el filtro
          const uniqueHospedajes = Array.from(
            new Map(
              transformedData.map(reservation => [
                reservation.hotelName, 
                { id: reservation.hotelName, nombre: reservation.hotelName }
              ])
            ).values()
          )
          setHospedajes(uniqueHospedajes)
        }
      } catch (error) {
        console.error("Error fetching reservations:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las reservas",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchReservations()
  }, [])

  // Filter reservations based on search query, canceled status, and hospedaje
  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      reservation.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.guestEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.roomType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (reservation.paymentId && reservation.paymentId.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter out canceled reservations unless showCanceled is true
    const matchesStatus = showCanceled ? true : !["CANCELADA", "Cancelada"].includes(reservation.status)
    
    // Filter by selected hospedaje
    const matchesHospedaje = selectedHospedaje === "all" || reservation.hotelName === selectedHospedaje

    return matchesSearch && matchesStatus && matchesHospedaje
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredReservations.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage)

  const handleViewDetails = (reservation: any) => {
    setSelectedReservation(reservation)
    setIsDetailOpen(true)
  }

  const handleDeleteClick = (reservationId: string) => {
    setReservationToDelete(reservationId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    // Here you would implement the actual delete logic
    console.log(`Deleting reservation: ${reservationToDelete}`)
    setIsDeleteDialogOpen(false)
    setReservationToDelete(null)
    // In a real app, you would remove the item from the database
    // and then refresh the list
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value))
    setCurrentPage(1)
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "CONFIRMADA":
      case "Confirmada":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "CANCELADA":
      case "Cancelada":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "PENDIENTE_PAGO":
      case "Pendiente de pago":
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "CREADA":
      case "Creada":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      case "PAGADA":
      case "Pagada":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "CHECK_IN":
      case "Check-in":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "CHECK_OUT":
      case "Check-out":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      case "CERRADA":
      case "Cerrada":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  const toggleViewMode = (mode: "list" | "calendar") => {
    setViewMode(mode)
  }

  return (
    <div className="p-6">
                <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Reservas</h1>
              {selectedHospedaje && selectedHospedaje !== "all" && (
                <p className="text-sm text-gray-600 mt-1">
                  Mostrando reservas de: <span className="font-medium text-orange-600">{selectedHospedaje}</span>
                </p>
              )}
            </div>
        <div className="flex gap-2">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="mr-2 h-4 w-4" /> Nueva Reserva
          </Button>
          <Button variant="outline" className="border-orange-600 text-orange-600 hover:bg-orange-50">
            <FileText className="mr-2 h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar por ID, Nombre, Email, Hospedaje..."
              className="pl-8 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filtro de Hospedaje */}
          <div className="min-w-[200px]">
            <Select value={selectedHospedaje} onValueChange={setSelectedHospedaje}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por hospedaje" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los hospedajes</SelectItem>
                {hospedajes.map((hospedaje) => (
                  <SelectItem key={hospedaje.id} value={hospedaje.nombre}>
                    {hospedaje.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Botón para limpiar filtros */}
          {(searchQuery || (selectedHospedaje && selectedHospedaje !== "all")) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedHospedaje("all")
              }}
              className="whitespace-nowrap"
            >
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* View toggle buttons */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none ${viewMode === "list" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              onClick={() => toggleViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" /> Lista
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              className={`rounded-none ${viewMode === "calendar" ? "bg-orange-600 hover:bg-orange-700" : ""}`}
              onClick={() => toggleViewMode("calendar")}
            >
              <Calendar className="h-4 w-4 mr-1" /> Calendario
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="show-canceled" checked={showCanceled} onCheckedChange={setShowCanceled} />
            <Label htmlFor="show-canceled" className="text-sm text-orange-600 font-medium">
              Ver Reservas canceladas
            </Label>
          </div>
        </div>
      </div>

      {viewMode === "list" ? (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>ID Pago</TableHead>
                    <TableHead>Hospedaje</TableHead>
                    <TableHead>Huésped</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Habitación</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-60 text-center">
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-8 w-8 animate-spin mr-4" />
                          <p>Cargando reservas...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentItems.length > 0 ? (
                    currentItems.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell>{reservation.id.substring(0, 8).toUpperCase()}</TableCell>
                        <TableCell>{reservation.paymentId ? reservation.paymentId.substring(0, 8).toUpperCase() : "-"}</TableCell>
                        <TableCell className="font-medium">{reservation.hotelName}</TableCell>
                        <TableCell>{reservation.guestName}</TableCell>
                        <TableCell>{reservation.checkIn}</TableCell>
                        <TableCell>{reservation.checkOut}</TableCell>
                        <TableCell>{reservation.roomType}</TableCell>
                        <TableCell>$ {reservation.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(reservation.status)}>{reservation.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleViewDetails(reservation)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(reservation.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={10} className="h-60 text-center">
                        <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                          <p className="text-gray-500">No se encontraron reservas</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination controls */}
          {filteredReservations.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Mostrar</span>
                <select className="border rounded p-1 text-sm" value={itemsPerPage} onChange={handleItemsPerPageChange}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm text-gray-500">por página</span>
              </div>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={currentPage === page ? "bg-orange-600" : ""}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <ReservationCalendarView reservations={filteredReservations} onViewDetails={handleViewDetails} />
      )}

      {/* Reservation Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalles de la Reserva</DialogTitle>
            <DialogDescription>Información completa de la reserva y el pago asociado</DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Reservation Information */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold text-lg mb-4">Información de la Reserva</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium">ID Reserva:</dt>
                      <dd>
                        <span className="font-mono font-semibold text-orange-600">
                          {selectedReservation.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">
                          {selectedReservation.id.substring(8)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Hotel:</dt>
                      <dd>{selectedReservation.hotelName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Check-in:</dt>
                      <dd>{selectedReservation.checkIn}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Check-out:</dt>
                      <dd>{selectedReservation.checkOut}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Tipo de Habitación:</dt>
                      <dd>{selectedReservation.roomType}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Adultos:</dt>
                      <dd>{selectedReservation.adults}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Niños:</dt>
                      <dd>{selectedReservation.children}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Monto Total:</dt>
                      <dd>$ {selectedReservation.totalAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Estado:</dt>
                      <dd>
                        <Badge className={getStatusBadgeClass(selectedReservation.status)}>
                          {selectedReservation.status}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              {/* Guest and Payment Information */}
              <div className="space-y-6">
                {/* Guest Information */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">Información del Huésped</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="font-medium">Nombre:</dt>
                        <dd>{selectedReservation.guestName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-medium">Email:</dt>
                        <dd>{selectedReservation.guestEmail}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

                {/* Payment Information */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-lg mb-4">Información del Pago</h3>
                    {selectedReservation.paymentId ? (
                      <dl className="space-y-2">
                        <div className="flex justify-between">
                          <dt className="font-medium">ID Pago:</dt>
                          <dd>
                            <span className="font-mono font-semibold text-orange-600">
                              {selectedReservation.paymentId.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-gray-400 text-sm ml-1">
                              {selectedReservation.paymentId.substring(8)}
                            </span>
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium">Método:</dt>
                          <dd>{selectedReservation.paymentMethod}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium">Estado:</dt>
                          <dd>
                            <Badge
                              className={
                                selectedReservation.paymentStatus === "Completado"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {selectedReservation.paymentStatus}
                            </Badge>
                          </dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-gray-500 italic">No hay información de pago disponible</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Reserva"
        description="¿Estás seguro de que deseas eliminar esta reserva? Esta acción no se puede deshacer."
      />
    </div>
  )
}
