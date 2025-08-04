"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Header from "@/components/shared/header"
import Footer from "@/components/shared/footer"
import HotelHeader from "@/components/hospedaje/header"
import HotelServices from "@/components/hospedaje/services"
import HotelDescription from "@/components/hospedaje/description"
import HotelTabs from "@/components/hospedaje/tabs-container"
import BookingForm from "@/components/hospedaje/booking-form"
import ChatButton from "@/components/chatbot/chat-button"
import HotelGallery from "@/components/hospedaje/hotel-gallery"
import { useHospedaje, useHabitacionesHospedaje, useOpinionesHospedaje, useServiciosHospedaje, useServiciosHabitacion, useDisponibilidadHabitaciones, useHabitacionesAgrupadasHospedaje } from "@/hooks/use-api"
import { authUtils } from "@/lib/api/client"
import { Loader2 } from "lucide-react"
import { getClientApiUrl } from "@/lib/utils/api-urls"

// Funciones para cálculo de precios con ajustes
const calculateNights = (from: Date, to: Date): number => {
  const diffTime = to.getTime() - from.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 5 || day === 6 || day === 0 // viernes, sábado, domingo (como el backend)
}

const isInTemporadaRange = (date: Date, desde: string, hasta: string): boolean => {
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
  return dateStr >= desde && dateStr <= hasta
}

