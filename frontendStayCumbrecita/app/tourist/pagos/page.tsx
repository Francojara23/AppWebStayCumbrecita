"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Download, Trash2, Search, CreditCard, ArrowRightLeft, Eye, Calendar, Receipt } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionBanner } from "@/components/tourist/section-banner"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Image from "next/image"
import { useUser } from "@/hooks/use-user"
import { usePagosUsuario } from "@/hooks/use-api"

// Tipos para la UI (mantenemos compatibilidad con el componente existente)
interface PaymentDetails {
  cardholderName?: string
  cardNumber?: string
  cardType?: string
  expiryDate?: string
  originAccount?: string
  originOwner?: string
  destinationAccount?: string
  destinationOwner?: string
  transferDate?: string
  transferId?: string
}

interface BackendPayment {
  id: string
  reservaId?: string | null
  metodo: "TARJETA" | "TRANSFERENCIA"
  estado: "PENDIENTE" | "PROCESANDO" | "APROBADO" | "RECHAZADO" | "CANCELADO" | "EXPIRADO" | "FALLIDO"
  montoReserva: number
  montoImpuestos: number
  montoTotal: number
  fechaPago: string
  reserva?: {
    id: string
    fechaInicio: string
    fechaFin: string
    estado: string
    montoTotal: number
    impuestos21: number
    hospedaje?: {
      id: string
      nombre: string
      direccion: string
      imagenUrl?: string | null
    } | null
    turista?: {
      id: string
      nombre: string
      apellido: string
      email: string
    } | null
  } | null
  tarjeta?: {
    ultimosDigitos: string
    titular: string
    tipo: string
    vencimiento: string
    entidad: string
  } | null
}

interface UIPayment {
  id: string
  place: string
  date: string
  method: "Tarjeta" | "Transferencia"
  amount: number
  invoice: string
  status: "completed" | "pending" | "failed"
  image: string
  details: PaymentDetails
}

