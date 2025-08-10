"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  ArrowLeft, 
  CreditCard, 
  Receipt, 
  AlertTriangle,
  DollarSign,
  FileText
} from 'lucide-react'
import { DatosCheckout, CargoAdicional, CONCEPTOS_PREDEFINIDOS } from '@/types/checkout'

interface CheckoutStep3ConfirmationProps {
  datosReserva: DatosCheckout
  cargosAdicionales: CargoAdicional[]
  onComplete: (observaciones: string) => void
  onBack: () => void
  isLoading: boolean
  initialObservaciones?: string
}

export function CheckoutStep3Confirmation({ 
  datosReserva, 
  cargosAdicionales, 
  onComplete, 
  onBack, 
  isLoading,
  initialObservaciones = ''
}: CheckoutStep3ConfirmationProps) {
  const [observaciones, setObservaciones] = useState(initialObservaciones)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const totalCargosAdicionales = cargosAdicionales.reduce((sum, cargo) => sum + cargo.monto, 0)

  const handleConfirmarCheckout = () => {
    onComplete(observaciones.trim())
  }

  return (
    <div className="space-y-6">
      {/* Resumen de la Reserva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            Resumen del Checkout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Reserva</p>
              <p className="font-mono text-lg font-bold text-blue-600">
                {datosReserva.reserva.codigo}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Hospedaje</p>
              <p className="font-medium">{datosReserva.reserva.hospedaje}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Titular</p>
              <p className="font-medium">
                {datosReserva.titular.nombre} {datosReserva.titular.apellido}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Período</p>
              <p className="text-sm">
                {formatDate(datosReserva.reserva.fechaInicio)} - {formatDate(datosReserva.reserva.fechaFin)}
              </p>
              <p className="text-xs text-gray-500">
                {datosReserva.totalNoches} noche{datosReserva.totalNoches !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* Cargos Adicionales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-orange-600" />
            Cargos Adicionales
            {cargosAdicionales.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {cargosAdicionales.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cargosAdicionales.length > 0 ? (
            <div className="space-y-3">
              {cargosAdicionales.map((cargo, index) => {
                const concepto = CONCEPTOS_PREDEFINIDOS.find(c => c.value === cargo.concepto)
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{concepto?.icon}</span>
                      <div>
                        <p className="font-medium">{concepto?.label}</p>
                        {cargo.descripcion && (
                          <p className="text-sm text-gray-600">{cargo.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <span className="font-bold text-orange-600">
                      {formatCurrency(cargo.monto)}
                    </span>
                  </div>
                )
              })}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Subtotal Cargos:</span>
                <span className="font-bold text-orange-600">
                  {formatCurrency(totalCargosAdicionales)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-gray-500">No hay cargos adicionales</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total General */}
      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-blue-900">Total a Procesar</h3>
              <p className="text-sm text-blue-700">
                {cargosAdicionales.length === 0 
                  ? 'Sin cargos adicionales' 
                  : `${cargosAdicionales.length} cargo${cargosAdicionales.length !== 1 ? 's' : ''} adicional${cargosAdicionales.length !== 1 ? 'es' : ''}`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(totalCargosAdicionales)}
              </p>
              <p className="text-sm text-gray-600">
                Nuevos cargos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Método de Pago */}
      {cargosAdicionales.length > 0 && totalCargosAdicionales > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Método de Pago</h4>
                <p className="text-sm text-yellow-800 mt-1">
                  Los cargos adicionales se procesarán con la misma tarjeta utilizada en el check-in.
                  Si la tarjeta falla, se solicitará una nueva forma de pago.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-600" />
            Observaciones del Checkout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones adicionales (opcional)</Label>
            <Textarea
              id="observaciones"
              placeholder="Comentarios sobre el checkout, estado de la habitación, etc..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <Button 
          onClick={handleConfirmarCheckout}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 min-w-[200px]"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Procesando...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirmar Checkout
              {totalCargosAdicionales > 0 && (
                <span className="ml-1">({formatCurrency(totalCargosAdicionales)})</span>
              )}
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}