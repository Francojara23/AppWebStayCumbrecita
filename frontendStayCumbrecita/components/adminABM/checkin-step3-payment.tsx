"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Lock,
  Shield,
  Info
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { type DatosCheckinResponse, type DatosPagoCheckin, type TarjetaNueva } from '@/types/checkin'

interface CheckinStep3PaymentProps {
  reservaData: DatosCheckinResponse
  onComplete: (datosPago: DatosPagoCheckin) => void
  isLoading: boolean
}

export function CheckinStep3Payment({ reservaData, onComplete, isLoading }: CheckinStep3PaymentProps) {
  const [opcionPago, setOpcionPago] = useState<'existente' | 'nueva'>(
    reservaData.pagoExistente ? 'existente' : 'nueva'
  )
  const [nuevaTarjeta, setNuevaTarjeta] = useState<TarjetaNueva>({
    titular: '',
    numero: '',
    entidad: '',
    vencimiento: '',
    cve: '',
    tipo: 'CREDITO'
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { toast } = useToast()

  const handleTarjetaChange = (field: keyof TarjetaNueva, value: string) => {
    setNuevaTarjeta(prev => ({
      ...prev,
      [field]: value
    }))

    // Limpiar error si existe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const formatCardNumber = (value: string) => {
    // Remover espacios y caracteres no numéricos
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    
    // Agregar espacios cada 4 dígitos
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiry = (value: string) => {
    // Formato MM/YY
    const v = value.replace(/\D/g, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4)
    }
    return v
  }

  const validateNuevaTarjeta = (): boolean => {
    const newErrors: { [key: string]: string } = {}
    let isValid = true

    if (!nuevaTarjeta.titular.trim()) {
      newErrors.titular = 'Titular es obligatorio'
      isValid = false
    }

    const numeroLimpio = nuevaTarjeta.numero.replace(/\s/g, '')
    if (!numeroLimpio) {
      newErrors.numero = 'Número de tarjeta es obligatorio'
      isValid = false
    } else if (numeroLimpio.length < 13 || numeroLimpio.length > 19) {
      newErrors.numero = 'Número de tarjeta inválido'
      isValid = false
    }

    if (!nuevaTarjeta.entidad.trim()) {
      newErrors.entidad = 'Entidad es obligatoria'
      isValid = false
    }

    if (!nuevaTarjeta.vencimiento) {
      newErrors.vencimiento = 'Vencimiento es obligatorio'
      isValid = false
    } else if (!/^\d{2}\/\d{2}$/.test(nuevaTarjeta.vencimiento)) {
      newErrors.vencimiento = 'Formato inválido (MM/YY)'
      isValid = false
    }

    if (!nuevaTarjeta.cve) {
      newErrors.cve = 'CVE es obligatorio'
      isValid = false
    } else if (!/^\d{3,4}$/.test(nuevaTarjeta.cve)) {
      newErrors.cve = 'CVE debe tener 3 o 4 dígitos'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = () => {
    if (opcionPago === 'existente' && reservaData.pagoExistente) {
      // Usar pago existente
      const datosPago: DatosPagoCheckin = {
        usarPagoExistente: true,
        pagoExistenteId: reservaData.pagoExistente.id
      }
      onComplete(datosPago)
    } else if (opcionPago === 'nueva') {
      // Validar nueva tarjeta
      if (!validateNuevaTarjeta()) {
        toast({
          title: "❌ Datos incompletos",
          description: "Por favor completa todos los campos de la tarjeta",
          variant: "destructive"
        })
        return
      }

      const datosPago: DatosPagoCheckin = {
        usarPagoExistente: false,
        nuevaTarjeta: {
          ...nuevaTarjeta,
          numero: nuevaTarjeta.numero.replace(/\s/g, '') // Remover espacios
        }
      }
      onComplete(datosPago)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-green-600" />
            Confirmación de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Datos encriptados y temporales</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-blue-500" />
              <span>Eliminación automática en checkout</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opciones de pago */}
      <Card>
        <CardHeader>
          <CardTitle>Método de Pago</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={opcionPago} 
            onValueChange={(value) => setOpcionPago(value as 'existente' | 'nueva')}
            className="space-y-4"
          >
            {/* Pago existente */}
            {reservaData.pagoExistente && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existente" id="existente" />
                  <Label htmlFor="existente" className="flex-1">
                    Usar tarjeta del pago original
                  </Label>
                </div>
                
                {opcionPago === 'existente' && (
                  <Card className="ml-6 border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-4">
                        <CreditCard className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="font-medium">{reservaData.pagoExistente.titular}</p>
                          <p className="text-sm text-gray-600">{reservaData.pagoExistente.numeroMasked}</p>
                          <p className="text-xs text-gray-500">{reservaData.pagoExistente.entidad}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          Verificada
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Nueva tarjeta */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nueva" id="nueva" />
                <Label htmlFor="nueva" className="flex-1">
                  Usar nueva tarjeta
                </Label>
              </div>

              {opcionPago === 'nueva' && (
                <Card className="ml-6">
                  <CardContent className="pt-4 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Titular */}
                      <div className="md:col-span-2">
                        <Label htmlFor="titular">Titular de la tarjeta *</Label>
                        <Input
                          id="titular"
                          value={nuevaTarjeta.titular}
                          onChange={(e) => handleTarjetaChange('titular', e.target.value.toUpperCase())}
                          placeholder="JUAN PEREZ"
                          className={errors.titular ? 'border-red-500' : ''}
                        />
                        {errors.titular && (
                          <p className="text-sm text-red-500 mt-1">{errors.titular}</p>
                        )}
                      </div>

                      {/* Número */}
                      <div className="md:col-span-2">
                        <Label htmlFor="numero">Número de tarjeta *</Label>
                        <Input
                          id="numero"
                          value={nuevaTarjeta.numero}
                          onChange={(e) => handleTarjetaChange('numero', formatCardNumber(e.target.value))}
                          placeholder="1234 5678 9012 3456"
                          maxLength={19}
                          className={errors.numero ? 'border-red-500' : ''}
                        />
                        {errors.numero && (
                          <p className="text-sm text-red-500 mt-1">{errors.numero}</p>
                        )}
                      </div>

                      {/* Entidad */}
                      <div>
                        <Label htmlFor="entidad">Entidad *</Label>
                        <Input
                          id="entidad"
                          value={nuevaTarjeta.entidad}
                          onChange={(e) => handleTarjetaChange('entidad', e.target.value.toUpperCase())}
                          placeholder="VISA, MASTERCARD, etc."
                          className={errors.entidad ? 'border-red-500' : ''}
                        />
                        {errors.entidad && (
                          <p className="text-sm text-red-500 mt-1">{errors.entidad}</p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div>
                        <Label htmlFor="tipo">Tipo de tarjeta</Label>
                        <select
                          id="tipo"
                          value={nuevaTarjeta.tipo}
                          onChange={(e) => handleTarjetaChange('tipo', e.target.value as 'CREDITO' | 'DEBITO')}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                          <option value="CREDITO">Crédito</option>
                          <option value="DEBITO">Débito</option>
                        </select>
                      </div>

                      {/* Vencimiento */}
                      <div>
                        <Label htmlFor="vencimiento">Vencimiento *</Label>
                        <Input
                          id="vencimiento"
                          value={nuevaTarjeta.vencimiento}
                          onChange={(e) => handleTarjetaChange('vencimiento', formatExpiry(e.target.value))}
                          placeholder="MM/YY"
                          maxLength={5}
                          className={errors.vencimiento ? 'border-red-500' : ''}
                        />
                        {errors.vencimiento && (
                          <p className="text-sm text-red-500 mt-1">{errors.vencimiento}</p>
                        )}
                      </div>

                      {/* CVE */}
                      <div>
                        <Label htmlFor="cve">CVE *</Label>
                        <Input
                          id="cve"
                          value={nuevaTarjeta.cve}
                          onChange={(e) => handleTarjetaChange('cve', e.target.value.replace(/\D/g, ''))}
                          placeholder="123"
                          maxLength={4}
                          className={errors.cve ? 'border-red-500' : ''}
                        />
                        {errors.cve && (
                          <p className="text-sm text-red-500 mt-1">{errors.cve}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Información de seguridad */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Información importante:</strong> Los datos de la tarjeta se almacenan de forma temporal 
          y encriptada únicamente durante la estadía. Se eliminan automáticamente al realizar el checkout.
        </AlertDescription>
      </Alert>

      {/* Botón finalizar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p className="font-medium">Finalizar Check-in</p>
              <p>Reserva: {reservaData.reserva.codigo}</p>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isLoading ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completar Check-in
                </>
              )}
            </Button>
          </div>

          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor corrige los errores en el formulario
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}