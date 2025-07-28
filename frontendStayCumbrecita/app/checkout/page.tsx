"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { CheckoutProvider } from "@/components/checkout-context"
import CheckoutSteps from "@/components/checkout/checkout-steps"
import { useHospedaje, useHabitacionesHospedaje, useServiciosHabitacion } from "@/hooks/use-api"
import { useUser } from "@/hooks/use-user"
import { Loader2 } from "lucide-react"

// Funciones auxiliares para calcular precios con ajustes
const calculateNights = (from: Date, to: Date): number => {
  const diffTime = to.getTime() - from.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 5 || day === 6 || day === 0 // Viernes, Sábado, Domingo
}

const isInTemporadaRange = (date: Date, desde: string, hasta: string): boolean => {
  if (!desde || !hasta) return false
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
    let dailyPrice = basePrice
    const adjustments: string[] = []
    
    // Aplicar ajustes de temporada primero (formato del backend)
    for (const ajuste of ajustes) {
      if (ajuste.tipo === 'TEMPORADA' && ajuste.desde && ajuste.hasta && ajuste.active) {
        if (isInTemporadaRange(currentDate, ajuste.desde, ajuste.hasta)) {
          const increment = (basePrice * ajuste.incrementoPct / 100)
          dailyPrice += increment
          adjustments.push(`Temporada: +${ajuste.incrementoPct}%`)
        }
      }
    }
    
    // Aplicar ajustes de fin de semana después (sobre el precio ya ajustado por temporada)
    for (const ajuste of ajustes) {
      if (ajuste.tipo === 'FINDE' && ajuste.active && isWeekend(currentDate)) {
        const increment = (dailyPrice * ajuste.incrementoPct / 100)
        dailyPrice += increment
        adjustments.push(`Fin de semana: +${ajuste.incrementoPct}%`)
      }
    }
    
    dailyPrice = Math.round(dailyPrice)
    totalPrice += dailyPrice
    
    breakdown.push({
      date: currentDate.toISOString().split('T')[0],
      price: dailyPrice,
      adjustments
    })
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return { totalPrice, breakdown }
}

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Obtener datos del usuario logueado
  const { user, isLoading: isLoadingUser } = useUser()

  // Obtener parámetros iniciales - solo usar ID real, no default hardcodeado
  const hospedajeId = searchParams.get('hospedajeId')
  // Solo obtener IDs reales de habitaciones, no defaults hardcodeados
  const habitacionIdsParam = searchParams.get('habitacionIds')?.split(',') || 
                            (searchParams.get('habitacionId') ? [searchParams.get('habitacionId')!] : [])

  // Hooks para obtener datos del backend - solo si tenemos ID válido
  const { data: hospedaje, isLoading: isLoadingHospedaje } = useHospedaje(hospedajeId || "")
  const { data: habitaciones, isLoading: isLoadingHabitaciones } = useHabitacionesHospedaje(hospedajeId || "")

  // Hook personalizado para obtener servicios de múltiples habitaciones
  const useServiciosMultiplesHabitaciones = (habitacionIds: string[]) => {
    // Solo hacer queries si tenemos IDs válidos (que parezcan UUIDs reales)
    const validIds = habitacionIds.filter(id => 
      id && 
      id.trim() !== "" && 
      id !== "1" && 
      id.length > 10 // UUIDs tienen más de 10 caracteres
    )
    
    const queries = validIds.map(id => useServiciosHabitacion(id))
    
    return {
      data: queries.map(query => query.data).filter(Boolean),
      isLoading: queries.some(query => query.isLoading),
      isError: queries.some(query => query.isError),
      validIds
    }
  }

  // Obtener servicios de las habitaciones seleccionadas
  const serviciosQueries = useServiciosMultiplesHabitaciones(habitacionIdsParam)
  
  // Debug para ver qué IDs se están usando
  console.log('🔍 Debug habitacionIds:', {
    habitacionIdsParam,
    validIds: serviciosQueries.validIds,
    hospedajeId,
    serviciosData: serviciosQueries.data,
    serviciosLoading: serviciosQueries.isLoading,
    serviciosError: serviciosQueries.isError
  })

  // Estado inicial para la reserva (datos dinámicos)
  const [initialReservation, setInitialReservation] = useState({
    hotel: {
      id: "hotel-1",
      name: "Hotel Las Cascadas",
      location: "Las Truchas s/n - La Cumbrecita - Córdoba, 5858",
      image: "/placeholder.svg?height=200&width=300&text=Hotel+Las+Cascadas",
    },
    room: {
      id: "room-1",
      name: "Habitación Doble Superior con Balcón",
      capacity: 2,
      amenities: ["Desayuno incluido", "WiFi gratis", "Aire acondicionado", "TV"],
    },
    dates: {
      checkIn: new Date("2024-11-17"),
      checkOut: new Date("2024-11-20"),
      nights: 3,
    },
    guests: {
      adults: 2,
      children: 0,
    },
    price: {
      perNight: 13500,
      total: 40500,
      taxes: 8505,
      grandTotal: 49005,
    },
    specialRequests: "",
  })

  // Estado para controlar si ya se inicializaron los datos
  const [dataInitialized, setDataInitialized] = useState(false)
  
  // Estado para los datos personales del usuario
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dni: "",
  })

  // Actualizar datos cuando se cargan del backend (solo una vez)
  useEffect(() => {
    if (hospedaje && habitaciones && !dataInitialized && !serviciosQueries.isLoading) {
      // Obtener parámetros básicos de la URL (sin precios)
      const habitacionIdsArray = searchParams.get('habitacionIds')?.split(',') || 
                                 (searchParams.get('habitacionId') ? [searchParams.get('habitacionId')!] : [])
      const fechaInicioParam = searchParams.get('fechaInicio') || new Date().toISOString()
      const fechaFinParam = searchParams.get('fechaFin') || new Date(Date.now() + 86400000).toISOString()
      const huespedesParam = parseInt(searchParams.get('huespedes') || "2")

      // Función para crear fechas locales correctamente desde formato YYYY-MM-DD
      const createLocalDate = (dateString: string) => {
        // Si viene en formato YYYY-MM-DD, agregarle la hora para evitar problemas de zona horaria
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return new Date(dateString + 'T12:00:00')
        }
        return new Date(dateString)
      }

      // Obtener las habitaciones seleccionadas
      const habitacionesSeleccionadas = habitaciones.data?.filter(h => habitacionIdsArray.includes(h.id)) || []
      const primeraHabitacion = habitacionesSeleccionadas[0] || habitaciones.data?.[0]
      
      const checkInDate = createLocalDate(fechaInicioParam)
      const checkOutDate = createLocalDate(fechaFinParam)

      // Calcular precios desde cero con ajustes
      const nochesCalculadas = calculateNights(checkInDate, checkOutDate)
      
      // Calcular precios con ajustes para cada habitación seleccionada
      let subtotalConAjustes = 0
      
      habitacionesSeleccionadas.forEach(habitacion => {
        const basePrice = parseFloat(habitacion.precioBase?.toString() || '0')
        const ajustes = (habitacion as any).ajustesPrecio || [] // Usar el formato correcto del backend
        
        // Aplicar cálculo de precios con ajustes para esta habitación
        const priceCalculation = calculateDailyPrices(checkInDate, checkOutDate, basePrice, ajustes)
        subtotalConAjustes += priceCalculation.totalPrice
        
        console.log(`💰 Cálculo para habitación ${habitacion.nombre}:`, {
          basePrice,
          ajustes,
          totalParaEstaHabitacion: priceCalculation.totalPrice,
          breakdown: priceCalculation.breakdown
        })
      })
      
      const subtotalCalculado = subtotalConAjustes
      const impuestosCalculados = Math.round(subtotalCalculado * 0.21) // IVA 21%
      const totalCalculado = subtotalCalculado + impuestosCalculados
      const precioPorNocheCalculado = Math.round(subtotalCalculado / nochesCalculadas)

      setInitialReservation({
        hotel: {
          id: hospedaje.id,
          name: hospedaje.nombre,
          location: [hospedaje.direccion, hospedaje.ciudad, hospedaje.provincia]
            .filter(Boolean) // Filtrar valores null, undefined o vacíos
            .join(', '), // Unir con comas solo los valores válidos
          image: hospedaje.imagenes?.[0]?.url || "/placeholder.svg?height=200&width=300&text=Hotel",
        },
        room: {
          id: habitacionesSeleccionadas.length > 1 ? "multiple" : primeraHabitacion?.id || "unknown",
          name: habitacionesSeleccionadas.length > 1 
            ? `${habitacionesSeleccionadas.length} habitaciones` 
            : primeraHabitacion?.nombre || "Habitación",
          capacity: habitacionesSeleccionadas.reduce((total, hab) => total + hab.capacidad, 0),
          amenities: (() => {
            console.log('🔍 Procesando servicios en checkout:', {
              serviciosQueriesData: serviciosQueries.data,
              serviciosQueriesLength: serviciosQueries.data?.length,
              habitacionesSeleccionadas: habitacionesSeleccionadas.map(h => h.nombre)
            })
            
            // Usar servicios obtenidos de la API en lugar de los servicios de la habitación
            if (serviciosQueries.data && serviciosQueries.data.length > 0) {
              // Combinar todos los servicios únicos de todas las habitaciones
              const todosLosServicios = serviciosQueries.data.flatMap(servicios => {
                console.log('🔍 Procesando servicios de una habitación:', servicios)
                return servicios ? servicios.map((s: any) => s.servicio?.nombre || s.nombre) : []
              })
              const serviciosUnicos = [...new Set(todosLosServicios)].filter(nombre => nombre && nombre.trim() !== '')
              console.log('🔍 Servicios únicos encontrados:', serviciosUnicos)
              return serviciosUnicos
            }
            
            // Fallback: usar servicios de las habitaciones si no se han cargado los servicios de la API
            console.log('🔍 Usando fallback para servicios')
            return habitacionesSeleccionadas.length > 1 
              ? [...new Set(habitacionesSeleccionadas.flatMap(hab => hab.servicios?.map((s: any) => s.nombre) || []))]
              : primeraHabitacion?.servicios?.map((s: any) => s.nombre) || []
          })(),
        },
        dates: {
          checkIn: checkInDate,
          checkOut: checkOutDate,
          nights: nochesCalculadas,
        },
        guests: {
          adults: huespedesParam,
          children: 0,
        },
        price: {
          perNight: precioPorNocheCalculado, // Precio por noche ya calculado con ajustes
          total: subtotalCalculado,
          taxes: impuestosCalculados,
          grandTotal: totalCalculado,
        },
        specialRequests: "",
      })
      
      console.log('💰 Precios recalculados en checkout con ajustes:', {
        habitacionesSeleccionadas: habitacionesSeleccionadas.map(h => h.nombre),
        nochesCalculadas,
        precioPorNocheCalculado,
        subtotalCalculado,
        impuestosCalculados,
        totalCalculado
      })
      
      console.log('🔍 Datos de reserva cargados en checkout:', {
        habitacionesSeleccionadas: habitacionesSeleccionadas.map(h => h.nombre),
        habitacionIds: habitacionIdsArray,
        serviciosAPI: serviciosQueries.data,
        serviciosLoading: serviciosQueries.isLoading,
        serviciosFinales: (() => {
          if (serviciosQueries.data && serviciosQueries.data.length > 0) {
            const todosLosServicios = serviciosQueries.data.flatMap(servicios => 
              servicios ? servicios.map((s: any) => s.servicio?.nombre || s.nombre) : []
            )
            return [...new Set(todosLosServicios)].filter(nombre => nombre && nombre.trim() !== '')
          }
          return habitacionesSeleccionadas.length > 1 
            ? [...new Set(habitacionesSeleccionadas.flatMap(hab => hab.servicios?.map((s: any) => s.nombre) || []))]
            : primeraHabitacion?.servicios?.map((s: any) => s.nombre) || []
        })(),
        huespedes: huespedesParam,
        noches: nochesCalculadas,
        precioPorNoche: precioPorNocheCalculado,
        subtotal: subtotalCalculado,
        impuestos: impuestosCalculados,
        total: totalCalculado,
        fechas: {
          fechaInicioParam,
          fechaFinParam,
          checkInDate: checkInDate.toISOString(),
          checkOutDate: checkOutDate.toISOString(),
          checkInLocal: checkInDate.toLocaleDateString('es-AR'),
          checkOutLocal: checkOutDate.toLocaleDateString('es-AR')
        }
      })
      
      setDataInitialized(true)
    }
  }, [hospedaje, habitaciones, dataInitialized, searchParams, serviciosQueries.isLoading])

  // Actualizar datos personales cuando se cargan los datos del usuario
  useEffect(() => {
    if (user && !isLoadingUser) {
      setPersonalInfo({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        dni: user.dni || "",
      })
      console.log('👤 Datos personales cargados desde usuario:', {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dni: user.dni
      })
    }
  }, [user, isLoadingUser])

  // Estado inicial para los datos de pago (memoizado para evitar recreación)
  const [initialPaymentInfo] = useState({
    method: "",
    cardType: "",
    cardNumber: "",
    cardHolder: "",
    expiryMonth: "",
    expiryYear: "",
    cvv: "",
  })

  // Estado para el paso actual
  const [currentStep, setCurrentStep] = useState(1)

  // Función para ir al siguiente paso
  const nextStep = () => {
    setCurrentStep(currentStep + 1)
  }

  // Función para ir al paso anterior
  const prevStep = () => {
    setCurrentStep(currentStep - 1)
  }

  // Mostrar error si no hay hospedajeId válido
  if (!hospedajeId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error en la reserva</h2>
          <p className="text-gray-600 mb-4">No se encontró información válida del hospedaje.</p>
          <button 
            onClick={() => router.push('/')} 
            className="bg-[#CD6C22] hover:bg-[#A83921] text-white px-6 py-2 rounded-lg"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // Mostrar loading mientras se cargan los datos
  if (isLoadingHospedaje || isLoadingHabitaciones || serviciosQueries.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando información de la reserva...</p>
        </div>
      </div>
    )
  }

  return (
    <CheckoutProvider
      initialReservation={initialReservation}
              initialPersonalInfo={personalInfo}
      initialPaymentInfo={initialPaymentInfo}
    >
      <CheckoutSteps currentStep={currentStep} onNext={nextStep} onPrev={prevStep} />
    </CheckoutProvider>
  )
}
