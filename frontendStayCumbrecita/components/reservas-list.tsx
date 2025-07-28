"use client"

import type React from "react"

import { cn } from "@/lib/utils"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Eye, Star, Check, X } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Textarea } from "@/components/ui/textarea"

// Tipo para las reservas
interface Reservation {
  id: string
  name: string
  status: "Confirmada" | "Pendiente" | "Cancelada"
  checkIn: Date
  checkOut: Date
  qrCode?: string
  reviewed: boolean
  location?: string
  address?: string
  country?: string
  roomDetails?: string
  specialRequests?: string
}

// Tipo para las calificaciones
interface Rating {
  personal: number
  comfort: number
  facilities: number
  valueForMoney: number
  location: number
  wifi: number
  cleanliness: number
  comment: string
}

export default function ReservasList() {
  // Estado para las reservas
  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: "res-1",
      name: "Hotel Las Cascadas",
      status: "Confirmada",
      checkIn: new Date("2024-11-17"),
      checkOut: new Date("2024-11-20"),
      qrCode: "/placeholder.svg?height=200&width=200",
      reviewed: false,
      location: "La Cumbrecita",
      address: "Las Truchas s/n - La Cumbrecita - Córdoba, 5000",
      country: "Argentina",
      roomDetails: "1 Habitación Doble Superior con Balcón | 2 personas | Incluye desayuno",
      specialRequests: "Algún menú de desayuno sin TACC",
    },
    {
      id: "res-2",
      name: "Brisas del Champaquí",
      status: "Confirmada",
      checkIn: new Date("2024-07-22"),
      checkOut: new Date("2024-07-25"),
      qrCode: "/placeholder.svg?height=200&width=200",
      reviewed: true,
      location: "Villa General Belgrano",
      address: "Av. Champaquí 123 - Villa General Belgrano - Córdoba, 5194",
      country: "Argentina",
      roomDetails: "1 Habitación Familiar | 4 personas | Incluye desayuno",
    },
  ])

  // Estado para el diálogo de QR
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  // Estado para el diálogo de reseña
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewReservation, setReviewReservation] = useState<Reservation | null>(null)

  // Estado para el diálogo de agradecimiento
  const [isThankYouDialogOpen, setIsThankYouDialogOpen] = useState(false)

  // Estado para las calificaciones
  const [rating, setRating] = useState<Rating>({
    personal: 0,
    comfort: 0,
    facilities: 0,
    valueForMoney: 0,
    location: 0,
    wifi: 0,
    cleanliness: 0,
    comment: "",
  })

  // Función para abrir el diálogo de QR
  const openQrDialog = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setIsQrDialogOpen(true)
  }

  // Función para abrir el diálogo de reseña
  const openReviewDialog = (reservation: Reservation) => {
    setReviewReservation(reservation)
    setIsReviewDialogOpen(true)
  }

  // Función para manejar el cambio en las calificaciones
  const handleRatingChange = (category: keyof Omit<Rating, "comment">, value: number) => {
    setRating({
      ...rating,
      [category]: value,
    })
  }

  // Función para manejar el cambio en el comentario
  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRating({
      ...rating,
      comment: e.target.value,
    })
  }

  // Función para enviar la reseña
  const submitReview = () => {
    if (reviewReservation) {
      // Actualizar el estado de la reserva para marcarla como revisada
      setReservations(reservations.map((res) => (res.id === reviewReservation.id ? { ...res, reviewed: true } : res)))

      // Cerrar el diálogo de reseña
      setIsReviewDialogOpen(false)

      // Mostrar el diálogo de agradecimiento
      setIsThankYouDialogOpen(true)

      // Reiniciar las calificaciones
      setRating({
        personal: 0,
        comfort: 0,
        facilities: 0,
        valueForMoney: 0,
        location: 0,
        wifi: 0,
        cleanliness: 0,
        comment: "",
      })
    }
  }

  // Componente para renderizar las estrellas de calificación
  const RatingStars = ({ category, value }: { category: keyof Omit<Rating, "comment">; value: number }) => {
    return (
      <div className="flex items-center">
        {[...Array(10)].map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleRatingChange(category, index + 1)}
            className="focus:outline-none"
          >
            <Star className={cn("h-5 w-5", index < value ? "fill-orange-500 text-orange-500" : "text-gray-300")} />
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <h1 className="text-xl font-medium text-orange-700">Mis reservas / Tokens</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="border rounded-md bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Salida</TableHead>
                <TableHead>QR Check-in</TableHead>
                <TableHead>Reseña</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">Todavía no tienes reservas</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>{reservation.name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          reservation.status === "Confirmada" && "bg-green-100 text-green-800",
                          reservation.status === "Pendiente" && "bg-yellow-100 text-yellow-800",
                          reservation.status === "Cancelada" && "bg-red-100 text-red-800",
                        )}
                      >
                        {reservation.status}
                      </span>
                    </TableCell>
                    <TableCell>{format(reservation.checkIn, "dd-MM-yyyy", { locale: es })}</TableCell>
                    <TableCell>{format(reservation.checkOut, "dd-MM-yyyy", { locale: es })}</TableCell>
                    <TableCell>
                      {reservation.status === "Confirmada" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openQrDialog(reservation)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {reservation.reviewed ? (
                        <div className="flex justify-center">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                      ) : (
                        <Button
                          variant="link"
                          className="text-orange-600 hover:text-orange-700"
                          onClick={() => openReviewDialog(reservation)}
                        >
                          Opinar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Diálogo para mostrar el QR */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-center">QR del Check In</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedReservation && (
              <>
                <p className="text-center mb-4">Presenta este token en el mostrador al llegar al hospedaje.</p>
                <h3 className="font-bold text-lg">{selectedReservation.name}</h3>
                <p className="text-sm">{selectedReservation.address}</p>
                <p className="text-sm mb-4">
                  {selectedReservation.location}, {selectedReservation.country}
                </p>

                <p className="text-sm">{selectedReservation.roomDetails}</p>
                <p className="text-sm mt-2">
                  <strong>Check-in:</strong> {format(selectedReservation.checkIn, "dd-MM-yyyy", { locale: es })}
                </p>
                <p className="text-sm">
                  <strong>Check-Out:</strong> {format(selectedReservation.checkOut, "dd-MM-yyyy", { locale: es })}
                </p>

                {selectedReservation.specialRequests && (
                  <p className="text-sm mt-2">
                    <strong>Peticiones especiales:</strong> {selectedReservation.specialRequests}
                  </p>
                )}

                <div className="flex justify-center mt-4">
                  <div className="bg-white p-4 rounded-md border">
                    <img src="/placeholder.svg?height=200&width=200&text=QR+Code" alt="QR Code" className="w-48 h-48" />
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo para la reseña */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-center text-orange-700">Mi opinión</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center mb-4">Por favor ayúdanos valorando estos puntos:</p>

            <div className="space-y-4">
              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">Personal</span>
                <RatingStars category="personal" value={rating.personal} />
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">Confort</span>
                <RatingStars category="comfort" value={rating.comfort} />
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">Instalaciones y servicios</span>
                <RatingStars category="facilities" value={rating.facilities} />
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">Relación calidad - precio</span>
                <RatingStars category="valueForMoney" value={rating.valueForMoney} />
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">Ubicación</span>
                <RatingStars category="location" value={rating.location} />
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">WiFi gratis</span>
                <RatingStars category="wifi" value={rating.wifi} />
              </div>

              <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                <span className="text-sm">Limpieza</span>
                <RatingStars category="cleanliness" value={rating.cleanliness} />
              </div>
            </div>

            <div className="mt-6">
              <Textarea
                placeholder="Contanos como fue tu experiencia"
                value={rating.comment}
                onChange={handleCommentChange}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitReview} className="bg-gray-400 hover:bg-gray-500">
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de agradecimiento */}
      <Dialog open={isThankYouDialogOpen} onOpenChange={setIsThankYouDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            onClick={() => setIsThankYouDialogOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <div className="py-6 text-center">
            <h2 className="text-xl font-bold text-orange-700 mb-4">Muchas gracias</h2>
            <p className="mb-6">
              Tu opinión nos ayuda a seguir mejorando, por eso te agradecemos haber colaborado con nosotros.
            </p>
            <Button onClick={() => setIsThankYouDialogOpen(false)} className="bg-orange-600 hover:bg-orange-700">
              ¡Hasta la próxima!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