export default function HistorialPagosPage() {
  // Usar el hook useUser para obtener el usuario autenticado
  const { user } = useUser()

  // Hook para obtener pagos del backend
  const { data: pagosData, isLoading, error } = usePagosUsuario(user?.id)

  // Función para transformar datos del backend a formato UI
  const transformBackendPayment = (backendPayment: BackendPayment): UIPayment => {
    // Usar información completa de la reserva si está disponible
    const hospedajeName = backendPayment.reserva?.hospedaje?.nombre || 
                         (backendPayment.reservaId ? `Reserva ${backendPayment.reservaId.slice(-8)}` : "Pago sin reserva")
    const hospedajeImage = backendPayment.reserva?.hospedaje?.imagenUrl || "/placeholder.jpg"
    
    // Mapear estados del backend a estados de la UI
    const statusMap: Record<string, "completed" | "pending" | "failed"> = {
      "APROBADO": "completed",
      "PENDIENTE": "pending",
      "PROCESANDO": "pending",
      "RECHAZADO": "failed",
      "CANCELADO": "failed",
      "EXPIRADO": "failed",
      "FALLIDO": "failed"
    }

    const details: PaymentDetails = {}
    
    if (backendPayment.metodo === "TARJETA") {
      // Usar información completa de tarjeta
      const ultimosDigitos = backendPayment.tarjeta?.ultimosDigitos || "****"
      details.cardholderName = backendPayment.tarjeta?.titular || "No disponible"
      details.cardNumber = `**** **** **** ${ultimosDigitos}`
      details.cardType = backendPayment.tarjeta?.tipo || "No disponible"
      details.expiryDate = backendPayment.tarjeta?.vencimiento || "**/**"
    } else if (backendPayment.metodo === "TRANSFERENCIA") {
      details.originAccount = "Cuenta origen"
      details.originOwner = "Propietario origen"
      details.destinationAccount = "Cuenta destino"
      details.destinationOwner = hospedajeName
      details.transferDate = new Date(backendPayment.fechaPago).toLocaleDateString()
      details.transferId = `TRF-${backendPayment.id.slice(-8)}`
    }

    return {
      id: backendPayment.id,
      place: hospedajeName,
      date: new Date(backendPayment.fechaPago).toLocaleDateString(),
      method: backendPayment.metodo === "TARJETA" ? "Tarjeta" : "Transferencia",
      amount: backendPayment.montoTotal,
      invoice: `factura-${backendPayment.id}.pdf`,
      status: statusMap[backendPayment.estado] || "pending",
      image: hospedajeImage,
      details
    }
  }

  // Procesar pagos para el formato UI
  const payments: UIPayment[] = pagosData?.data?.map(transformBackendPayment) || []

  // Mostrar error si hay
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos",
        variant: "destructive"
      })
    }
  }, [error])

  // Datos hardcodeados como fallback (se pueden eliminar después)
  const fallbackPayments: UIPayment[] = [
    {
      id: "pay-1",
      place: "Hotel Las Cascadas",
      date: "14-11-2024",
      method: "Tarjeta",
      amount: 40999.0,
      invoice: "factura-1.pdf",
      status: "completed",
      image: "/mountain-cabin-retreat.png",
      details: {
        cardholderName: "Juan Pérez",
        cardNumber: "4532 **** **** 7890",
        cardType: "Visa",
        expiryDate: "05/26",
      },
    },
    {
      id: "pay-2",
      place: "Brisas del Champaquí",
      date: "19-07-2024",
      method: "Transferencia",
      amount: 33455.32,
      invoice: "factura-2.pdf",
      status: "completed",
      image: "/alpine-vista-retreat.png",
      details: {
        originAccount: "Banco Nación - CA ****3456",
        originOwner: "Juan Pérez",
        destinationAccount: "Banco Galicia - CA ****7890",
        destinationOwner: "Brisas del Champaquí S.A.",
        transferDate: "19-07-2024",
        transferId: "TRF-78901234",
      },
    },
    {
      id: "pay-3",
      place: "Cabañas del Bosque",
      date: "05-06-2024",
      method: "Tarjeta",
      amount: 28750.5,
      invoice: "factura-3.pdf",
      status: "completed",
      image: "/forest-cabin-retreat.png",
      details: {
        cardholderName: "Juan Pérez",
        cardNumber: "5412 **** **** 1234",
        cardType: "Mastercard",
        expiryDate: "08/25",
      },
    },
    {
      id: "pay-4",
      place: "Posada del Río",
      date: "22-05-2024",
      method: "Transferencia",
      amount: 15600.0,
      invoice: "factura-4.pdf",
      status: "pending",
      image: "/mountain-pool-retreat.png",
      details: {
        originAccount: "Banco Santander - CA ****5678",
        originOwner: "Juan Pérez",
        destinationAccount: "Banco Provincia - CA ****4321",
        destinationOwner: "Posada del Río S.R.L.",
        transferDate: "22-05-2024",
        transferId: "TRF-12345678",
      },
    },
  ]

  // Estado para el diálogo de confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null)

  // Estado para el diálogo de detalles de pago
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<UIPayment | null>(null)

  // Estado para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [methodFilter, setMethodFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState("recent")

  // Función para descargar la factura (simulada)
  const handleDownloadInvoice = (invoiceFile: string) => {
    // En una implementación real, aquí se descargaría el archivo
    toast({
      title: "Descargando factura",
      description: `Descargando ${invoiceFile}...`,
    })
  }

  // Función para eliminar un pago
  const handleDeletePayment = (paymentId: string) => {
    setPaymentToDelete(paymentId)
    setIsDeleteDialogOpen(true)
  }

  // Función para confirmar la eliminación
  const confirmDelete = () => {
    if (paymentToDelete) {
      // TODO: Implementar eliminación en el backend
      setIsDeleteDialogOpen(false)
      setPaymentToDelete(null)

      toast({
        title: "Función no disponible",
        description: "La eliminación de pagos no está disponible actualmente",
        variant: "destructive"
      })
    }
  }

  // Función para mostrar detalles de pago
  const showPaymentDetails = (payment: UIPayment) => {
    setSelectedPayment(payment)
    setIsDetailDialogOpen(true)
  }

  // Filtrar pagos según los criterios seleccionados
  const filteredPayments = payments.filter((payment) => {
    // Filtro por término de búsqueda
    const matchesSearch =
      payment.place.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.id.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro por método de pago
    const matchesMethod = methodFilter === "all" || payment.method === methodFilter

    // Filtro por estado
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter

    return matchesSearch && matchesMethod && matchesStatus
  })

  // Ordenar pagos
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const dateA = new Date(a.date.split("-").reverse().join("-"))
    const dateB = new Date(b.date.split("-").reverse().join("-"))

    switch (sortOrder) {
      case "recent":
        return dateB.getTime() - dateA.getTime()
      case "oldest":
        return dateA.getTime() - dateB.getTime()
      case "amount-high":
        return b.amount - a.amount
      case "amount-low":
        return a.amount - b.amount
      default:
        return 0
    }
  })

  // Función para obtener el color del badge según el estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      case "pending":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
      case "failed":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  // Función para obtener el texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Completado"
      case "pending":
        return "Pendiente"
      case "failed":
        return "Fallido"
      default:
        return status
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner 
        title="Historial de pagos" 
        description="Aquí podrás ver el historial de tus pagos realizados."
        imageSrc="/bannerTuristaImagen.jpg"
        imageAlt="Banner de historial de pagos"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Input
              placeholder="Buscar pagos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filtrar por método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los métodos</SelectItem>
                <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completed">Completados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
                <SelectItem value="amount-high">Mayor importe</SelectItem>
                <SelectItem value="amount-low">Menor importe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="h-60 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando pagos...</p>
            </div>
          </div>
        ) : sortedPayments.length === 0 ? (
          <div className="h-60 flex items-center justify-center bg-gray-50 rounded-md">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay registros de pagos</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedPayments.map((payment) => (
              <Card
                key={payment.id}
                className="overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={payment.image || "/placeholder.svg"}
                    alt={payment.place}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
                <CardContent className="p-0">
                  <div className="bg-gray-50 p-4 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{payment.place}</h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {payment.date}
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(payment.status)}`}>{getStatusText(payment.status)}</Badge>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        {payment.method === "Tarjeta" ? (
                          <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4 mr-2 text-gray-500" />
                        )}
                        <span className="text-sm">{payment.method}</span>
                      </div>
                      <div className="font-semibold text-lg">
                        $
                        {payment.amount.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>

                    {payment.method === "Tarjeta" && payment.details.cardNumber && (
                      <div className="text-sm text-gray-600 mb-2">
                        Tarjeta: ****{payment.details.cardNumber.split(" ").slice(-1)[0]}
                      </div>
                    )}

                    {payment.method === "Transferencia" && (
                      <div className="text-sm text-gray-600 mb-2">ID: {payment.details.transferId}</div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="bg-gray-50 p-3 border-t flex justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:bg-gray-100"
                    onClick={() => handleDownloadInvoice(payment.invoice)}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Factura
                  </Button>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-700 hover:bg-gray-100"
                      onClick={() => showPaymentDetails(payment)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Detalles
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-700 hover:bg-gray-100"
                      onClick={() => handleDeletePayment(payment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            ¿Está seguro que desea eliminar este registro de pago? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalles de pago */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Detalles del pago</DialogTitle>
          </DialogHeader>

          {selectedPayment && (
            <div className="py-4">
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={selectedPayment.image || "/placeholder.svg"}
                      alt={selectedPayment.place}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedPayment.place}</h3>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-3.5 w-3.5 mr-1" />
                      {selectedPayment.date}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500">Método de pago:</span>
                  <span>{selectedPayment.method}</span>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500">Monto:</span>
                  <span className="font-semibold">
                    $
                    {selectedPayment.amount.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Estado:</span>
                  <Badge className={`${getStatusColor(selectedPayment.status)}`}>
                    {getStatusText(selectedPayment.status)}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Información detallada</h4>

                <Tabs defaultValue={selectedPayment.method.toLowerCase()}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="tarjeta" disabled={selectedPayment.method !== "Tarjeta"}>
                      Tarjeta
                    </TabsTrigger>
                    <TabsTrigger value="transferencia" disabled={selectedPayment.method !== "Transferencia"}>
                      Transferencia
                    </TabsTrigger>
                  </TabsList>

                  {selectedPayment.method === "Tarjeta" && (
                    <TabsContent value="tarjeta" className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Titular:</div>
                        <div className="font-medium">{selectedPayment.details.cardholderName}</div>

                        <div className="text-gray-500">Número de tarjeta:</div>
                        <div className="font-medium">{selectedPayment.details.cardNumber}</div>

                        <div className="text-gray-500">Tipo de tarjeta:</div>
                        <div className="font-medium">{selectedPayment.details.cardType}</div>

                        <div className="text-gray-500">Fecha de vencimiento:</div>
                        <div className="font-medium">{selectedPayment.details.expiryDate}</div>
                      </div>
                    </TabsContent>
                  )}

                  {selectedPayment.method === "Transferencia" && (
                    <TabsContent value="transferencia" className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-500">Cuenta de origen:</div>
                        <div className="font-medium">{selectedPayment.details.originAccount}</div>

                        <div className="text-gray-500">Titular de origen:</div>
                        <div className="font-medium">{selectedPayment.details.originOwner}</div>

                        <div className="text-gray-500">Cuenta de destino:</div>
                        <div className="font-medium">{selectedPayment.details.destinationAccount}</div>

                        <div className="text-gray-500">Titular de destino:</div>
                        <div className="font-medium">{selectedPayment.details.destinationOwner}</div>

                        <div className="text-gray-500">Fecha de transferencia:</div>
                        <div className="font-medium">{selectedPayment.details.transferDate}</div>

                        <div className="text-gray-500">ID de transferencia:</div>
                        <div className="font-medium">{selectedPayment.details.transferId}</div>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedPayment && handleDownloadInvoice(selectedPayment.invoice)}
              className="mr-auto text-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar factura
            </Button>
            <Button onClick={() => setIsDetailDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
