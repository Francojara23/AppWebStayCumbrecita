"use client"

import { useCheckout } from "@/components/checkout-context"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"


export default function ConfirmationStep() {
  const router = useRouter()
  const { reservation, personalInfo, confirmationCode, createdReservation } = useCheckout()

  const handleGoToReservations = () => {
    router.push("/tourist")
  }

  // Función eliminada - ahora solo usamos el QR del backend

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-green-600 mb-2">¡Reserva confirmada!</h2>
        <p className="text-gray-600 mb-6">
          Tu reserva ha sido confirmada con éxito. A continuación encontrarás los detalles de tu reserva.
        </p>

        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Código de reserva</h3>
            <span className="text-lg font-bold text-orange-600">{confirmationCode}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="text-left">
              <h4 className="font-medium mb-2">{reservation.hotel.name}</h4>
              <p className="text-sm text-gray-600">{reservation.hotel.location}</p>
              <p className="text-sm mt-2">{reservation.room.name}</p>
              <p className="text-sm">
                {reservation.guests.adults} {reservation.guests.adults === 1 ? "adulto" : "adultos"}
                {reservation.guests.children > 0 &&
                  `, ${reservation.guests.children} ${reservation.guests.children === 1 ? "niño" : "niños"}`}
              </p>
            </div>

            <div className="text-left">
              <div className="mb-3">
                <p className="text-sm text-gray-500">Check-in</p>
                <p className="font-medium">
                  {format(reservation.dates.checkIn, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="text-sm text-gray-500">A partir de las 15:00</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Check-out</p>
                <p className="font-medium">
                  {format(reservation.dates.checkOut, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="text-sm text-gray-500">Hasta las 11:00</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium mb-4">QR para Check-in</h3>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-md border">
                {createdReservation?.codigoQrUrl ? (
                  <img 
                    src={createdReservation.codigoQrUrl} 
                    alt="QR Code para Check-in" 
                    width={180} 
                    height={180}
                    className="w-[180px] h-[180px]"
                  />
                ) : (
                  <div className="w-[180px] h-[180px] bg-gray-200 flex items-center justify-center rounded">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Generando QR...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Presenta este código QR en la recepción del hotel para realizar el check-in.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleGoToReservations}>
            Ver mis reservas
          </Button>
        </div>
      </div>

      <div className="mt-8 text-center">
        <h3 className="text-lg font-medium mb-2">¿Necesitas ayuda?</h3>
        <p className="text-gray-600 mb-4">Si tienes alguna pregunta o necesitas modificar tu reserva, contáctanos:</p>
        <div className="flex justify-center gap-4">
          <a href="tel:+543511234567" className="text-orange-600 hover:underline">
            +54 9 351 123-4567
          </a>
          <span>|</span>
          <a href="mailto:reservas@stayatcumbrecita.com" className="text-orange-600 hover:underline">
            reservas@stayatcumbrecita.com
          </a>
        </div>
      </div>
    </div>
  )
}
