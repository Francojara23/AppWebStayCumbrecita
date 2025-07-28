"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCheckout } from "@/components/checkout-context"
import ReservationStep from "@/components/checkout/reservation-step"
import PersonalInfoStep from "@/components/checkout/personal-info-step"
import PaymentStep from "@/components/checkout/payment-step"
import ReviewStep from "@/components/checkout/review-step"
import ConfirmationStep from "@/components/checkout/confirmation-step"
import { useReservasPago } from "@/hooks/use-reservas-api"
import { cn } from "@/lib/utils"

interface CheckoutStepsProps {
  currentStep: number
  onNext: () => void
  onPrev: () => void
}

export default function CheckoutSteps({ currentStep, onNext, onPrev }: CheckoutStepsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { reservation, personalInfo, paymentInfo, confirmationCode, setConfirmationCode, setCreatedReservation } = useCheckout()
  const { procesarPagoYCrearReserva, isLoading, error } = useReservasPago()
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Generar código de confirmación desde el ID real de la reserva
  const generateConfirmationCode = (reservaId: string) => {
    // Usar los primeros 8 caracteres del ID de la reserva (sin guiones)
    return reservaId.replace(/-/g, '').substring(0, 8).toUpperCase()
  }

  // Manejar el envío del formulario de pago real
  const handlePaymentSubmit = async () => {
    setPaymentError(null)

    try {
      // Obtener IDs de habitaciones de los parámetros URL
      const habitacionIdsParam = searchParams.get('habitacionIds')?.split(',') || 
                                 (searchParams.get('habitacionId') ? [searchParams.get('habitacionId')!] : [])

      // Preparar datos de la reserva
      const reservaData = {
        hospedajeId: reservation.hotel.id,
        fechaInicio: reservation.dates.checkIn.toISOString().split('T')[0],
        fechaFin: reservation.dates.checkOut.toISOString().split('T')[0],
        lineas: habitacionIdsParam.map(habitacionId => ({
          habitacionId,
          personas: Math.ceil(reservation.guests.adults / habitacionIdsParam.length)
        })),
        observacion: reservation.specialRequests || undefined
      }

      // Preparar datos del pago
      const pagoData = paymentInfo.method === 'transfer' 
        ? { metodo: 'TRANSFERENCIA' as const }
        : {
            metodo: 'TARJETA' as const,
            tarjeta: {
              numero: paymentInfo.cardNumber,
              titular: paymentInfo.cardHolder.toUpperCase(),
              vencimiento: paymentInfo.expiryMonth + '/' + paymentInfo.expiryYear.slice(-2),
              cve: paymentInfo.cvv,
              tipo: paymentInfo.method === 'credit-card' ? 'CREDITO' as const : 'DEBITO' as const,
              entidad: paymentInfo.cardType
            }
          }

      // Calcular montos
      const montos = {
        montoReserva: reservation.price.total,
        montoImpuestos: reservation.price.taxes,
        montoTotal: reservation.price.grandTotal
      }

      // Procesar pago y crear reserva (solo si pago es exitoso)
      const result = await procesarPagoYCrearReserva(reservaData, pagoData, montos)
      
      if (result.success) {
        const code = generateConfirmationCode(result.reserva.id)
        setConfirmationCode(code)
        setCreatedReservation(result.reserva) // Guardar la reserva creada
        onNext() // Ir al paso de confirmación
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar el pago'
      setPaymentError(errorMessage)
      console.error('Error procesando el pago:', err)
    }
  }

  // Renderizar el paso actual
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ReservationStep onNext={onNext} />
      case 2:
        return <PersonalInfoStep onNext={onNext} onPrev={onPrev} />
      case 3:
        return <PaymentStep onNext={onNext} onPrev={onPrev} isLoading={false} />
      case 4:
        return <ReviewStep onNext={handlePaymentSubmit} onPrev={onPrev} isLoading={isLoading} />
      case 5:
        return <ConfirmationStep />
      default:
        return <ReservationStep onNext={onNext} />
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Indicador de pasos */}
      {currentStep < 5 && (
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {["Reserva", "Datos personales", "Pago", "Revisión"].map((step, index) => (
              <div key={index} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mb-2",
                    index + 1 < currentStep
                      ? "bg-green-500 text-white"
                      : index + 1 === currentStep
                        ? "bg-orange-600 text-white"
                        : "bg-gray-200 text-gray-500",
                  )}
                >
                  {index + 1 < currentStep ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm hidden sm:block",
                    index + 1 === currentStep ? "text-orange-600 font-medium" : "text-gray-500",
                  )}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
          <div className="relative mt-2">
            <div className="absolute top-0 left-0 h-1 bg-gray-200 w-full"></div>
            <div
              className="absolute top-0 left-0 h-1 bg-orange-600 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Mostrar errores de pago si existen */}
      {(paymentError || error) && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-red-800 font-medium">Error al procesar el pago</p>
          </div>
          <p className="text-red-700 mt-1">{paymentError || error}</p>
        </div>
      )}

      {/* Contenido del paso actual */}
      {renderStep()}
    </div>
  )
}
