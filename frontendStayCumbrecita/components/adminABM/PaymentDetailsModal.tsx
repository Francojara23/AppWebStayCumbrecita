"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Building,
  Hash
} from "lucide-react"

interface PaymentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  publicidad: any // Datos de la publicidad con sus pagos
  hospedajeName: string
}

export default function PaymentDetailsModal({ 
  isOpen, 
  onClose, 
  publicidad, 
  hospedajeName 
}: PaymentDetailsModalProps) {
  if (!publicidad || !publicidad.pagos || publicidad.pagos.length === 0) {
    return null
  }

  // Tomar el primer pago (debería ser el único para publicidad)
  const pago = publicidad.pagos[0]

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'APROBADO':
        return 'bg-green-100 text-green-800'
      case 'RECHAZADO':
        return 'bg-red-100 text-red-800'
      case 'PROCESANDO':
        return 'bg-yellow-100 text-yellow-800'
      case 'PENDIENTE':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELADO':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'APROBADO':
        return <CheckCircle className="h-4 w-4" />
      case 'RECHAZADO':
        return <XCircle className="h-4 w-4" />
      case 'PROCESANDO':
        return <Clock className="h-4 w-4" />
      case 'PENDIENTE':
        return <Clock className="h-4 w-4" />
      case 'CANCELADO':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const maskCardNumber = (cardNumber: string) => {
    if (!cardNumber) return 'N/A'
    return cardNumber.replace(/(\d{4})\d{8}(\d{4})/, '$1 **** **** $2')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-orange-700">
            <CreditCard className="h-5 w-5" />
            Detalles del Pago - Publicidad
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-4 w-4" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Hospedaje</p>
                  <p className="text-sm font-semibold">{hospedajeName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">ID del Pago</p>
                  <p className="text-sm font-mono text-gray-900">{pago.id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Estado</p>
                  <Badge className={`flex items-center gap-1 w-fit ${getEstadoColor(pago.estado)}`}>
                    {getEstadoIcon(pago.estado)}
                    {pago.estado}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Método de Pago</p>
                  <p className="text-sm font-semibold">{pago.metodo}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Monetaria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-4 w-4" />
                Información Monetaria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Monto de Publicidad:</span>
                  <span className="text-2xl font-bold text-orange-600">{formatCurrency(pago.montoTotal || 0)}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500 italic">
                    * La publicidad no incluye impuestos adicionales
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información de la Tarjeta */}
          {pago.metodo === 'TARJETA' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-4 w-4" />
                  Información de la Tarjeta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Número de Tarjeta</p>
                    <p className="text-sm font-mono">{maskCardNumber(pago.numeroEncriptado || '')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Titular</p>
                    <p className="text-sm font-semibold">{pago.titularEncriptado || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vencimiento</p>
                    <p className="text-sm font-semibold">{pago.vencimientoEncriptado || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tipo de Tarjeta</p>
                    <p className="text-sm font-semibold">
                      {pago.tarjeta?.tipo || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información de Fechas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de Pago</p>
                  <p className="text-sm font-semibold">
                    {pago.fechaPago 
                      ? format(new Date(pago.fechaPago), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Período de Publicidad</p>
                  <p className="text-sm font-semibold">
                    {publicidad.fechaInicio && publicidad.fechaFin 
                      ? `${format(new Date(publicidad.fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(publicidad.fechaFin), "dd/MM/yyyy", { locale: es })}`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Usuario */}
          {pago.usuario && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-4 w-4" />
                  Usuario
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Nombre</p>
                    <p className="text-sm font-semibold">
                      {pago.usuario.nombre} {pago.usuario.apellido}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-sm font-semibold">{pago.usuario.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Hash className="h-4 w-4" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Renovación Automática</p>
                  <Badge variant={publicidad.renovacionAutomatica ? "default" : "secondary"}>
                    {publicidad.renovacionAutomatica ? "Activada" : "Desactivada"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Estado de la Publicidad</p>
                  <Badge className={`
                    ${publicidad.estado === 'ACTIVA' 
                      ? 'bg-green-100 text-green-800' 
                      : publicidad.estado === 'EXPIRADA' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-800'
                    }
                  `}>
                    {publicidad.estado}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto Acumulado del Hospedaje</p>
                  <p className="text-sm font-semibold text-orange-600">
                    {formatCurrency(publicidad.montoAcumulado || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
} 