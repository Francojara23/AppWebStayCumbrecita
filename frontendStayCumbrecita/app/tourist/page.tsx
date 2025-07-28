"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, Calendar, Users, CreditCard, Plus, Bed, Search, QrCode, Loader2 } from "lucide-react"
import { SectionBanner } from "@/components/tourist/section-banner"
import { useReservasUsuario } from "@/hooks/use-api"
import { useUser } from "@/hooks/use-user"
import type { Reserva } from "@/lib/types/api"
import { EstadoReserva, MetodoPago, EstadoPago } from "@/lib/types/api"

// Tipo para las reservas procesadas
interface ProcessedReservation {
  id: string
  code: string
  place: string
  image: string
  checkIn: Date
  checkOut: Date
  visitors: number
  roomNames: string[]
  status: "Activo" | "Pendiente" | "Cancelado"
  paymentMethod: string
  amount: number
  paymentStatus: string
  qrCode: string
  original?: Reserva // Reserva original para los diálogos
}

export default function TouristReservationsPage() {
  // Usar el hook useUser para obtener el usuario autenticado
  const { user, isLoading: userLoading } = useUser()

  // Hook para obtener reservas del backend
  const { data: reservasData, isLoading: reservasLoading, error } = useReservasUsuario(user?.id)

  // Loading combinado
  const isLoading = userLoading || reservasLoading

  // Debug: Mostrar información en consola
  useEffect(() => {
    if (error) {
      console.error('Error cargando reservas:', error)
    }
    if (reservasData) {
      console.log('Reservas cargadas:', reservasData)
    }
  }, [error, reservasData])

  // Procesar reservas para el formato esperado
  // Nota: Usamos 'any' porque la interfaz Reserva no coincide completamente con la estructura del backend
  const reservations: ProcessedReservation[] = reservasData?.map((reserva: any) => {
    
    // Obtener imagen del hospedaje directamente o de habitación
    const image = reserva.hospedaje?.imagenes?.[0]?.url || 
                 reserva.lineas?.[0]?.habitacion?.imagenes?.[0]?.url || 
                 "/placeholder.svg?height=300&width=500&text=Hospedaje"

    // Manejar fechas de forma segura
    const fechaInicio = reserva.fechaInicio ? new Date(reserva.fechaInicio) : new Date()
    const fechaFin = reserva.fechaFin ? new Date(reserva.fechaFin) : new Date()

    // Calcular visitantes de las líneas de reserva
    const visitantes = reserva.lineas?.reduce((total: number, linea: any) => total + (linea.personas || 0), 0) || 0

    // Obtener nombres de habitaciones de las líneas
    const nombreHabitaciones = reserva.lineas?.map((linea: any) => 
      linea.habitacion?.tipoHabitacion?.nombre || linea.habitacion?.nombre || "Habitación"
    ) || ["Habitación"]

    // Mapear estados correctamente (usar enums reales del backend)
    const mapearEstado = (estado: string) => {
      switch (estado) {
        case 'PAGADA':
        case 'CONFIRMADA':
        case 'CHECK_IN':
        case 'CHECK_OUT':
          return "Activo"
        case 'CREADA':
        case 'PENDIENTE_PAGO':
          return "Pendiente"
        case 'CANCELADA':
        case 'CERRADA':
          return "Cancelado"
        default:
          return "Pendiente"
      }
    }

    // Mapear estado de pago
    const mapearEstadoPago = (estadoPago?: string) => {
      switch (estadoPago) {
        case 'APROBADO':
          return "Pago completado"
        case 'PENDIENTE':
        case 'PROCESANDO':
          return "Pendiente de pago"
        case 'RECHAZADO':
        case 'CANCELADO':
        case 'FALLIDO':
        case 'EXPIRADO':
          return "Pago fallido"
        default:
          return "Sin información de pago"
      }
    }

    return {
      id: reserva.id || "",
      code: (reserva.id || "").substring(0, 8).toUpperCase(),
      place: reserva.hospedaje?.nombre || "Hospedaje",
      image,
      checkIn: fechaInicio,
      checkOut: fechaFin,
      visitors: visitantes,
      roomNames: nombreHabitaciones,
      status: mapearEstado(reserva.estado),
      paymentMethod: reserva.metodoPago || "N/A",
      amount: reserva.montoTotal || 0,
      paymentStatus: mapearEstadoPago(reserva.pagos?.[0]?.estado),
      qrCode: reserva.codigoQrUrl || `/placeholder.svg?height=200&width=200&text=QR+Code+${(reserva.id || "").slice(-3)}`,
      original: reserva, // Guardamos la reserva original
    }
  }) || []

  // Usar solo reservas reales del backend - fallbacks eliminados

  // Estado para el diálogo de detalles
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any | null>(null)

  // Estado para el diálogo de QR
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [qrReservation, setQrReservation] = useState<any | null>(null)

  // Función para abrir el diálogo de detalles
  const openDetailsDialog = (reservation: any) => {
    setSelectedReservation(reservation)
    setIsDetailsDialogOpen(true)
  }

  // Función para abrir el diálogo de QR
  const openQrDialog = (reservation: any) => {
    setQrReservation(reservation)
    setIsQrDialogOpen(true)
  }

  // Función para formatear el rango de fechas
  const formatDateRange = (checkIn: Date, checkOut: Date) => {
    return `${format(checkIn, "d", { locale: es })} - ${format(checkOut, "d 'de' MMMM", { locale: es })}`
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner
        imageSrc="/tourist/cumbrecita012.jpg"
        imageAlt="La Cumbrecita"
        title="Reservas y viajes"
        description="Gestiona tus reservas de estacionamiento en La Cumbrecita y disfruta de este hermoso destino turístico"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Input placeholder="Buscar reservas..." className="pl-10" />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Reserva
          </Button>
        </div>

        <Tabs defaultValue="proximas">
          <TabsList className="mb-6">
            <TabsTrigger value="proximas">Próximas</TabsTrigger>
            <TabsTrigger value="anteriores">Anteriores</TabsTrigger>
            <TabsTrigger value="canceladas">Canceladas</TabsTrigger>
          </TabsList>

          <TabsContent value="proximas" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <p className="text-gray-500">Cargando reservas...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-40 bg-red-50 rounded-md">
                <p className="text-red-500">Error al cargar las reservas</p>
              </div>
            ) : reservations.filter(r => r.status === "Activo" || r.status === "Pendiente").length === 0 ? (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">No tienes reservas próximas</p>
              </div>
            ) : (
              reservations.filter(r => r.status === "Activo" || r.status === "Pendiente").map((reservation) => (
              <div
                key={reservation.id}
                className="flex flex-col md:flex-row border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative w-full md:w-64 h-48 md:h-auto">
                  <Image
                    src={reservation.image || "/placeholder.svg"}
                    alt={reservation.place}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium",
                        reservation.status === "Activo" ? "bg-green-100 text-green-800" :
                        reservation.status === "Pendiente" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      )}
                    >
                      {reservation.status}
                    </span>
                  </div>
                </div>
                <div className="flex-1 p-4 md:p-6 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-semibold">{reservation.place}</h3>
                      <p className="text-sm text-gray-500">Reserva {reservation.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${(reservation.amount || 0).toLocaleString("es-AR")}</p>
                      <p className="text-xs text-gray-500">{reservation.paymentMethod}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm">{formatDateRange(reservation.checkIn, reservation.checkOut)}</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm">{reservation.visitors} visitantes</span>
                    </div>
                    <div className="flex items-center">
                      <Bed className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm">{reservation.roomNames.join(", ")}</span>
                    </div>
                    <div className="flex items-center">
                      <CreditCard className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm">{reservation.paymentStatus}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() => openDetailsDialog(reservation.original!)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver detalles
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 md:flex-none border-gray-200 text-gray-700 hover:bg-gray-50"
                      onClick={() => openQrDialog(reservation.original!)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Reserva
                    </Button>
                  </div>
                </div>
              </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="anteriores" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <p className="text-gray-500">Cargando reservas...</p>
              </div>
            ) : reservations.filter(r => r.status === "Activo" && r.checkOut < new Date()).length === 0 ? (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">No hay reservas anteriores</p>
              </div>
            ) : (
              reservations.filter(r => r.status === "Activo" && r.checkOut < new Date()).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex flex-col md:flex-row border rounded-xl overflow-hidden hover:shadow-md transition-shadow opacity-75"
                >
                  <div className="relative w-full md:w-64 h-48 md:h-auto">
                    <Image
                      src={reservation.image || "/placeholder.svg"}
                      alt={reservation.place}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Completada
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 md:p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{reservation.place}</h3>
                        <p className="text-sm text-gray-500">Reserva {reservation.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${(reservation.amount || 0).toLocaleString("es-AR")}</p>
                        <p className="text-xs text-gray-500">{reservation.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{formatDateRange(reservation.checkIn, reservation.checkOut)}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{reservation.visitors} visitantes</span>
                      </div>
                      <div className="flex items-center">
                        <Bed className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{reservation.roomNames.join(", ")}</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{reservation.paymentStatus}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-gray-200 text-gray-700 hover:bg-gray-50"
                        onClick={() => openDetailsDialog(reservation.original!)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="canceladas" className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <p className="text-gray-500">Cargando reservas...</p>
              </div>
            ) : reservations.filter(r => r.status === "Cancelado").length === 0 ? (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <p className="text-gray-500">No hay reservas canceladas</p>
              </div>
            ) : (
              reservations.filter(r => r.status === "Cancelado").map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex flex-col md:flex-row border rounded-xl overflow-hidden hover:shadow-md transition-shadow opacity-75"
                >
                  <div className="relative w-full md:w-64 h-48 md:h-auto">
                    <Image
                      src={reservation.image || "/placeholder.svg"}
                      alt={reservation.place}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Cancelada
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-4 md:p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{reservation.place}</h3>
                        <p className="text-sm text-gray-500">Reserva {reservation.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${(reservation.amount || 0).toLocaleString("es-AR")}</p>
                        <p className="text-xs text-gray-500">{reservation.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{formatDateRange(reservation.checkIn, reservation.checkOut)}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{reservation.visitors} visitantes</span>
                      </div>
                      <div className="flex items-center">
                        <Bed className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{reservation.roomNames.join(", ")}</span>
                      </div>
                      <div className="flex items-center">
                        <CreditCard className="h-5 w-5 text-orange-500 mr-2" />
                        <span className="text-sm">{reservation.paymentStatus}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none border-gray-200 text-gray-700 hover:bg-gray-50"
                        onClick={() => openDetailsDialog(reservation.original!)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo para mostrar los detalles */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-center">Detalles de la Reserva</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4">
            {selectedReservation && (
              <div className="space-y-6 pr-2">
                <div className="relative h-36 rounded-lg overflow-hidden">
                  <Image
                    src={selectedReservation.hospedaje?.imagenes?.[0]?.url || 
                         selectedReservation.lineas?.[0]?.habitacion?.imagenes?.[0]?.url || 
                         "/placeholder.svg"}
                    alt={selectedReservation.hospedaje?.nombre || "Hospedaje"}
                    fill
                    className="object-cover"
                  />
                </div>

                <div>
                  <h3 className="text-xl font-bold">{selectedReservation.hospedaje?.nombre || "Hospedaje"}</h3>
                  <p className="text-sm text-gray-500">Reserva {selectedReservation.id?.substring(0, 8).toUpperCase() || "Sin ID"}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Fecha de entrada</p>
                    <p>{selectedReservation.fechaInicio ? format(new Date(selectedReservation.fechaInicio), "d 'de' MMMM, yyyy", { locale: es }) : "No disponible"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Fecha de salida</p>
                    <p>{selectedReservation.fechaFin ? format(new Date(selectedReservation.fechaFin), "d 'de' MMMM, yyyy", { locale: es }) : "No disponible"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Habitaciones</p>
                    <p>{selectedReservation.lineas?.map((linea: any) => 
                      linea.habitacion?.tipoHabitacion?.nombre || linea.habitacion?.nombre || "Habitación"
                    ).join(", ") || "Habitación"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Visitantes</p>
                    <p>{selectedReservation.lineas?.reduce((total: number, linea: any) => total + (linea.personas || 0), 0) || 0} personas</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Estado</p>
                    <span
                      className={cn(
                        "inline-block px-2 py-1 rounded-full text-xs font-medium",
                        selectedReservation.estado === "PAGADA" || selectedReservation.estado === "CONFIRMADA" ? "bg-green-100 text-green-800" :
                        selectedReservation.estado === "PENDIENTE_PAGO" || selectedReservation.estado === "CREADA" ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      )}
                    >
                      {selectedReservation.estado || "Sin estado"}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Monto</p>
                    <p className="font-bold">${(selectedReservation.montoTotal || 0).toLocaleString("es-AR")}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Método de pago</p>
                    <p>{selectedReservation.metodoPago || "No especificado"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500 mb-1">Estado del pago</p>
                    <p>{selectedReservation.pagos?.[0]?.estado || "Sin información"}</p>
                  </div>
                </div>

                {/* Información de contacto del hospedaje */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 text-base">Información del hospedaje</h4>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-500 mb-1">Ubicación</p>
                      <p>{selectedReservation.hospedaje?.direccion || "No especificada"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500 mb-1">Teléfono de contacto</p>
                      <p>{selectedReservation.hospedaje?.telefonoContacto || "No especificado"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500 mb-1">Email de contacto</p>
                      <p>{selectedReservation.hospedaje?.mailContacto || "No especificado"}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">QR de Check-in</h4>
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-md border">
                      {selectedReservation.codigoQrUrl ? (
                        <img
                          src={selectedReservation.codigoQrUrl}
                          alt="QR Code"
                          width={150}
                          height={150}
                          className="w-[150px] h-[150px]"
                        />
                      ) : (
                        <Image
                          src={`/placeholder.svg?height=150&width=150&text=QR+${(selectedReservation.id || "").slice(-3)}`}
                          alt="QR Code"
                          width={150}
                          height={150}
                        />
                      )}
                      <p className="text-center mt-2 text-xs font-medium">{selectedReservation.id?.substring(0, 8).toUpperCase() || "Sin ID"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 text-center mt-2">
                    Presenta este código al llegar al establecimiento
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 border-t pt-4 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
              Cerrar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Abrir modal de QR independiente
                setQrReservation(selectedReservation)
                setIsDetailsDialogOpen(false)
                setIsQrDialogOpen(true)
              }}
            >
              Ver QR
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700">
              Descargar comprobante
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar solo el QR */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-center">QR de Check-in</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {qrReservation && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-center">{qrReservation.hospedaje?.nombre || "Hospedaje"}</h3>
                  <p className="text-sm text-gray-500 text-center">Reserva {qrReservation.id?.substring(0, 8).toUpperCase() || "Sin ID"}</p>
                </div>

                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-md border">
                    {qrReservation.codigoQrUrl ? (
                      <img
                        src={qrReservation.codigoQrUrl}
                        alt="QR Code"
                        width={250}
                        height={250}
                        className="w-[250px] h-[250px]"
                      />
                    ) : (
                      <Image 
                        src={`/placeholder.svg?height=250&width=250&text=QR+Code+${(qrReservation.id || "").slice(-3)}`}
                        alt="QR Code" 
                        width={250} 
                        height={250} 
                      />
                    )}
                    <p className="text-center mt-2 font-medium">{qrReservation.id?.substring(0, 8).toUpperCase() || "Sin ID"}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center">
                  Presenta este código QR al llegar al establecimiento para realizar el check-in.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ")
}