const calculateDailyPrices = (
  checkIn: Date, 
  checkOut: Date, 
  basePrice: number, 
  ajustes: any[]
): { totalPrice: number, breakdown: Array<{date: string, price: number, adjustments: string[]}> } => {
  const breakdown: Array<{date: string, price: number, adjustments: string[]}> = []
  let totalPrice = 0
  
  const currentDate = new Date(checkIn)
  
  while (currentDate < checkOut) {
    let dayPrice = basePrice
    const adjustments: string[] = []
    
    // Aplicar ajustes siguiendo la misma lógica del backend
    ajustes.forEach(ajuste => {
      if (!ajuste.active) return
      
      // Aplicar ajuste de temporada primero
      if (ajuste.tipo === 'TEMPORADA' && isInTemporadaRange(currentDate, ajuste.desde, ajuste.hasta)) {
        dayPrice = dayPrice * (1 + ajuste.incrementoPct / 100)
        adjustments.push(`Temporada +${ajuste.incrementoPct}%`)
      }
    })
    
    // Aplicar ajuste de fin de semana después
    if (isWeekend(currentDate)) {
      const ajusteFinde = ajustes.find(ajuste => 
        ajuste.active && ajuste.tipo === 'FINDE'
      )
      
      if (ajusteFinde && ajusteFinde.incrementoPct !== undefined) {
        dayPrice = dayPrice * (1 + ajusteFinde.incrementoPct / 100)
        adjustments.push(`Fin de semana +${ajusteFinde.incrementoPct}%`)
      }
    }
    
    breakdown.push({
      date: currentDate.toISOString().split('T')[0],
      price: Math.round(dayPrice * 100) / 100,
      adjustments
    })
    
    totalPrice += Math.round(dayPrice * 100) / 100
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return { totalPrice: Math.round(totalPrice * 100) / 100, breakdown }
}

export default function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [roomQuantities, setRoomQuantities] = useState<{ [key: string]: number }>({})
  // ELIMINADO: const [selectedRooms, setSelectedRooms] = useState - ahora usamos selectedRoomsList

  // Unwrap params Promise
  const { id } = use(params)

  // Obtener parámetros de búsqueda de la URL
  const fechaInicio = searchParams.get('fechaInicio')
  const fechaFin = searchParams.get('fechaFin')
  const huespedes = Number(searchParams.get('huespedes')) || 2
  const cantidadHabitaciones = Number(searchParams.get('habitaciones')) || 1

  // Convertir fechas de string a Date si existen (evitando problemas de zona horaria)
  const initialCheckIn = fechaInicio ? new Date(fechaInicio + 'T12:00:00') : undefined
  const initialCheckOut = fechaFin ? new Date(fechaFin + 'T12:00:00') : undefined

  // Hooks para obtener datos del backend
  const { data: hospedaje, isLoading: isLoadingHospedaje, error: errorHospedaje } = useHospedaje(id)
  const { data: habitaciones, isLoading: isLoadingHabitaciones } = useHabitacionesHospedaje(id)
  const { data: habitacionesAgrupadas, isLoading: isLoadingHabitacionesAgrupadas } = useHabitacionesAgrupadasHospedaje(
    id, 
    fechaInicio || undefined, 
    fechaFin || undefined, 
    huespedes
  )
  const { data: opiniones, isLoading: isLoadingOpiniones } = useOpinionesHospedaje(id)
  const { data: servicios, isLoading: isLoadingServicios } = useServiciosHospedaje(id)
  
  // Hook personalizado para cargar servicios de todas las habitaciones
  const useHabitacionesConServicios = () => {
    const [habitacionesConServicios, setHabitacionesConServicios] = useState<any[]>([])
    const [isLoadingServiciosHabitaciones, setIsLoadingServiciosHabitaciones] = useState(false)

    useEffect(() => {
      const obtenerServiciosHabitaciones = async () => {
        if (!habitaciones?.data?.length) {
          setHabitacionesConServicios([])
          return
        }

        setIsLoadingServiciosHabitaciones(true)
        try {
          const habitacionesConServiciosData = await Promise.all(
            habitaciones.data.map(async (habitacion: any) => {
              try {
                const response = await fetch(`${getClientApiUrl()}/servicios/habitaciones/${habitacion.id}/servicios`)
                if (response.ok) {
                  const serviciosHabitacion = await response.json()
                  return { ...habitacion, serviciosHabitacion }
                }
                return { ...habitacion, serviciosHabitacion: [] }
              } catch (error) {
                console.error(`Error obteniendo servicios para habitación ${habitacion.id}:`, error)
                return { ...habitacion, serviciosHabitacion: [] }
              }
            })
          )
          setHabitacionesConServicios(habitacionesConServiciosData)
        } catch (error) {
          console.error('Error obteniendo servicios de habitaciones:', error)
          setHabitacionesConServicios(habitaciones.data.map((h: any) => ({ ...h, serviciosHabitacion: [] })))
        } finally {
          setIsLoadingServiciosHabitaciones(false)
        }
      }

      obtenerServiciosHabitaciones()
    }, [habitaciones?.data?.length, JSON.stringify(habitaciones?.data?.map((h: any) => h.id))])

    return {
      data: habitacionesConServicios.length ? habitacionesConServicios : habitaciones?.data || [],
      isLoading: isLoadingServiciosHabitaciones,
    }
  }

  // Usar el hook personalizado
  const { data: habitacionesConServiciosData, isLoading: isLoadingServiciosHabitaciones } = useHabitacionesConServicios()
  
  // Hook para verificar disponibilidad de habitaciones en las fechas especificadas (solo fechas)
  const { 
    habitacionesDisponibles, 
    isLoading: isLoadingDisponibilidad, 
    error: errorDisponibilidad 
  } = useDisponibilidadHabitaciones(id, fechaInicio || undefined, fechaFin || undefined)

  // Verificación de inicio de sesión
  useEffect(() => {
    const isAuth = authUtils.isAuthenticated()
    const token = authUtils.getToken()
    console.log('🔍 Estado de autenticación:', { isAuth, token: token ? 'token presente' : 'sin token' })
    setIsLoggedIn(isAuth)
  }, [])

  const handleReservation = () => {
    console.log('🔍 HandleReservation - Estado de autenticación:', isLoggedIn)
    console.log('🔍 HandleReservation - Habitaciones seleccionadas:', selectedRoomsList)
    
    // Verificar que hay al menos una habitación seleccionada
    if (selectedRoomsList.length === 0) {
      alert('Por favor, selecciona al menos una habitación en la pestaña "Habitaciones" antes de reservar.')
      return
    }

    // Verificar que hay fechas seleccionadas
    if (!fechaInicio || !fechaFin) {
      alert('Por favor, selecciona las fechas de ingreso y salida.')
      return
    }
    
    if (isLoggedIn) {
      // Calcular datos de la reserva
      const checkInDate = new Date(fechaInicio + 'T12:00:00')
      const checkOutDate = new Date(fechaFin + 'T12:00:00')
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calcular precios con ajustes para cada habitación
      let subtotalConAjustes = 0
      
      selectedRoomsList.forEach(room => {
        const basePrice = parseFloat(room.precioBase?.toString() || '0')
        const ajustes = (room as any).ajustesPrecio || []
        
        // Aplicar cálculo de precios con ajustes para esta habitación
        const priceCalculation = calculateDailyPrices(checkInDate, checkOutDate, basePrice, ajustes)
        subtotalConAjustes += priceCalculation.totalPrice
      })
      
      // Calcular precio promedio por noche CON ajustes
      const precioPorNochePromedio = Math.round(subtotalConAjustes / nights)
      
      const subtotal = subtotalConAjustes
      const impuestos = Math.round(subtotal * 0.21) // IVA 21%
      const total = subtotal + impuestos
      
      console.log('💰 Precios calculados con ajustes:', {
        habitaciones: selectedRoomsList.map(r => r.nombre),
        precioPorNochePromedio,
        subtotalConAjustes,
        subtotal,
        impuestos,
        total
      })

      // Construir URL solo con datos básicos (sin precios calculados)
      // Usar los IDs únicos reales de cada habitación seleccionada
      const habitacionIds = selectedRoomsList.map(room => room.id).join(',')
      const searchParams = new URLSearchParams({
        hospedajeId: id,
        habitacionIds: habitacionIds,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        huespedes: huespedes.toString()
      })

      const checkoutUrl = `/checkout?${searchParams.toString()}`
      console.log('🔍 Redirigiendo a checkout (precios se calcularán en checkout):', {
        hospedajeId: id,
        habitacionIds,
        fechaInicio,
        fechaFin,
        huespedes
      })
      router.push(checkoutUrl)
    } else {
      console.log('🔍 Usuario no autenticado, redirigiendo a login')
      // Construir URL de login con callbackUrl para redirigir al checkout después del login
      const habitacionIds = selectedRoomsList.map(room => room.id).join(',')
      const checkInDate = new Date(fechaInicio + 'T12:00:00')
      const checkOutDate = new Date(fechaFin + 'T12:00:00')
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Calcular precios con ajustes para cada habitación (igual que arriba)
      let subtotalConAjustes = 0
      
      selectedRoomsList.forEach((room: any) => {
        const basePrice = parseFloat(room.precioBase?.toString() || '0')
        const ajustes = room.ajustesPrecio || []
        
        // Aplicar cálculo de precios con ajustes para esta habitación
        const priceCalculation = calculateDailyPrices(checkInDate, checkOutDate, basePrice, ajustes)
        subtotalConAjustes += priceCalculation.totalPrice
      })
      
      // Calcular precio promedio por noche CON ajustes
      const precioPorNochePromedio = Math.round(subtotalConAjustes / nights)
      
      const subtotal = subtotalConAjustes
      const impuestos = Math.round(subtotal * 0.21)
      const total = subtotal + impuestos

      const checkoutParams = new URLSearchParams({
        hospedajeId: id,
        habitacionIds: habitacionIds,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        huespedes: huespedes.toString()
      })
      
      const callbackUrl = `/checkout?${checkoutParams.toString()}`
      const loginUrl = `/auth/login/tourist?callbackUrl=${encodeURIComponent(callbackUrl)}`
      console.log('🔍 Redirigiendo a login con callback:', { loginUrl, callbackUrl })
      router.push(loginUrl)
    }
  }

  // Estado para gestionar habitaciones seleccionadas como array individual
  const [selectedRoomsList, setSelectedRoomsList] = useState<any[]>([])

  // Función para agregar habitaciones (nueva lógica)
  const handleRoomSelection = (roomId: string) => {
    const room = hotelRooms.find((h: any) => h.id === roomId)
    if (room) {
      const quantity = roomQuantities[roomId] || 1;
      
      // Verificar que hay suficientes habitaciones disponibles
      const habitacionesDisponibles = room.habitacionesIds || []
      if (quantity > habitacionesDisponibles.length) {
        alert(`Solo hay ${habitacionesDisponibles.length} habitaciones disponibles de este tipo. Solicitaste ${quantity}.`)
        return
      }
      
      // Agregar múltiples habitaciones usando IDs únicos reales
      const newRooms: any[] = []
      for (let i = 0; i < quantity; i++) {
        const habitacionUnicaId = habitacionesDisponibles[i] // ID único real de cada habitación
        if (habitacionUnicaId) {
          const uniqueId = `${habitacionUnicaId}_${Date.now()}_${i}` // ID único para gestión individual
          newRooms.push({
            ...room,
            id: habitacionUnicaId, // ID único real de la habitación física
            uniqueId: uniqueId, // ID único para gestión individual
            originalRoomId: roomId, // ID original del tipo de habitación (para referencia)
            instanceIndex: i + 1, // Índice de la instancia (ej: "Habitación Doble #1")
            // Mantener campos de capacidad para validación
            capacity: room.capacity,
            capacidad: room.capacity,
            precioBase: room.price,
            nombre: `${room.name} #${i + 1}` // Nombre con numeración
          })
        }
      }
      
      // Agregar las nuevas habitaciones a la lista
      setSelectedRoomsList(prev => [...prev, ...newRooms])
      
      console.log(`🏠 [handleRoomSelection] Agregadas ${quantity} habitaciones de tipo: ${room.name}`, {
        habitacionesIds: newRooms.map(r => r.id),
        habitacionesDisponibles: habitacionesDisponibles
      })
    }
  }

  // Función para quitar una habitación específica
  const handleRemoveRoom = (uniqueId: string) => {
    setSelectedRoomsList(prev => prev.filter(room => room.uniqueId !== uniqueId))
    console.log('🗑️ [handleRemoveRoom] Habitación removida:', uniqueId)
  }

  // Función para limpiar todas las selecciones
  const handleClearAllRooms = () => {
    setSelectedRoomsList([])
    console.log('🗑️ [handleClearAllRooms] Todas las habitaciones removidas')
  }

  // Convertir selectedRoomsList a formato compatible con selectedRooms para BookingForm
  const selectedRoomsForBooking = selectedRoomsList

  const handleRoomReservation = (roomId: string) => {
    // Esta función ya no se usa directamente, pero la mantengo para compatibilidad
    console.log(`🔍 handleRoomReservation llamada para habitación: ${roomId}`)
    
    // Solo seleccionar la habitación, el usuario usará el botón principal "Reservar"
    handleRoomSelection(roomId)
  }

  // Función para manejar cambios de fechas y actualizar la URL
  const handleDatesChange = (checkIn: Date, checkOut: Date, guests: number) => {
    const fechaInicio = checkIn.toISOString().split('T')[0] // YYYY-MM-DD
    const fechaFin = checkOut.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Actualizar la URL con las nuevas fechas
    const newSearchParams = new URLSearchParams({
      fechaInicio,
      fechaFin,
      huespedes: guests.toString(),
      habitaciones: cantidadHabitaciones.toString()
    })
    
    const newUrl = `/hospedaje/${id}?${newSearchParams.toString()}`
    
    console.log('🔍 Actualizando URL por cambio de fechas:', {
      fechaInicio,
      fechaFin,
      guests,
      newUrl
    })
    
    // Actualizar la URL sin recargar la página
    router.replace(newUrl)
  }

  // Mostrar loading mientras se cargan los datos principales
  if (isLoadingHospedaje || isLoadingHabitaciones || isLoadingServiciosHabitaciones) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>
              {isLoadingHospedaje && "Cargando información del hospedaje..."}
              {isLoadingHabitaciones && "Cargando habitaciones..."}
              {isLoadingServiciosHabitaciones && "Cargando servicios de habitaciones..."}
            </p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Mostrar error si no se puede cargar el hospedaje
  if (errorHospedaje || !hospedaje) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Hospedaje no encontrado</h1>
            <p className="text-gray-600 mb-4">El hospedaje que buscas no existe o no está disponible.</p>
            <button 
              onClick={() => router.push('/search')}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700"
            >
              Buscar otros hospedajes
            </button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // Calcular el precio base acumulado de todas las habitaciones seleccionadas
  // Ya no necesitamos crear selectedRoomsList - ya es nuestro estado
  const basePrice = selectedRoomsList.reduce((total, room) => {
    return total + parseFloat(room.precioBase?.toString() || '0')
  }, 0)
  
  // Obtener ajustes de precio combinados (usar los de la primera habitación por simplicidad)
  const priceAdjustments = selectedRoomsList.length > 0 ? (selectedRoomsList[0] as any)?.ajustesPrecio || [] : []
  
  // Log temporal para verificar datos
  console.log('🔍 Datos para BookingForm:', {
    basePrice,
    priceAdjustments,
    habitacion: habitaciones?.data?.[0]
  })

  // Procesar imágenes del hospedaje - ordenar por campo 'orden' y usar URLs reales
  const hotelImages = hospedaje?.imagenes?.length 
    ? hospedaje.imagenes
        .sort((a: any, b: any) => a.orden - b.orden) // Ordenar por el campo 'orden'
        .map((img: any) => img.url)
    : [
        "/mountain-cabin-retreat.png",
        "/secluded-mountain-retreat.png", 
        "/cozy-mountain-retreat.png",
      ]

  // Procesar servicios para el formato esperado por el componente
  const hotelServices = servicios?.map(hospedajeServicio => ({
    name: hospedajeServicio.servicio.nombre,
    icon: hospedajeServicio.servicio.iconoUrl || "Settings"
  })) || []

  // Procesar habitaciones agrupadas para el formato esperado RoomType
  const hotelRooms = habitacionesAgrupadas?.data?.map((habitacionGrupo: any) => {
    console.log('🏠 [HospedajePage] Procesando grupo de habitaciones:', {
      nombre: habitacionGrupo.nombre,
      cantidadTotal: habitacionGrupo.cantidadTotal,
      cantidadDisponible: habitacionGrupo.cantidadDisponible,
      capacidad: habitacionGrupo.capacidad
    });

    // Verificar disponibilidad
    const isAvailable = habitacionGrupo.cantidadDisponible > 0;
    
    // NOTA: Removido filtro de capacidad individual para permitir selección múltiple
    // La validación de capacidad total se hará en el BookingForm
    
    // Determinar el motivo de no disponibilidad (solo por fechas)
    let unavailableReason = null;
    if (!isAvailable) {
      unavailableReason = 'dates';
    }
    
    const finalAvailability = isAvailable; // Solo verificar disponibilidad por fechas
    
    return {
      id: habitacionGrupo.id, // ID representativo del grupo
      name: habitacionGrupo.nombre, // Nombre sin numeración
      description: habitacionGrupo.descripcionCorta || habitacionGrupo.descripcionLarga || "Sin descripción disponible",
      descripcionLarga: habitacionGrupo.descripcionLarga,
      capacity: habitacionGrupo.capacidad,
      capacidad: habitacionGrupo.capacidad, // Mantener ambos campos para compatibilidad
      price: habitacionGrupo.precioBase,
      
      // Campos de compatibilidad
      available: habitacionGrupo.cantidadDisponible || 0,
      isAvailable: finalAvailability,
      unavailableReason,
      
      // NUEVOS campos para habitaciones agrupadas
      cantidadTotal: habitacionGrupo.cantidadTotal,
      cantidadDisponible: habitacionGrupo.cantidadDisponible,
      habitacionesIds: habitacionGrupo.habitacionesDisponiblesIds || [],
      esGrupo: habitacionGrupo.cantidadTotal > 1,
      
      // Información visual
      image: habitacionGrupo.imagenes?.sort((a: any, b: any) => (a.orden || 999) - (b.orden || 999))?.[0]?.url || "/mountain-cabin-retreat.png",
      services: (habitacionGrupo.servicios || []).map((servicioHab: any) => ({
        name: servicioHab.servicio?.nombre || 'Servicio',
        description: servicioHab.servicio?.descripcion || ''
      })),
      images: habitacionGrupo.imagenes?.sort((a: any, b: any) => (a.orden || 999) - (b.orden || 999))?.map((img: any) => img.url) || ["/mountain-cabin-retreat.png"]
    }
  }) || []

  // Procesar opiniones para el formato esperado
  const hotelReviews = opiniones?.map(opinion => ({
    id: opinion.id,
    user: opinion.usuario?.name || "Usuario",
    rating: opinion.calificacion,
    date: new Date(opinion.createdAt).toLocaleDateString('es-ES'),
    comment: opinion.comentario
  })) || []

  // Calcular rating promedio
  const averageRating = opiniones?.length 
    ? opiniones.reduce((sum, op) => sum + op.calificacion, 0) / opiniones.length 
    : 0

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Hotel Details */}
          <div className="flex-1">
            {/* Hotel Header */}
            <HotelHeader
              name={hospedaje.nombre}
              rating={averageRating}
              reviewCount={opiniones?.length || 0}
              location={hospedaje.direccion || "La Cumbrecita, Córdoba"}
              price={habitaciones?.data?.length 
                ? Math.min(...habitaciones.data.map(h => h.precioBase))
                : 15000
              }
            />

            {/* Hotel Gallery - Nueva galería estilo Booking */}
            <div className="mb-8">
              <HotelGallery 
                images={hotelImages} 
                hotelName={hospedaje.nombre}
              />
            </div>

            {/* Description */}
            <HotelDescription description={hospedaje.descripcionLarga} />

            {/* Services */}
            {!isLoadingServicios && hotelServices.length > 0 && (
              <HotelServices 
                services={hotelServices} 
                title="Servicios del Hospedaje"
              />
            )}

            {/* Tabs for Rooms, Reviews, Location */}
            <HotelTabs
              rooms={hotelRooms}
              reviews={hotelReviews}
              rating={averageRating}
              reviewCount={opiniones?.length || 0}
              hotelName={hospedaje.nombre}
              address={hospedaje.direccion}
              latitud={hospedaje.latitud}
              longitud={hospedaje.longitud}
              directions={"Acceso desde la ruta principal"}
              pointsOfInterest={[]}
              roomQuantities={roomQuantities}
              setRoomQuantities={setRoomQuantities}
              handleRoomReservation={handleRoomReservation}
              handleRoomSelection={handleRoomSelection}
              selectedRoomIds={selectedRoomsList.map(room => room.originalRoomId || room.id)}
              isLoadingDisponibilidad={isLoadingDisponibilidad}
              requiredGuests={huespedes}
            />
          </div>

          {/* Right Column - Booking */}
          <div className="lg:w-80 xl:w-96">
            <BookingForm 
              basePrice={basePrice}
              priceAdjustments={priceAdjustments}
              onReservation={handleReservation}
              onDatesChange={handleDatesChange}
              initialCheckIn={initialCheckIn}
              initialCheckOut={initialCheckOut}
              initialGuests={huespedes}
              initialRooms={cantidadHabitaciones}
              selectedRooms={selectedRoomsForBooking}
              onRemoveRoom={handleRemoveRoom}
              onClearAllRooms={handleClearAllRooms}
            />
          </div>
        </div>
      </div>

      {/* Chatbot flotante */}
      <div className="fixed bottom-6 right-6 z-50">
        <ChatButton
          hospedajeId={hospedaje.id}
          hospedajeName={hospedaje.nombre}
          variant="default"
          className="bg-[#CD6C22] hover:bg-[#A83921] text-white rounded-full px-6 py-3 shadow-lg"
        />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
