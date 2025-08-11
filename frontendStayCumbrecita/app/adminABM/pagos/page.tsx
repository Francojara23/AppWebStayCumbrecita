"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Eye, Trash2, Search, Plus, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { getPagosForAdmin, type GetPagosResponse } from "@/app/actions/admin/getPagos"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

// Actualizar el tipo para usar datos del backend
interface Payment {
  id: string
  reservationId: string
  date: string
  method: string
  amount: number
  status: string
  cardDetails?: {
    cardNumber: string
    cardHolder: string
    expiryDate: string
  }
  cashDetails?: {
    receivedBy: string
    receiptNumber: string
  }
  transferDetails?: {
    bankName: string
    accountNumber: string
    transferId: string
  }
    reservation: {
    checkIn: string
    checkOut: string
    guestName: string
    guestEmail: string
    roomType: string
    adults: number
    children: number
    totalAmount: number
    hotelName: string
  }
}

export default function PagosPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCanceledOrRefunded, setShowCanceledOrRefunded] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [selectedHospedaje, setSelectedHospedaje] = useState<string>("all")
  const [hospedajes, setHospedajes] = useState<Array<{id: string, nombre: string}>>([])
  const [isLoadingHospedajes, setIsLoadingHospedajes] = useState(false)

  // Fetch payments from backend
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setIsLoading(true)
        const response = await getPagosForAdmin()
        if (response && response.data) {
          // Transform backend data to component format
          const transformedData: Payment[] = response.data.map((pago: any) => {
            // Obtener información de la reserva y el turista
            const reserva = pago.reserva
            const turista = reserva?.turista
            const hospedaje = reserva?.hospedaje
            
            // Obtener nombres de habitaciones
            const roomNames = reserva?.lineas?.map((linea: any) => 
              linea.habitacion?.nombre || linea.habitacion?.tipoHabitacion?.nombre || 'Habitación'
            ) || ['Sin habitación']
            const roomType = roomNames.join(', ')
            
            // Calcular total de personas
            const totalPersonas = reserva?.lineas?.reduce((total: number, linea: any) => total + (linea.personas || 0), 0) || 0
            
            return {
              id: pago.id,
              reservationId: reserva?.id || "",
              date: new Date(pago.fechaPago).toLocaleDateString('es-ES'),
              method: pago.metodo,
              amount: Number(pago.montoTotal) || 0,
              status: pago.estado,
              reservation: {
                checkIn: reserva?.fechaInicio ? new Date(reserva.fechaInicio).toLocaleDateString('es-ES') : "",
                checkOut: reserva?.fechaFin ? new Date(reserva.fechaFin).toLocaleDateString('es-ES') : "",
                guestName: turista ? `${turista.nombre || ''} ${turista.apellido || ''}`.trim() : 'Sin nombre',
                guestEmail: turista?.email || "",
                roomType,
                adults: totalPersonas,
                children: 0, // Por ahora no manejamos niños separadamente
                totalAmount: Number(reserva?.montoTotal) || Number(pago.montoTotal) || 0,
                hotelName: hospedaje?.nombre || "",
              },
            }
                     })
          setPayments(transformedData)
          
          // Debug: Mostrar información de los pagos obtenidos
          console.log('🔍 Debug - Pagos obtenidos:', transformedData.length)
          console.log('🏨 Debug - Hospedajes en pagos:', transformedData.map(p => p.reservation.hotelName))
          
          // Extraer hospedajes únicos para el filtro (solo los que tienen nombre)
          const uniqueHospedajes = Array.from(
            new Map(
              transformedData
                .filter(payment => payment.reservation.hotelName && payment.reservation.hotelName.trim() !== '')
                .map(payment => [
                  payment.reservation.hotelName, 
                  { id: payment.reservation.hotelName, nombre: payment.reservation.hotelName }
                ])
            ).values()
          )
          console.log('📋 Debug - Hospedajes únicos extraídos:', uniqueHospedajes)
          setHospedajes(uniqueHospedajes)
        }
      } catch (error) {
        console.error("Error fetching payments:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los pagos",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayments()
  }, [])

  // Filter payments based on search query, canceled/refunded status, and hospedaje
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reservationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.date.includes(searchQuery) ||
      payment.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.amount.toString().includes(searchQuery) ||
      payment.reservation.hotelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.reservation.guestName.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by selected hospedaje
    const matchesHospedaje = selectedHospedaje === "all" || payment.reservation.hotelName === selectedHospedaje

    // Filter based on canceled/refunded status
    const matchesStatus = showCanceledOrRefunded 
      ? ["CANCELADO", "REINTEGRADO", "Cancelado", "Reintegrado"].includes(payment.status)  // Show ONLY canceled/refunded when toggle is ON
      : !["CANCELADO", "REINTEGRADO", "Cancelado", "Reintegrado"].includes(payment.status) // Hide canceled/refunded when toggle is OFF

    return matchesSearch && matchesHospedaje && matchesStatus
  })

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage)

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment)
    setIsDetailOpen(true)
  }

  const handleDeleteClick = (paymentId: string) => {
    setPaymentToDelete(paymentId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    // Here you would implement the actual delete logic
    console.log(`Deleting payment: ${paymentToDelete}`)
    setIsDeleteDialogOpen(false)
    setPaymentToDelete(null)
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
      case "APROBADO":
      case "Aprobado":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "RECHAZADO":
      case "Rechazado":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "PENDIENTE":
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "PROCESANDO":
      case "Procesando":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100"
      case "CANCELADO":
      case "Cancelado":
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
      case "REINTEGRADO":
      case "Reintegrado":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100"
      case "EXPIRADO":
      case "Expirado":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100"
      case "FALLIDO":
      case "Fallido":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Pagos registrados</h1>
          {selectedHospedaje && selectedHospedaje !== "all" && (
            <p className="text-sm text-gray-600 mt-1">
              Mostrando pagos de: <span className="font-medium text-orange-600">{selectedHospedaje}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="mr-2 h-4 w-4" /> Registrar pago
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Buscar por ID, Reserva, Hospedaje, Huésped..."
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
                {hospedajes.length > 0 ? (
                  hospedajes.map((hospedaje) => (
                    <SelectItem key={hospedaje.id} value={hospedaje.nombre}>
                      {hospedaje.nombre}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-data" disabled>
                    No hay hospedajes con pagos
                  </SelectItem>
                )}
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
        <div className="flex items-center gap-2">
          <Switch id="show-canceled-refunded" checked={showCanceledOrRefunded} onCheckedChange={setShowCanceledOrRefunded} />
          <Label htmlFor="show-canceled-refunded" className="text-sm text-orange-600 font-medium">
            Ver Pagos cancelados o reintegrados
          </Label>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
                          <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>ID Reserva</TableHead>
                  <TableHead>Hospedaje</TableHead>
                  <TableHead>Huésped</TableHead>
                  <TableHead>Fecha del Pago</TableHead>
                  <TableHead>Método de Pago</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin mr-4" />
                      <p>Cargando pagos...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length > 0 ? (
                currentItems.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.id.substring(0, 8).toUpperCase()}</TableCell>
                    <TableCell>{payment.reservationId ? payment.reservationId.substring(0, 8).toUpperCase() : "-"}</TableCell>
                    <TableCell className="font-medium">{payment.reservation.hotelName}</TableCell>
                    <TableCell>{payment.reservation.guestName}</TableCell>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>$ {payment.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(payment.status)}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewDetails(payment)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(payment.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">No se encontraron pagos</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination controls */}
      {filteredPayments.length > 0 && (
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

      {/* Payment Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
            <DialogDescription>Información completa del pago y la reserva asociada</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium">ID Pago:</dt>
                      <dd>
                        <span className="font-mono font-semibold text-orange-600">
                          {selectedPayment.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className="text-gray-400 text-sm ml-1">
                          {selectedPayment.id.substring(8)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Fecha:</dt>
                      <dd>{selectedPayment.date}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Método:</dt>
                      <dd>{selectedPayment.method}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Monto:</dt>
                      <dd>$ {selectedPayment.amount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Estado:</dt>
                      <dd>
                        <Badge className={getStatusBadgeClass(selectedPayment.status)}>
                          {selectedPayment.status}
                        </Badge>
                      </dd>
                    </div>

                    {/* Payment method specific details */}
                    {selectedPayment.method === "Tarjeta de Crédito" && selectedPayment.cardDetails && (
                      <>
                        <div className="pt-2 border-t mt-2">
                          <h4 className="font-semibold mb-2">Detalles de la Tarjeta</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="font-medium">Número:</dt>
                              <dd>{selectedPayment.cardDetails.cardNumber}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="font-medium">Titular:</dt>
                              <dd>{selectedPayment.cardDetails.cardHolder}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="font-medium">Vencimiento:</dt>
                              <dd>{selectedPayment.cardDetails.expiryDate}</dd>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedPayment.method === "Efectivo" && selectedPayment.cashDetails && (
                      <>
                        <div className="pt-2 border-t mt-2">
                          <h4 className="font-semibold mb-2">Detalles del Efectivo</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="font-medium">Recibido por:</dt>
                              <dd>{selectedPayment.cashDetails.receivedBy}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="font-medium">Número de Recibo:</dt>
                              <dd>{selectedPayment.cashDetails.receiptNumber}</dd>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {selectedPayment.method === "Transferencia" && selectedPayment.transferDetails && (
                      <>
                        <div className="pt-2 border-t mt-2">
                          <h4 className="font-semibold mb-2">Detalles de la Transferencia</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <dt className="font-medium">Banco:</dt>
                              <dd>{selectedPayment.transferDetails.bankName}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="font-medium">Cuenta:</dt>
                              <dd>{selectedPayment.transferDetails.accountNumber}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="font-medium">ID Transferencia:</dt>
                              <dd>{selectedPayment.transferDetails.transferId}</dd>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </dl>
                </CardContent>
              </Card>

              {/* Reservation Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información de la Reserva</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="font-medium">ID Reserva:</dt>
                      <dd>
                        {selectedPayment.reservationId ? (
                          <>
                            <span className="font-mono font-semibold text-orange-600">
                              {selectedPayment.reservationId.substring(0, 8).toUpperCase()}
                            </span>
                            <span className="text-gray-400 text-sm ml-1">
                              {selectedPayment.reservationId.substring(8)}
                            </span>
                          </>
                        ) : (
                          "Sin reserva asociada"
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Hotel:</dt>
                      <dd>{selectedPayment.reservation.hotelName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Check-in:</dt>
                      <dd>{selectedPayment.reservation.checkIn}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Check-out:</dt>
                      <dd>{selectedPayment.reservation.checkOut}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="font-medium">Tipo de Habitación:</dt>
                      <dd>{selectedPayment.reservation.roomType}</dd>
                    </div>
                    <div className="pt-2 border-t mt-2">
                      <h4 className="font-semibold mb-2">Información del Huésped</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <dt className="font-medium">Nombre:</dt>
                          <dd>{selectedPayment.reservation.guestName}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium">Email:</dt>
                          <dd>{selectedPayment.reservation.guestEmail}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium">Adultos:</dt>
                          <dd>{selectedPayment.reservation.adults}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="font-medium">Niños:</dt>
                          <dd>{selectedPayment.reservation.children}</dd>
                        </div>
                      </div>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Pago"
        description="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
      />
    </div>
  )
}
