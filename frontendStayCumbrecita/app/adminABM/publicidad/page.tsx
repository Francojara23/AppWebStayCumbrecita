"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileUp, Calendar, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { format, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import PaymentDetailsModal from "@/components/adminABM/PaymentDetailsModal"
import { useHospedajesAdmin, useMisPublicidades } from "@/hooks/use-api"
import { useCrearPublicidad } from "@/hooks/useCrearPublicidad"
import { Loader2 } from "lucide-react"
import { useIsHospedajeOwner } from "@/hooks/use-user-permissions"

// Tipo para los hoteles actualizado para usar datos del backend
interface Hotel {
  id: string
  name: string
  status: string
  promotionActive: boolean
  promotionPeriod: {
    from: Date | null
    to: Date | null
  }
}

// Componente para la celda de acciones que usa el hook de permisos
function ActionCell({ hotel, onDelete }: { hotel: Hotel; onDelete: (id: string) => void }) {
  const isOwner = useIsHospedajeOwner(hotel.id)
  
  console.log('🏨 Verificando permisos para hotel:', { 
    hotelId: hotel.id, 
    hotelName: hotel.name, 
    isOwner 
  })
  
  return (
    <TableCell>
      {isOwner ? (
        <Button variant="destructive" size="sm" onClick={() => onDelete(hotel.id)}>
          Eliminar
        </Button>
      ) : (
        <span className="text-sm text-gray-500">Sin permisos</span>
      )}
    </TableCell>
  )
}

// Componente de calendario personalizado
function CustomCalendar({
  value,
  onChange,
  minDate,
  onClose,
}: {
  value: Date | null
  onChange: (date: Date | null) => void
  minDate?: Date
  onClose: () => void
}) {
  const [currentMonth, setCurrentMonth] = useState(value || new Date())

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1))
  }

  // Generar días del mes actual
  const generateDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Días del mes anterior para completar la primera semana
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: null, disabled: true })
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isDisabled = minDate ? date < minDate : false
      const isSelected =
        value &&
        date.getDate() === value.getDate() &&
        date.getMonth() === value.getMonth() &&
        date.getFullYear() === value.getFullYear()

      days.push({
        day,
        date,
        disabled: isDisabled,
        isSelected,
      })
    }

    return days
  }

  const days = generateDays()
  const weekDays = ["D", "L", "M", "M", "J", "V", "S"]

  const handleSelectDate = (date: Date) => {
    onChange(date)
    onClose()
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy", { locale: es })}</h2>
        <div className="flex space-x-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <button
            key={index}
            disabled={day.disabled || !day.day}
            onClick={() => day.day && !day.disabled && handleSelectDate(day.date)}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center text-sm",
              day.disabled && "text-gray-300 cursor-not-allowed",
              !day.disabled && !day.isSelected && day.day && "hover:bg-orange-100",
              day.isSelected && "bg-orange-600 text-white hover:bg-orange-700",
              !day.day && "invisible",
            )}
          >
            {day.day}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}

