"use client"

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CheckinStep1Scanner } from './checkin-step1-scanner'
import { CheckinStep2Guests } from './checkin-step2-guests'
import { CheckinStep3Payment } from './checkin-step3-payment'
import { type DatosCheckinResponse, type CheckinCompletoData } from '@/types/checkin'
import { getClientApiUrl } from '@/lib/utils/api-urls'

interface CheckinWizardProps {
  onClose: () => void
  onStepChange: (step: number) => void
}

export function CheckinWizard({ onClose, onStepChange }: CheckinWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [checkinData, setCheckinData] = useState<Partial<CheckinCompletoData>>({})
  const [reservaData, setReservaData] = useState<DatosCheckinResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleStepChange = (step: number) => {
    setCurrentStep(step)
    onStepChange(step)
  }

  const handleStep1Complete = (qrData: string, datos: DatosCheckinResponse) => {
    setCheckinData(prev => ({
      ...prev,
      reservaId: datos.reserva.id,
      qrData: qrData
    }))
    setReservaData(datos)
    handleStepChange(2)
  }

  const handleStep2Complete = (huespedesPorHabitacion: any[]) => {
    setCheckinData(prev => ({
      ...prev,
      huespedesPorHabitacion
    }))
    handleStepChange(3)
  }

  const handleStep3Complete = (datosPago: any) => {
    setCheckinData(prev => ({
      ...prev,
      datosPago
    }))
    handleFinalSubmit({
      ...checkinData,
      datosPago
    } as CheckinCompletoData)
  }

  // Transformar datos del frontend al formato que espera el backend
  const transformarDatosParaBackend = (data: CheckinCompletoData) => {
    return {
      reservaId: data.reservaId,
      qrData: data.qrData,
      huespedesPorHabitacion: data.huespedesPorHabitacion.map(hab => ({
        habitacionId: hab.id, // id -> habitacionId
        habitacionNombre: hab.nombre, // nombre -> habitacionNombre  
        capacidad: hab.capacidad,
        personasReservadas: hab.personasReservadas,
        huespedes: hab.huespedes.map(huesped => ({
          nombre: huesped.nombre,
          apellido: huesped.apellido,
          dni: huesped.dni,
          telefono: huesped.telefono || undefined,
          email: huesped.email || undefined // Enviar como undefined si está vacío
        }))
      })),
      datosPago: {
        usarPagoExistente: data.datosPago.usarPagoExistente,
        pagoExistenteId: data.datosPago.pagoExistenteId || undefined,
        nuevaTarjeta: data.datosPago.nuevaTarjeta || undefined
      }
    }
  }

  const handleFinalSubmit = async (finalData: CheckinCompletoData) => {
    try {
      setIsLoading(true)
      
      console.log('🚀 Datos originales del frontend:', finalData)
      
      const datosTransformados = transformarDatosParaBackend(finalData)
      console.log('🔄 Datos transformados para backend:', datosTransformados)
      console.log('📋 Estructura detallada:', JSON.stringify(datosTransformados, null, 2))
      
      const response = await fetch(`${getClientApiUrl()}/reservas/checkin-completo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Para incluir cookies de autenticación
        body: JSON.stringify(datosTransformados),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
        console.error('❌ Error en respuesta del check-in:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Check-in completado exitosamente:', result)

      toast({
        title: "✅ Check-in completado",
        description: `Reserva ${result.codigo} registrada exitosamente`,
        variant: "default"
      })

      onClose()
    } catch (error) {
      console.error('❌ Error en check-in:', error)
      
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      toast({
        title: "❌ Error",
        description: `No se pudo completar el check-in: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      handleStepChange(currentStep - 1)
    }
  }

  const canGoBack = currentStep > 1 && !isLoading

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentStep === 1 && 'Escanear Código QR'}
              {currentStep === 2 && 'Registro de Huéspedes'}
              {currentStep === 3 && 'Confirmación de Pago'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {currentStep === 1 && 'Escanea el código QR de la reserva para comenzar'}
              {currentStep === 2 && 'Completa los datos de todos los huéspedes por habitación'}
              {currentStep === 3 && 'Confirma o actualiza los datos de pago'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <CheckinStep1Scanner onComplete={handleStep1Complete} />
          )}
          
          {currentStep === 2 && reservaData && (
            <CheckinStep2Guests 
              reservaData={reservaData}
              onComplete={handleStep2Complete}
            />
          )}
          
          {currentStep === 3 && reservaData && (
            <CheckinStep3Payment 
              reservaData={reservaData}
              onComplete={handleStep3Complete}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={!canGoBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>

          <div className="flex space-x-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}