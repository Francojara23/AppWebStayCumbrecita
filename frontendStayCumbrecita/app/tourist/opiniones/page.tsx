"use client"

import { useState, useEffect } from "react"
import { SectionBanner } from "@/components/tourist/section-banner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Star, StarHalf, Edit, Trash2, Search, MessageSquare } from "lucide-react"
import Image from "next/image"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { 
  getUserReviews, 
  getUserCompletedReservations, 
  createReview, 
  updateReview, 
  deleteReview as deleteReviewAction,
  type Review as BackendReview,
  type CompletedReservation as BackendCompletedReservation
} from "@/app/actions/reviews"
import { getProfile } from "@/app/actions/auth/getProfile"

// Tipos para la UI (compatibles con el componente existente)
interface UIReview {
  id: string
  hotelId: string
  hotelName: string
  hotelImage: string
  rating: number
  comment: string
  date: Date
}

interface UICompletedReservation {
  id: string
  hotelId: string
  hotelName: string
  hotelImage: string
  checkIn: Date
  checkOut: Date
  roomNames: string[]
  visitors: number
}

export default function OpinionesPage() {
  // Estado para las opiniones publicadas
  const [reviews, setReviews] = useState<UIReview[]>([])
  const [completedReservations, setCompletedReservations] = useState<UICompletedReservation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")

  // Función para transformar datos del backend a formato UI
  const transformBackendReview = (backendReview: BackendReview): UIReview => {
    return {
      id: backendReview.id,
      hotelId: backendReview.hospedaje.id,
      hotelName: backendReview.hospedaje.nombre,
      hotelImage: backendReview.hospedaje.imagenes?.[0]?.url || "/placeholder.jpg",
      rating: backendReview.calificacion || 0,
      comment: backendReview.comentario || "",
      date: new Date(backendReview.fechaOpinion),
    }
  }

  const transformBackendReservation = (backendReservation: BackendCompletedReservation): UICompletedReservation => {
    return {
      id: backendReservation.id,
      hotelId: backendReservation.hospedaje.id,
      hotelName: backendReservation.hospedaje.nombre,
      hotelImage: backendReservation.hospedaje.imagenes?.[0]?.url || "/placeholder.jpg",
      checkIn: new Date(backendReservation.fechaCheckIn),
      checkOut: new Date(backendReservation.fechaCheckOut),
      roomNames: backendReservation.habitaciones.map(h => h.nombre),
      visitors: backendReservation.cantidadPersonas,
    }
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Obtener perfil del usuario para conseguir el ID
        const profileResponse = await getProfile()
        if (!profileResponse.success || !profileResponse.user) {
          toast({
            title: "Error",
            description: "No se pudo obtener la información del usuario",
            variant: "destructive"
          })
          return
        }
        
        const userId = profileResponse.user.id
        setCurrentUserId(userId)

        // Cargar opiniones del usuario
        const reviewsResponse = await getUserReviews()
        if (reviewsResponse && Array.isArray(reviewsResponse)) {
          const transformedReviews = reviewsResponse.map(transformBackendReview)
          setReviews(transformedReviews)
        }

        // Cargar reservas completadas
        const reservationsResponse = await getUserCompletedReservations(userId)
        if (reservationsResponse && Array.isArray(reservationsResponse)) {
          const transformedReservations = reservationsResponse.map(transformBackendReservation)
          setCompletedReservations(transformedReservations)
        }

      } catch (error) {
        console.error("Error cargando datos:", error)
        toast({
          title: "Error",
          description: "Error de conexión al cargar los datos",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])



  // Estado para el diálogo de nueva opinión
  const [isNewReviewDialogOpen, setIsNewReviewDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<UICompletedReservation | null>(null)
  const [newReviewRating, setNewReviewRating] = useState(0)
  const [newReviewComment, setNewReviewComment] = useState("")

  // Estado para el diálogo de edición
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState<UIReview | null>(null)
  const [editedComment, setEditedComment] = useState("")
  const [editedRating, setEditedRating] = useState(0)

  // Función para abrir el diálogo de nueva opinión
  const openNewReviewDialog = (reservation: UICompletedReservation) => {
    setSelectedReservation(reservation)
    setNewReviewRating(0)
    setNewReviewComment("")
    setIsNewReviewDialogOpen(true)
  }

  // Función para guardar una nueva opinión
  const saveNewReview = async () => {
    if (selectedReservation && newReviewRating > 0) {
      try {
        setIsSaving(true)
        
        // Crear nueva opinión en el backend
        const reviewData = {
          reservationId: selectedReservation.id,
          rating: newReviewRating,
          comment: newReviewComment || ""
        }

        const response = await createReview(reviewData)
        if (!response.success) {
          throw new Error("Error creating review")
        }
        
        // Recargar las opiniones para obtener la nueva
        const reviewsResponse = await getUserReviews()
        if (reviewsResponse && Array.isArray(reviewsResponse)) {
          const transformedReviews = reviewsResponse.map(transformBackendReview)
          setReviews(transformedReviews)
        }

        // Eliminar de las reservas sin opinión
        setCompletedReservations(completedReservations.filter((reservation) => reservation.id !== selectedReservation.id))

        toast({
          title: "Éxito",
          description: "Tu opinión ha sido publicada"
        })

        // Cerrar el diálogo
        setIsNewReviewDialogOpen(false)
      } catch (error) {
        console.error("Error creando opinión:", error)
        toast({
          title: "Error",
          description: "No se pudo publicar tu opinión",
          variant: "destructive"
        })
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Función para abrir el diálogo de edición
  const openEditDialog = (review: UIReview) => {
    setSelectedReview(review)
    setEditedComment(review.comment)
    setEditedRating(review.rating)
    setIsEditDialogOpen(true)
  }

  // Función para guardar los cambios de una opinión editada
  const saveEditedReview = async () => {
    if (selectedReview) {
      try {
        setIsSaving(true)

        const reviewData = {
          id: selectedReview.id,
          rating: editedRating,
          comment: editedComment || ""
        }

        await updateReview(reviewData)

        const updatedReviews = reviews.map((review) =>
          review.id === selectedReview.id ? { ...review, comment: editedComment, rating: editedRating } : review,
        )
        setReviews(updatedReviews)

        toast({
          title: "Éxito",
          description: "Tu opinión ha sido actualizada"
        })

        setIsEditDialogOpen(false)
      } catch (error) {
        console.error("Error actualizando opinión:", error)
        toast({
          title: "Error",
          description: "No se pudo actualizar tu opinión",
          variant: "destructive"
        })
      } finally {
        setIsSaving(false)
      }
    }
  }

  // Función para eliminar una opinión
  const deleteReview = async (id: string) => {
    try {
      await deleteReviewAction({ id })
      setReviews(reviews.filter((review) => review.id !== id))
      toast({
        title: "Éxito",
        description: "Tu opinión ha sido eliminada"
      })
    } catch (error) {
      console.error("Error eliminando opinión:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar tu opinión",
        variant: "destructive"
      })
    }
  }

  // Renderizar estrellas según la calificación
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-5 w-5 fill-yellow-400 text-yellow-400" />)
    }

    const emptyStars = 5 - stars.length
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-5 w-5 text-gray-300" />)
    }

    return stars
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner
        imageSrc="/tourist/cumbrecita012.jpg"
        imageAlt="La Cumbrecita"
        title="Mis Opiniones"
        description="Comparte tu experiencia y ayuda a otros viajeros a elegir el mejor alojamiento"
      />

      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Input placeholder="Buscar opiniones..." className="pl-10" />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            Solo puedes dejar opiniones sobre reservas que hayas completado. Tus opiniones ayudan a otros viajeros a
            elegir el mejor alojamiento.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Cargando opiniones...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="publicadas">
            <TabsList className="mb-6">
              <TabsTrigger value="publicadas">Publicadas</TabsTrigger>
              <TabsTrigger value="sin-opinion">Sin opinión</TabsTrigger>
            </TabsList>

          <TabsContent value="publicadas" className="space-y-6">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col md:flex-row border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative w-full md:w-64 h-48 md:h-auto">
                    <Image
                      src={review.hotelImage || "/placeholder.svg"}
                      alt={review.hotelName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4 md:p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{review.hotelName}</h3>
                        <p className="text-sm text-gray-500">
                          {format(review.date, "d 'de' MMMM 'de' yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="flex">{renderStars(review.rating)}</div>
                    </div>

                    <div className="my-4">
                      <p className="text-gray-700">{review.comment}</p>
                    </div>

                    <div className="mt-auto pt-4 border-t flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        onClick={() => openEditDialog(review)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-200 text-red-700 hover:bg-red-50"
                        onClick={() => deleteReview(review.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tienes opiniones realizadas</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sin-opinion" className="space-y-6">
            {completedReservations.length > 0 ? (
              completedReservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex flex-col md:flex-row border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative w-full md:w-64 h-48 md:h-auto">
                    <Image
                      src={reservation.hotelImage || "/placeholder.svg"}
                      alt={reservation.hotelName}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 p-4 md:p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold">{reservation.hotelName}</h3>
                        <p className="text-sm text-gray-500">
                          Estancia del {format(reservation.checkIn, "d MMM", { locale: es })} al{" "}
                          {format(reservation.checkOut, "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>

                    <div className="my-4">
                      <p className="text-gray-700">
                        <span className="font-medium">Habitaciones:</span> {reservation.roomNames.join(", ")}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Visitantes:</span> {reservation.visitors}
                      </p>
                    </div>

                    <div className="mt-auto pt-4 border-t">
                      <Button
                        className="w-full md:w-auto bg-orange-600 hover:bg-orange-700"
                        onClick={() => openNewReviewDialog(reservation)}
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Dejar opinión
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-40 bg-gray-50 rounded-md">
                <div className="text-center">
                  <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tienes opiniones para realizar</p>
                </div>
              </div>
            )}
          </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Diálogo para nueva opinión */}
      <Dialog open={isNewReviewDialogOpen} onOpenChange={setIsNewReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dejar una opinión</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="font-medium mb-1">{selectedReservation.hotelName}</h3>
                <p className="text-sm text-gray-500">
                  Estancia del {format(selectedReservation.checkIn, "d MMM", { locale: es })} al{" "}
                  {format(selectedReservation.checkOut, "d MMM yyyy", { locale: es })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tu calificación</label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        star <= newReviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                      onClick={() => setNewReviewRating(star)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium mb-2">
                  Tu opinión
                </label>
                <Textarea
                  id="comment"
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  rows={5}
                  placeholder="Comparte tu experiencia en este alojamiento..."
                  className="w-full"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={saveNewReview}
              disabled={newReviewRating === 0 || isSaving}
            >
              {isSaving ? "Publicando..." : "Publicar opinión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para editar opinión */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Opinión</DialogTitle>
          </DialogHeader>
          {selectedReview && (
            <div className="py-4 space-y-4">
              <div>
                <h3 className="font-medium mb-1">{selectedReview.hotelName}</h3>
                <div className="flex items-center space-x-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        star <= editedRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                      onClick={() => setEditedRating(star)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium mb-1">
                  Tu opinión
                </label>
                <Textarea
                  id="comment"
                  value={editedComment}
                  onChange={(e) => setEditedComment(e.target.value)}
                  rows={5}
                  placeholder="Comparte tu experiencia en este alojamiento..."
                  className="w-full"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={saveEditedReview} disabled={isSaving}>
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
