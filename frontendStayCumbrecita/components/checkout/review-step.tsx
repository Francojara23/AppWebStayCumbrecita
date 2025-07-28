"use client"

import { useCheckout } from "@/components/checkout-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle2, CreditCard, Wallet, Building, Loader2 } from "lucide-react"

interface ReviewStepProps {
  onNext: () => void
  onPrev: () => void
  isLoading?: boolean
}

export default function ReviewStep({ onNext, onPrev, isLoading = false }: ReviewStepProps) {
  const { reservation, personalInfo, paymentInfo } = useCheckout()

  // Función para obtener el nombre del método de pago
  const getPaymentMethodName = () => {
    switch (paymentInfo.method) {
      case "credit-card":
        return "Tarjeta de crédito"
      case "debit-card":
        return "Tarjeta de débito"
      case "transfer":
        return "Transferencia bancaria"
      default:
        return "No seleccionado"
    }
  }

  // Función para obtener el icono del método de pago
  const getPaymentMethodIcon = () => {
    switch (paymentInfo.method) {
      case "credit-card":
        return <CreditCard className="h-5 w-5" />
      case "debit-card":
        return <Wallet className="h-5 w-5" />
      case "transfer":
        return <Building className="h-5 w-5" />
      default:
        return null
    }
  }

  // Función para obtener el nombre del tipo de tarjeta
  const getCardTypeName = () => {
    switch (paymentInfo.cardType) {
      case "VISA":
        return "Visa"
      case "MASTERCARD":
        return "Mastercard"
      case "AMERICAN_EXPRESS":
        return "American Express"
      case "DINERS":
        return "Diners Club"
      case "MAESTRO":
        return "Maestro"
      case "CABAL":
        return "Cabal"
      default:
        return ""
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Revisar y confirmar</h2>

          <div className="space-y-6">
            {/* Datos de la reserva */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Datos de la reserva
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Hospedaje</p>
                    <p className="font-medium">{reservation.hotel.name}</p>
                    <p className="text-sm">{reservation.hotel.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Habitación</p>
                    <p className="font-medium">{reservation.room.name}</p>
                    <p className="text-sm">
                      {reservation.guests.adults} {reservation.guests.adults === 1 ? "adulto" : "adultos"}
                      {reservation.guests.children > 0 &&
                        `, ${reservation.guests.children} ${reservation.guests.children === 1 ? "niño" : "niños"}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-in</p>
                    <p className="font-medium">
                      {format(reservation.dates.checkIn, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                    <p className="text-sm">A partir de las 15:00</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Check-out</p>
                    <p className="font-medium">
                      {format(reservation.dates.checkOut, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                    <p className="text-sm">Hasta las 11:00</p>
                  </div>
                </div>

                {reservation.specialRequests && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">Peticiones especiales</p>
                    <p className="text-sm">{reservation.specialRequests}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Datos personales */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Datos personales
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre completo</p>
                    <p className="font-medium">
                      {personalInfo.firstName} {personalInfo.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">DNI</p>
                    <p className="font-medium">{personalInfo.dni}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{personalInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">{personalInfo.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Datos de pago */}
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                Datos de pago
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  {getPaymentMethodIcon()}
                  <p className="font-medium">{getPaymentMethodName()}</p>
                </div>

                {(paymentInfo.method === "credit-card" || paymentInfo.method === "debit-card") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Tipo de tarjeta</p>
                      <p className="font-medium">{getCardTypeName() || "No seleccionado"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Número de tarjeta</p>
                      <p className="font-medium">
                        {paymentInfo.cardNumber && paymentInfo.cardNumber.length >= 4 
                          ? `**** **** **** ${paymentInfo.cardNumber.slice(-4)}`
                          : "No ingresado"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Titular</p>
                      <p className="font-medium">{paymentInfo.cardHolder || "No ingresado"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de expiración</p>
                      <p className="font-medium">
                        {paymentInfo.expiryMonth && paymentInfo.expiryYear
                          ? `${paymentInfo.expiryMonth}/${paymentInfo.expiryYear}`
                          : "No seleccionada"
                        }
                      </p>
                    </div>
                  </div>
                )}

                {paymentInfo.method === "transfer" && (
                  <div>
                    <p className="text-sm">
                      Recuerde enviar el comprobante de transferencia a{" "}
                      <a href="mailto:pagos@capturecita.com" className="text-orange-600 underline">
                        pagos@capturecita.com
                      </a>
                    </p>
                  </div>
                )}


              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onPrev} disabled={isLoading}>
              Atrás
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={onNext} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando pago...
                </>
              ) : (
                "Confirmar y pagar"
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen de la reserva</h2>

            <div className="mb-4">
              <h3 className="font-medium">{reservation.hotel.name}</h3>
              <p className="text-sm text-gray-600">{reservation.hotel.location}</p>
            </div>

            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span>Check-in</span>
                <span className="font-medium">{format(reservation.dates.checkIn, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out</span>
                <span className="font-medium">{format(reservation.dates.checkOut, "dd/MM/yyyy")}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>
                  Precio por {reservation.dates.nights} {reservation.dates.nights === 1 ? 'noche' : 'noches'}
                </span>
                <span>${reservation.price.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos y tasas</span>
                <span>${reservation.price.taxes.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-600">${reservation.price.grandTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
