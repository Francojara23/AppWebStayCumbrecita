"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, X, ArrowLeft, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getDatosCheckout, confirmarCheckout } from '@/app/actions/reservations/checkout'
import { DatosCheckout, CargoAdicional, CheckoutCompletoData } from '@/types/checkout'
import { CheckoutStep1Details } from './checkout-step1-details'
import { CheckoutStep2Charges } from './checkout-step2-charges'
import { CheckoutStep3Confirmation } from './checkout-step3-confirmation'

interface CheckoutModalProps {
  reservaId: string | null
  isOpen: boolean
  onClose: () => void
  onCheckoutComplete?: () => void
}

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center space-x-4 mb-6">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep
        
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>
              <span className={`text-sm mt-2 ${isActive ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {stepNumber === 1 && 'Detalles'}
                {stepNumber === 2 && 'Cargos'}
                {stepNumber === 3 && 'Confirmar'}
              </span>
            </div>
            {stepNumber < totalSteps && (
              <div
                className={`w-12 h-1 transition-colors ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export function CheckoutModal({ reservaId, isOpen, onClose, onCheckoutComplete }: CheckoutModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [datosReserva, setDatosReserva] = useState<DatosCheckout | null>(null)
  const [cargosAdicionales, setCargosAdicionales] = useState<CargoAdicional[]>([])
  const [observaciones, setObservaciones] = useState('')
  const { toast } = useToast()

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (isOpen && reservaId) {
      loadDatosReserva()
    }
  }, [isOpen, reservaId])

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setDatosReserva(null)
      setCargosAdicionales([])
      setObservaciones('')
    }
  }, [isOpen])

  const loadDatosReserva = async () => {
    if (!reservaId) return

    setIsLoading(true)
    try {
      const response = await getDatosCheckout(reservaId)
      
      if (response.success && response.data) {
        setDatosReserva(response.data)
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
      toast({
        title: "❌ Error",
        description: "Error al cargar los datos de la reserva",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStep2Complete = (cargos: CargoAdicional[]) => {
    setCargosAdicionales(cargos)
    handleNextStep()
  }

  const handleFinalCheckout = async (obs: string) => {
    if (!reservaId) return

    setIsLoading(true)
    setObservaciones(obs)

    try {
      const checkoutData: CheckoutCompletoData = {
        cargosAdicionales: cargosAdicionales.length > 0 ? cargosAdicionales : undefined,
        observaciones: obs || undefined
      }

      console.log('🚀 Ejecutando checkout final:', checkoutData)

      const response = await confirmarCheckout(reservaId, checkoutData)

      if (response.success && response.data) {
        toast({
          title: "Checkout completado",
          description: `Reserva ${response.data.codigo} - ${response.data.cargosAdicionales} cargo(s) adicional(es)`
        })

        // Cerrar modal y refrescar datos
        onClose()
        onCheckoutComplete?.()
      } else {
        toast({
          title: "Error",
          description: response.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error en checkout final:', error)
      toast({
        title: "❌ Error",
        description: "Error al procesar el checkout",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Detalles de la Reserva'
      case 2: return 'Cargos Adicionales'
      case 3: return 'Confirmación de Checkout'
      default: return 'Checkout'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Revisa la información completa de la reserva'
      case 2: return 'Agrega cargos por consumos o daños si es necesario'
      case 3: return 'Confirma los datos y procesa el checkout'
      default: return ''
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {getStepTitle()}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {getStepDescription()}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4">
          <StepIndicator currentStep={currentStep} totalSteps={3} />

          {isLoading && !datosReserva ? (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3">Cargando datos de la reserva...</span>
              </CardContent>
            </Card>
          ) : datosReserva ? (
            <>
              {/* Step 1: Detalles */}
              {currentStep === 1 && (
                <CheckoutStep1Details 
                  datos={datosReserva}
                  onNext={handleNextStep}
                />
              )}

              {/* Step 2: Cargos */}
              {currentStep === 2 && (
                <CheckoutStep2Charges
                  onComplete={handleStep2Complete}
                  onBack={handlePrevStep}
                  initialCargos={cargosAdicionales}
                />
              )}

              {/* Step 3: Confirmación */}
              {currentStep === 3 && (
                <CheckoutStep3Confirmation
                  datosReserva={datosReserva}
                  cargosAdicionales={cargosAdicionales}
                  onComplete={handleFinalCheckout}
                  onBack={handlePrevStep}
                  isLoading={isLoading}
                  initialObservaciones={observaciones}
                />
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No se pudieron cargar los datos de la reserva</p>
                <Button className="mt-4" onClick={loadDatosReserva}>
                  Reintentar
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}