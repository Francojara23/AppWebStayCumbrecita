"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  Users, 
  Home, 
  CreditCard, 
  User, 
  Phone, 
  Mail, 
  ArrowRight,
  Clock,
  MapPin
} from 'lucide-react'
import { DatosCheckout } from '@/types/checkout'

interface CheckoutStep1DetailsProps {
  datos: DatosCheckout
  onNext: () => void
}

export function CheckoutStep1Details({ datos, onNext }: CheckoutStep1DetailsProps) {
  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const getEstadoBadge = (estado: string) => {
    const estados = {
      'CHECK_IN': { label: 'Check-in', color: 'bg-blue-100 text-blue-800' },
      'CONFIRMADO': { label: 'Confirmado', color: 'bg-green-100 text-green-800' },
      'APROBADO': { label: 'Aprobado', color: 'bg-green-100 text-green-800' },
      'PENDIENTE': { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' }
    }
    
    const config = estados[estado as keyof typeof estados] || { label: estado, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Información de la Reserva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-orange-600" />
            Información de la Reserva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Código:</span>
                <span className="font-mono text-lg font-bold text-orange-600">
                  {datos.reserva.codigo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Estado:</span>
                {getEstadoBadge(datos.reserva.estado)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Hospedaje:</span>
                <span className="text-right font-medium">{datos.reserva.hospedaje}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Check-in</p>
                  <p className="text-sm text-gray-600">{formatDate(datos.reserva.fechaInicio)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Check-out programado</p>
                  <p className="text-sm text-gray-600">{formatDate(datos.reserva.fechaFin)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Check-in realizado</p>
                  <p className="text-sm text-gray-600">{formatDate(datos.reserva.fechaCheckin)}</p>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-orange-600">{datos.totalNoches}</p>
              <p className="text-sm text-gray-600">Noches</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{datos.habitaciones.length}</p>
              <p className="text-sm text-gray-600">Habitaciones</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{datos.totalHuespedes}</p>
              <p className="text-sm text-gray-600">Huéspedes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del Titular */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Titular de la Reserva
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-600">Nombre completo</p>
                <p className="font-medium">{datos.titular.nombre} {datos.titular.apellido}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">DNI</p>
                <p className="font-mono">{datos.titular.dni}</p>
              </div>
            </div>
            <div className="space-y-2">
              {datos.titular.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Teléfono</p>
                    <p>{datos.titular.telefono}</p>
                  </div>
                </div>
              )}
              {datos.titular.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Email</p>
                    <p className="text-sm break-all">{datos.titular.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Habitaciones y Huéspedes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            Habitaciones y Huéspedes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {datos.habitaciones.map((habitacion, index) => (
            <div key={habitacion.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-lg">{habitacion.nombre}</h4>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    Capacidad: {habitacion.capacidad}
                  </Badge>
                  <Badge variant="outline">
                    Registrados: {habitacion.personasRegistradas}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {habitacion.huespedes.map((huesped, huespedIndex) => (
                  <div key={huespedIndex} className="bg-gray-50 rounded p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">
                        {huesped.nombre} {huesped.apellido}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>DNI: {huesped.dni}</p>
                      {huesped.telefono && <p>Tel: {huesped.telefono}</p>}
                      {huesped.email && <p>Email: {huesped.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pagos Realizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            Pagos Realizados
          </CardTitle>
        </CardHeader>
        <CardContent>
          {datos.pagos.length > 0 ? (
            <div className="space-y-3">
              {datos.pagos.map((pago, index) => (
                <div key={pago.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{pago.concepto}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(pago.fechaPago)}
                      {pago.numeroMasked && ` • ${pago.numeroMasked}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">
                      {formatCurrency(pago.monto)}
                    </p>
                    {getEstadoBadge(pago.estado)}
                  </div>
                </div>
              ))}
              
              <Separator />
              
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total Pagado:</span>
                <span className="text-green-600">
                  {formatCurrency(datos.pagos.reduce((sum, pago) => sum + pago.monto, 0))}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No hay pagos registrados
            </p>
          )}
        </CardContent>
      </Card>

      {/* Observaciones */}
      {datos.reserva.observaciones && (
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{datos.reserva.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Botón Continuar */}
      <div className="flex justify-end pt-4">
        <Button onClick={onNext} className="bg-orange-600 hover:bg-orange-700">
          Continuar a Cargos
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}