export default function PublicidadPage() {
  // Estado para las publicidades procesadas
  const [hotels, setHotels] = useState<Hotel[]>([])
  
  // Hooks para obtener datos con autorización automática
  const { data: hospedajesData, isLoading: isLoadingHospedajes, error: errorHospedajes } = useHospedajesAdmin({
    limit: 100 // Obtener todos los hospedajes del usuario
  })
  
  const { data: publicidadesData, isLoading: isLoadingPublicidades, error: errorPublicidades } = useMisPublicidades()
  
  // Hook para crear publicidad
  const { crearPublicidad, isLoading: isLoadingCrearPublicidad, error: errorCrearPublicidad } = useCrearPublicidad()

  // Estado para el diálogo de promoción
  const [isPromotionDialogOpen, setIsPromotionDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false)
  const [currentHotelId, setCurrentHotelId] = useState<string | null>(null)

  // Estado para mostrar los calendarios
  const [showFromCalendar, setShowFromCalendar] = useState(false)
  const [showToCalendar, setShowToCalendar] = useState(false)

  // Estado para el formulario de promoción
  const [promotionForm, setPromotionForm] = useState({
    from: null as Date | null,
    to: null as Date | null,
    amount: "",
    paymentMethod: "",
  })

  // Estado para el formulario de pago
  const [paymentForm, setPaymentForm] = useState({
    cardType: "",
    cardHolder: "",
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cvc: "",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchQuery, setSearchQuery] = useState("")

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [adToDelete, setAdToDelete] = useState<string | null>(null)

  // Estado para el modal de detalles del pago
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] = useState(false)
  const [selectedPublicidad, setSelectedPublicidad] = useState<any>(null)

  // Función para abrir el diálogo de promoción
  const openPromotionDialog = (hotelId: string) => {
    setCurrentHotelId(hotelId)
    setIsPromotionDialogOpen(true)
  }

  // Función para manejar el cambio en el formulario de promoción
  const handlePromotionFormChange = (field: string, value: any) => {
    setPromotionForm({
      ...promotionForm,
      [field]: value,
    })
  }

  // Función para manejar el cambio en el formulario de pago
  const handlePaymentFormChange = (field: string, value: string) => {
    setPaymentForm({
      ...paymentForm,
      [field]: value,
    })
  }

  // Función para continuar al formulario de pago
  const handleContinueToPayment = () => {
    // Validar el formulario de promoción
    if (!promotionForm.from || !promotionForm.to || !promotionForm.amount || !promotionForm.paymentMethod) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      })
      return
    }

    // Validar que la fecha final sea posterior a la inicial
    if (promotionForm.from && promotionForm.to && promotionForm.from >= promotionForm.to) {
      toast({
        title: "Error",
        description: "La fecha final debe ser posterior a la fecha inicial",
        variant: "destructive",
      })
      return
    }

    // Cerrar el diálogo de promoción y abrir el de pago
    setIsPromotionDialogOpen(false)
    setIsPaymentDialogOpen(true)
  }

  // Función para continuar al resumen
  const handleContinueToSummary = () => {
    // Validar el formulario de pago solo si es tarjeta
    if (promotionForm.paymentMethod === "credit-card" || promotionForm.paymentMethod === "debit-card") {
      if (!paymentForm.cardType || !paymentForm.cardHolder || !paymentForm.cardNumber || 
          !paymentForm.expiryMonth || !paymentForm.expiryYear || !paymentForm.cvc) {
        toast({
          title: "Error",
          description: "Por favor complete todos los campos de la tarjeta",
          variant: "destructive",
        })
        return
      }
    }

    // Cerrar el diálogo de pago y abrir el de resumen
    setIsPaymentDialogOpen(false)
    setIsSummaryDialogOpen(true)
  }

  // Función para volver del pago al paso anterior
  const handleBackToPromotion = () => {
    setIsPaymentDialogOpen(false)
    setIsPromotionDialogOpen(true)
  }

  // Función para volver del resumen al paso anterior
  const handleBackToPayment = () => {
    setIsSummaryDialogOpen(false)
    setIsPaymentDialogOpen(true)
  }

  const handleDeleteAd = (adId: string) => {
    setAdToDelete(adId)
    setIsDeleteDialogOpen(true)
  }

  // Función para manejar ver detalles del pago
  const handleViewPayment = (hotel: Hotel) => {
    // Buscar la publicidad real desde los datos del backend
    const publicidadReal = publicidadesData?.find((pub: any) => 
      pub.hospedaje?.id === hotel.id && pub.estado === "ACTIVA"
    )
    
    if (publicidadReal && publicidadReal.pagos && publicidadReal.pagos.length > 0) {
      setSelectedPublicidad(publicidadReal)
      setIsPaymentDetailsModalOpen(true)
    } else {
      toast({
        title: "Sin datos de pago",
        description: "No se encontraron datos de pago para esta publicidad",
        variant: "destructive",
      })
    }
  }

  const handleConfirmDelete = () => {
    // Here you would implement the actual delete logic
    console.log(`Deleting advertisement: ${adToDelete}`)
    setIsDeleteDialogOpen(false)
    setAdToDelete(null)
    // In a real app, you would remove the item from the database
    // and then refresh the list
  }

  // Función para procesar el pago REAL
  const handleProcessPayment = async () => {
    // Validar el formulario de pago
    if (
      !paymentForm.cardType ||
      !paymentForm.cardHolder ||
      !paymentForm.cardNumber ||
      !paymentForm.expiryMonth ||
      !paymentForm.expiryYear ||
      !paymentForm.cvc
    ) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos de pago",
        variant: "destructive",
      })
      return
    }

    // Validar número de tarjeta (simplificado)
    if (paymentForm.cardNumber.length < 15 || paymentForm.cardNumber.length > 16) {
      toast({
        title: "Error",
        description: "El número de tarjeta debe tener entre 15 y 16 dígitos",
        variant: "destructive",
      })
      return
    }

    // Validar CVC
    if (paymentForm.cvc.length < 3 || paymentForm.cvc.length > 4) {
      toast({
        title: "Error",
        description: "El código CVC debe tener entre 3 y 4 dígitos",
        variant: "destructive",
      })
      return
    }

    // Validar que tenemos los datos necesarios
    if (!currentHotelId || !promotionForm.from || !promotionForm.to || !promotionForm.amount) {
      toast({
        title: "Error",
        description: "Faltan datos de la promoción",
        variant: "destructive",
      })
      return
    }

    try {
      // Preparar datos de la publicidad
      const publicidadData = {
        hospedajeId: currentHotelId,
        monto: parseFloat(promotionForm.amount),
        fechaInicio: promotionForm.from,
        fechaFin: promotionForm.to,
        renovacionAutomatica: false
      }

      // Preparar datos de la tarjeta
      const tarjetaData = {
        numero: paymentForm.cardNumber,
        titular: paymentForm.cardHolder.toUpperCase(),
        vencimiento: paymentForm.expiryMonth + '/' + paymentForm.expiryYear.slice(-2),
        cve: paymentForm.cvc,
        tipo: promotionForm.paymentMethod === 'credit-card' ? 'CREDITO' as const : 'DEBITO' as const,
        entidad: paymentForm.cardType.toUpperCase()
      }

      console.log('🚀 Procesando pago real de publicidad...', { publicidadData, tarjetaData })

      // Crear la publicidad con pago real
      const result = await crearPublicidad(publicidadData, tarjetaData)

      if (result.success) {
        // Actualizar el estado local del hotel
        setHotels(
          hotels.map((hotel) => {
            if (hotel.id === currentHotelId) {
              return {
                ...hotel,
                promotionActive: true,
                promotionPeriod: {
                  from: promotionForm.from,
                  to: promotionForm.to,
                },
              }
            }
            return hotel
          }),
        )

        // Cerrar todos los diálogos
        setIsPaymentDialogOpen(false)
        setIsPromotionDialogOpen(false)
        setIsSummaryDialogOpen(false)

        // Resetear los formularios
        setPromotionForm({
          from: null,
          to: null,
          amount: "",
          paymentMethod: "",
        })

        setPaymentForm({
          cardType: "",
          cardHolder: "",
          cardNumber: "",
          expiryMonth: "",
          expiryYear: "",
          cvc: "",
        })

        // Mostrar mensaje de éxito
        toast({
          title: "Publicidad activada",
          description: "Tu hospedaje está siendo promocionado exitosamente",
        })

        // Recargar los datos para mostrar la nueva publicidad
        window.location.reload()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al procesar el pago'
      
      toast({
        title: "Error al procesar el pago",
        description: errorMessage,
        variant: "destructive",
      })
      
      console.error('❌ Error procesando el pago de publicidad:', err)
    }
  }

  // Función para manejar el cambio en el estado de promoción
  const handlePromotionToggle = (hotelId: string, checked: boolean) => {
    if (checked) {
      // Si se activa, abrir el diálogo de promoción
      openPromotionDialog(hotelId)
    } else {
      // Si se desactiva, actualizar el estado del hotel
      setHotels(
        hotels.map((hotel) => {
          if (hotel.id === hotelId) {
            return {
              ...hotel,
              promotionActive: false,
              promotionPeriod: {
                from: null,
                to: null,
              },
            }
          }
          return hotel
        }),
      )

      // Mostrar mensaje de éxito
      toast({
        title: "Promoción desactivada",
        description: "La promoción ha sido desactivada exitosamente",
      })
    }
  }

  // Función para formatear fechas
  const formatDateRange = (from: Date | null, to: Date | null) => {
    if (!from || !to) return "-"
    return `${format(from, "dd-MM-yyyy", { locale: es })} / ${format(to, "dd-MM-yyyy", { locale: es })}`
  }

  // Filter hotels based on search query
  const filteredHotels = hotels.filter((hotel) => hotel.name.toLowerCase().includes(searchQuery.toLowerCase()))

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentHotels = filteredHotels.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage)

  // Function to change page
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Procesar hospedajes y publicidades cuando cambien los datos
  useEffect(() => {
    if (!hospedajesData?.data || !publicidadesData) return
    
    try {
      const hospedajes = hospedajesData.data
      const publicidades = publicidadesData || []
      
      // Crear un mapa de publicidades por hospedaje ID para fácil acceso
      const publicidadMap = new Map()
      publicidades.forEach((pub: any) => {
        if (pub.estado === "ACTIVA" && new Date(pub.fechaFin) > new Date()) {
          publicidadMap.set(pub.hospedaje.id, pub)
        }
      })
      
      // Los hospedajes ya vienen filtrados por el backend con autorización granular
      const transformedData: Hotel[] = hospedajes.map((hospedaje: any) => {
        const publicidad = publicidadMap.get(hospedaje.id)
        
        return {
          id: hospedaje.id,
          name: hospedaje.nombre,
          status: publicidad ? "Promocionado" : "Normal",
          promotionActive: !!publicidad,
          promotionPeriod: {
            from: publicidad ? new Date(publicidad.fechaInicio) : null,
            to: publicidad ? new Date(publicidad.fechaFin) : null,
          },
        }
      })
      
      setHotels(transformedData)
      
      console.log("Datos procesados:", {
        hospedajes: hospedajes.length,
        publicidades: publicidades.length,
        hotelsFinales: transformedData.length
      })
      
    } catch (error) {
      console.error("Error processing data:", error)
      toast({
        title: "Error",
        description: "No se pudieron procesar los datos de publicidad",
        variant: "destructive",
      })
    }
  }, [hospedajesData?.data, publicidadesData])

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <h1 className="text-xl font-medium text-orange-700">Hospedajes / Publicidad</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex justify-between mb-6">
          <div className="flex gap-2">
            <div className="relative">
              <Input
                placeholder="Buscar hotel..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-8 w-[250px]"
              />
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-500" />
            </div>
          </div>
          <Button variant="outline" className="text-orange-600 border-orange-600">
            <FileUp className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Promocionar</TableHead>
                <TableHead>Desde-Hasta</TableHead>
                <TableHead>Ver Pago</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoadingHospedajes || isLoadingPublicidades) ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                      <p>Cargando datos...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentHotels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">No tienes hospedajes registrados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell>{hotel.name}</TableCell>
                    <TableCell>{hotel.status}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className={hotel.promotionActive ? "text-gray-400" : "text-red-500"}>Inactivo</span>
                        <Switch
                          checked={hotel.promotionActive}
                          onCheckedChange={(checked) => handlePromotionToggle(hotel.id, checked)}
                        />
                        <span className={hotel.promotionActive ? "text-green-500" : "text-gray-400"}>Activo</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDateRange(hotel.promotionPeriod.from, hotel.promotionPeriod.to)}</TableCell>
                    <TableCell>
                      {hotel.promotionActive ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleViewPayment(hotel)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Pago
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">Sin pago</span>
                      )}
                    </TableCell>
                    <ActionCell hotel={hotel} onDelete={handleDeleteAd} />
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredHotels.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-gray-500">
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredHotels.length)} de{" "}
              {filteredHotels.length} resultados
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center">
                <span className="text-sm mr-2">Elementos por página:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Mostrar páginas alrededor de la página actual
                    let pageToShow
                    if (totalPages <= 5) {
                      pageToShow = i + 1
                    } else if (currentPage <= 3) {
                      pageToShow = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageToShow = totalPages - 4 + i
                    } else {
                      pageToShow = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageToShow ? "default" : "outline"}
                        size="sm"
                        onClick={() => paginate(pageToShow)}
                        className={`h-8 w-8 p-0 mx-1 ${currentPage === pageToShow ? "bg-orange-600" : ""}`}
                      >
                        {pageToShow}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Eliminar Publicidad"
          description="¿Estás seguro de que deseas eliminar esta publicidad? Esta acción no se puede deshacer."
        />

        <PaymentDetailsModal
          isOpen={isPaymentDetailsModalOpen}
          onClose={() => setIsPaymentDetailsModalOpen(false)}
          publicidad={selectedPublicidad}
          hospedajeName={selectedPublicidad?.hospedaje?.nombre || ''}
        />
      </main>

      {/* Diálogo para configurar promoción */}
      <Dialog open={isPromotionDialogOpen} onOpenChange={setIsPromotionDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-orange-700">Promocionar - Paso 1 de 3</DialogTitle>
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">1</div>
                <div className="w-8 h-1 bg-gray-300"></div>
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">2</div>
                <div className="w-8 h-1 bg-gray-300"></div>
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="from-date">Desde</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-1"
                  id="from-date"
                  onClick={() => {
                    setShowFromCalendar(true)
                    setShowToCalendar(false)
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {promotionForm.from ? (
                    format(promotionForm.from, "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>

                {showFromCalendar && (
                  <div className="mt-2 absolute z-50 bg-white rounded-lg shadow-lg">
                    <CustomCalendar
                      value={promotionForm.from}
                      onChange={(date) => handlePromotionFormChange("from", date)}
                      minDate={new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
                      onClose={() => setShowFromCalendar(false)}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="to-date">Hasta</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal mt-1"
                  id="to-date"
                  onClick={() => {
                    setShowToCalendar(true)
                    setShowFromCalendar(false)
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {promotionForm.to ? (
                    format(promotionForm.to, "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>

                {showToCalendar && (
                  <div className="mt-2 absolute z-50 bg-white rounded-lg shadow-lg">
                    <CustomCalendar
                      value={promotionForm.to}
                      onChange={(date) => handlePromotionFormChange("to", date)}
                      minDate={promotionForm.from || new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())}
                      onClose={() => setShowToCalendar(false)}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="amount">Monto</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ingrese el monto"
                  value={promotionForm.amount}
                  onChange={(e) => handlePromotionFormChange("amount", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="payment-method">Medio de pago</Label>
                <Select
                  value={promotionForm.paymentMethod}
                  onValueChange={(value) => handlePromotionFormChange("paymentMethod", value)}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit-card">Tarjeta de crédito</SelectItem>
                    <SelectItem value="debit-card">Tarjeta de débito</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromotionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-gray-500 hover:bg-gray-600" onClick={handleContinueToPayment}>
              Siguiente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para pago con tarjeta */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-orange-700">Promocionar - Paso 2 de 3</DialogTitle>
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
                <div className="w-8 h-1 bg-green-600"></div>
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">2</div>
                <div className="w-8 h-1 bg-gray-300"></div>
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm">3</div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Método de pago</Label>
              <Input
                value={
                  promotionForm.paymentMethod === "credit-card"
                    ? "Tarjeta de crédito"
                    : promotionForm.paymentMethod === "debit-card"
                      ? "Tarjeta de débito"
                      : "Transferencia"
                }
                disabled
                className="bg-gray-100"
              />
            </div>

            {(promotionForm.paymentMethod === "credit-card" || promotionForm.paymentMethod === "debit-card") && (
              <>
                <div>
                  <Label htmlFor="card-type" className="text-red-500">
                    Tipo de tarjeta *
                  </Label>
                  <Select
                    value={paymentForm.cardType}
                    onValueChange={(value) => handlePaymentFormChange("cardType", value)}
                  >
                    <SelectTrigger id="card-type">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visa">Visa</SelectItem>
                      <SelectItem value="mastercard">Mastercard</SelectItem>
                      <SelectItem value="amex">American Express</SelectItem>
                      {promotionForm.paymentMethod === "debit-card" && (
                        <>
                          <SelectItem value="maestro">Maestro</SelectItem>
                          <SelectItem value="cabal">Cabal</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="card-holder" className="text-red-500">
                    Titular de la tarjeta *
                  </Label>
                  <Input
                    id="card-holder"
                    placeholder="Nombre"
                    value={paymentForm.cardHolder}
                    onChange={(e) => handlePaymentFormChange("cardHolder", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="card-number" className="text-red-500">
                    Número de la tarjeta {promotionForm.paymentMethod === "credit-card" ? "de crédito" : "de débito"} *
                  </Label>
                  <Input
                    id="card-number"
                    placeholder="Ingresar"
                    value={paymentForm.cardNumber}
                    onChange={(e) => handlePaymentFormChange("cardNumber", e.target.value.replace(/\D/g, ""))}
                    maxLength={16}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry-date" className="text-red-500">
                      Fecha de caducidad *
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={paymentForm.expiryMonth}
                        onValueChange={(value) => handlePaymentFormChange("expiryMonth", value)}
                      >
                        <SelectTrigger id="expiry-month" className="w-full">
                          <SelectValue placeholder="Mes" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => {
                            const month = i + 1
                            return (
                              <SelectItem key={month} value={month.toString().padStart(2, "0")}>
                                {month.toString().padStart(2, "0")}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>

                      <Select
                        value={paymentForm.expiryYear}
                        onValueChange={(value) => handlePaymentFormChange("expiryYear", value)}
                      >
                        <SelectTrigger id="expiry-year" className="w-full">
                          <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() + i
                            return (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="cvc" className="text-red-500">
                      CVC *
                    </Label>
                    <Input
                      id="cvc"
                      placeholder=""
                      maxLength={4}
                      value={paymentForm.cvc}
                      onChange={(e) => handlePaymentFormChange("cvc", e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </div>
              </>
            )}

            {promotionForm.paymentMethod === "transfer" && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">Datos para transferencia</h3>
                <p className="text-sm mb-1">Banco: Banco Nacional</p>
                <p className="text-sm mb-1">Titular: Capturecita S.A.</p>
                <p className="text-sm mb-1">CUIT: 30-12345678-9</p>
                <p className="text-sm mb-1">CBU: 0110012345678901234567</p>
                <p className="text-sm mb-1">Alias: CAPTURECITA.HOTEL</p>
                <p className="text-sm mt-3 text-orange-600">
                  Una vez realizada la transferencia, envíe el comprobante a admin@capturecita.com
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleBackToPromotion}>
              Atrás
            </Button>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-gray-500 hover:bg-gray-600"
              onClick={handleContinueToSummary}
            >
              Siguiente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para resumen */}
      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-orange-700">Promocionar - Paso 3 de 3: Resumen</DialogTitle>
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
                <div className="w-8 h-1 bg-green-600"></div>
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm">✓</div>
                <div className="w-8 h-1 bg-green-600"></div>
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm">3</div>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Información del Hospedaje */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                🏨 Hospedaje
              </h3>
              <p className="text-gray-700 font-medium">
                {hotels.find(h => h.id === currentHotelId)?.name || 'Hospedaje seleccionado'}
              </p>
            </div>

            {/* Período de Promoción */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                📅 Período de Promoción
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de Inicio:</p>
                  <p className="text-gray-900 font-semibold">
                    {promotionForm.from ? format(promotionForm.from, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'No especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Fecha de Fin:</p>
                  <p className="text-gray-900 font-semibold">
                    {promotionForm.to ? format(promotionForm.to, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'No especificada'}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm font-medium text-gray-600">Duración:</p>
                <p className="text-blue-700 font-semibold">
                  {promotionForm.from && promotionForm.to ? 
                    `${Math.ceil((promotionForm.to.getTime() - promotionForm.from.getTime()) / (1000 * 60 * 60 * 24))} días` 
                    : 'No calculada'}
                </p>
              </div>
            </div>

            {/* Información de Pago */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                💰 Información de Pago
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monto de Publicidad:</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${Number(promotionForm.amount || 0).toLocaleString('es-AR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Método de Pago:</p>
                  <p className="text-gray-900 font-semibold">
                    {promotionForm.paymentMethod === "credit-card" 
                      ? "Tarjeta de Crédito" 
                      : promotionForm.paymentMethod === "debit-card" 
                        ? "Tarjeta de Débito" 
                        : "Transferencia Bancaria"}
                  </p>
                </div>
              </div>
              
              {/* Información de la Tarjeta */}
              {(promotionForm.paymentMethod === "credit-card" || promotionForm.paymentMethod === "debit-card") && (
                <div className="pt-3 border-t border-green-200">
                  <h4 className="font-medium text-gray-900 mb-2">Detalles de la Tarjeta:</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Tipo:</p>
                      <p className="text-gray-900">{paymentForm.cardType?.toUpperCase() || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Titular:</p>
                      <p className="text-gray-900">{paymentForm.cardHolder || 'No especificado'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Número:</p>
                      <p className="text-gray-900 font-mono">
                        {paymentForm.cardNumber ? 
                          `${paymentForm.cardNumber.slice(0, 4)} **** **** ${paymentForm.cardNumber.slice(-4)}` 
                          : 'No especificado'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Vencimiento:</p>
                      <p className="text-gray-900">
                        {paymentForm.expiryMonth && paymentForm.expiryYear ? 
                          `${paymentForm.expiryMonth}/${paymentForm.expiryYear}` 
                          : 'No especificado'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información de Transferencia */}
              {promotionForm.paymentMethod === "transfer" && (
                <div className="pt-3 border-t border-green-200">
                  <h4 className="font-medium text-gray-900 mb-2">Datos para Transferencia:</h4>
                  <div className="bg-white p-3 rounded border text-sm">
                    <p><strong>Banco:</strong> Banco Nacional</p>
                    <p><strong>Titular:</strong> Capturecita S.A.</p>
                    <p><strong>CUIT:</strong> 30-12345678-9</p>
                    <p><strong>CBU:</strong> 0110012345678901234567</p>
                    <p><strong>Alias:</strong> CAPTURECITA.HOTEL</p>
                  </div>
                  <p className="text-sm text-orange-600 mt-2">
                    💡 Recuerde enviar el comprobante a admin@capturecita.com
                  </p>
                </div>
              )}
            </div>

            {/* Resumen Total */}
            <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                📋 Resumen de la Operación
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hospedaje a promocionar:</span>
                  <span className="font-semibold">{hotels.find(h => h.id === currentHotelId)?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Duración de la promoción:</span>
                  <span className="font-semibold">
                    {promotionForm.from && promotionForm.to ? 
                      `${Math.ceil((promotionForm.to.getTime() - promotionForm.from.getTime()) / (1000 * 60 * 60 * 24))} días` 
                      : 'No calculada'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Método de pago:</span>
                  <span className="font-semibold">
                    {promotionForm.paymentMethod === "credit-card" 
                      ? "Tarjeta de Crédito" 
                      : promotionForm.paymentMethod === "debit-card" 
                        ? "Tarjeta de Débito" 
                        : "Transferencia"}
                  </span>
                </div>
                <div className="border-t border-orange-300 pt-2 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total a pagar:</span>
                    <span className="text-2xl font-bold text-orange-600">
                      ${Number(promotionForm.amount || 0).toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmación */}
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                ⚠️ Importante
              </h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Al confirmar, se procesará el pago inmediatamente</li>
                <li>• La promoción comenzará en la fecha especificada</li>
                <li>• Podrá ver el hospedaje destacado durante el período seleccionado</li>
                {promotionForm.paymentMethod === "transfer" && (
                  <li>• Para transferencias, debe enviar el comprobante para activar la promoción</li>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleBackToPayment}>
              Atrás
            </Button>
            <Button variant="outline" onClick={() => setIsSummaryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleProcessPayment}
              disabled={isLoadingCrearPublicidad}
            >
              {isLoadingCrearPublicidad ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando pago...
                </>
              ) : (
                promotionForm.paymentMethod === "transfer" ? "Confirmar Transferencia" : "Confirmar y Pagar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
