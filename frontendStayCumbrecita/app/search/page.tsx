"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { MapPin, Star, Grid, List, MessageSquare, Loader2 } from "lucide-react"
import Header from "@/components/shared/header"
import Footer from "@/components/shared/footer"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ChatButton from "@/components/chatbot/chat-button"
import SearchBar from "@/components/search/search-bar"
import ServiciosModal from "@/components/search/servicios-modal"
import { useHospedajes, useServicios, useTiposHospedaje, useRangosPrecio, useHospedajesConServiciosHabitacion } from "@/hooks/use-api"
import type { Hospedaje } from "@/lib/types/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getClientApiUrl } from "@/lib/utils/api-urls"

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Obtener fechas de la URL y convertirlas inmediatamente
  const fechaInicioParam = searchParams.get('fechaInicio')
  const fechaFinParam = searchParams.get('fechaFin')
  const initialCheckIn = fechaInicioParam ? new Date(fechaInicioParam + 'T12:00:00') : undefined
  const initialCheckOut = fechaFinParam ? new Date(fechaFinParam + 'T12:00:00') : undefined

  // Estado para los filtros
  const [guests, setGuests] = useState(Number(searchParams.get('huespedes')) || 2)
  const [rooms, setRooms] = useState(Number(searchParams.get('habitaciones')) || 1)
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(initialCheckIn)
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(initialCheckOut)
  const [priceRange, setPriceRange] = useState([5000, 50000])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedRoomServices, setSelectedRoomServices] = useState<string[]>([])
  const [selectedRatings, setSelectedRatings] = useState<number[]>([])
  const [selectedTiposHospedaje, setSelectedTiposHospedaje] = useState<string[]>([])
  const [sortOption, setSortOption] = useState("recommended")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  // Estado para controlar la carga inicial
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Estado removido - ahora cada botón maneja su propio estado

  // Estado para los modales de servicios
  const [isServiciosHospedajeModalOpen, setIsServiciosHospedajeModalOpen] = useState(false)
  const [isServiciosHabitacionModalOpen, setIsServiciosHabitacionModalOpen] = useState(false)

  // Hook personalizado que obtiene hospedajes + servicios
  const useHospedajesConServicios = () => {
    const { data: hospedajesData, isLoading: isLoadingHospedajes, error: errorHospedajes } = useHospedajes({
      page: 1,
      limit: 20
    })

    const [hospedajesConServicios, setHospedajesConServicios] = useState<any[]>([])
    const [isLoadingServicios, setIsLoadingServicios] = useState(false)

    useEffect(() => {
      const obtenerServicios = async () => {
        if (!hospedajesData?.data?.length) {
          setHospedajesConServicios([])
          return
        }

        setIsLoadingServicios(true)
        try {
          const hospedajesConServiciosData = await Promise.all(
            hospedajesData.data.map(async (hospedaje: any) => {
              try {
                const response = await fetch(`${getClientApiUrl()}/servicios/hospedajes/${hospedaje.id}/servicios`)
                if (response.ok) {
                  const servicios = await response.json()
                  return { ...hospedaje, servicios }
                }
                return { ...hospedaje, servicios: [] }
              } catch (error) {
                console.error(`Error obteniendo servicios para ${hospedaje.id}:`, error)
                return { ...hospedaje, servicios: [] }
              }
            })
          )
          setHospedajesConServicios(hospedajesConServiciosData)
        } catch (error) {
          console.error('Error obteniendo servicios:', error)
          setHospedajesConServicios(hospedajesData.data.map((h: any) => ({ ...h, servicios: [] })))
        } finally {
          setIsLoadingServicios(false)
        }
      }

             obtenerServicios()
     }, [hospedajesData?.data?.length, JSON.stringify(hospedajesData?.data?.map((h: any) => h.id))])

    return {
      data: hospedajesConServicios.length ? { ...hospedajesData, data: hospedajesConServicios } : null,
      isLoading: isLoadingHospedajes || isLoadingServicios,
      error: errorHospedajes
    }
  }

  // Usar el hook personalizado
  const { data: hospedajesData, isLoading: isLoadingHospedajes, error: errorHospedajes } = useHospedajesConServicios()

  const { data: servicios } = useServicios()
  const { data: tiposHospedaje } = useTiposHospedaje()
  
  // Obtener rangos de precio dinámicos
  const fechaInicio = searchParams.get('fechaInicio')
  const fechaFin = searchParams.get('fechaFin')
  const { data: rangosPrecio } = useRangosPrecio(fechaInicio || undefined, fechaFin || undefined)

  // Hook para obtener habitaciones y calcular precios mínimos
  const useHospedajesConPreciosMinimos = () => {
    const [hospedajesConPrecios, setHospedajesConPrecios] = useState<any[]>([])
    const [isLoadingPrecios, setIsLoadingPrecios] = useState(false)

    useEffect(() => {
      const calcularPreciosMinimos = async () => {
        if (!hospedajesData?.data?.length) {
          setHospedajesConPrecios([])
          return
        }

        setIsLoadingPrecios(true)
        try {
          const hospedajesConPreciosData = await Promise.all(
            hospedajesData.data.map(async (hospedaje: any) => {
              try {
                // Obtener habitaciones del hospedaje
                const response = await fetch(`${getClientApiUrl()}/hospedajes/${hospedaje.id}/habitaciones`)
                let precioMinimo = rangosPrecio?.precioMinimo || 129900 // Precio por defecto

                if (response.ok) {
                  const habitacionesData = await response.json()
                  const habitaciones = habitacionesData.data || []
                  
                  // Calcular precio mínimo de las habitaciones de este hospedaje
                  if (habitaciones.length > 0) {
                                         const precios = habitaciones.map((hab: any) => Number(hab.precioBase) || 0)
                     precioMinimo = Math.min(...precios.filter((p: number) => p > 0))
                    
                    // Si no hay precios válidos, usar el precio por defecto
                    if (!precioMinimo || precioMinimo === Infinity) {
                      precioMinimo = rangosPrecio?.precioMinimo || 129900
                    }
                  }
                }

                return {
                  id: hospedaje.id,
                  name: hospedaje.nombre,
                  image: hospedaje.imagenes?.sort((a: any, b: any) => (a.orden || 999) - (b.orden || 999))?.[0]?.url || "/mountain-cabin-retreat.png",
                  location: hospedaje.direccion || "La Cumbrecita, Córdoba",
                  description: hospedaje.descripcionCorta || hospedaje.descripcionLarga || "Sin descripción disponible",
                  price: precioMinimo,
                  rating: hospedaje.calificacionPromedio || null,
                  featured: hospedaje.featured || false,
                  services: hospedaje.servicios?.map((s: any) => s.servicio?.id) || [],
                  roomServices: [],
                  availableRooms: hospedaje.cantidadHabitaciones || 1,
                  tipoHospedajeId: hospedaje.tipoHotel?.id,
                }
              } catch (error) {
                console.error(`Error obteniendo habitaciones para ${hospedaje.id}:`, error)
                // En caso de error, usar precio por defecto
                return {
                  id: hospedaje.id,
                  name: hospedaje.nombre,
                  image: hospedaje.imagenes?.sort((a: any, b: any) => (a.orden || 999) - (b.orden || 999))?.[0]?.url || "/mountain-cabin-retreat.png",
                  location: hospedaje.direccion || "La Cumbrecita, Córdoba",
                  description: hospedaje.descripcionCorta || hospedaje.descripcionLarga || "Sin descripción disponible",
                  price: rangosPrecio?.precioMinimo || 129900,
                  rating: hospedaje.calificacionPromedio || null,
                  featured: hospedaje.featured || false,
                  services: hospedaje.servicios?.map((s: any) => s.servicio?.id) || [],
                  roomServices: [],
                  availableRooms: hospedaje.cantidadHabitaciones || 1,
                  tipoHospedajeId: hospedaje.tipoHotel?.id,
                }
              }
            })
          )
          setHospedajesConPrecios(hospedajesConPreciosData)
        } catch (error) {
          console.error('Error calculando precios mínimos:', error)
          // Fallback a mapeo básico sin precios específicos
          const basicMapping = hospedajesData.data.map((hospedaje: any) => ({
            id: hospedaje.id,
            name: hospedaje.nombre,
            image: hospedaje.imagenes?.sort((a: any, b: any) => (a.orden || 999) - (b.orden || 999))?.[0]?.url || "/mountain-cabin-retreat.png",
            location: hospedaje.direccion || "La Cumbrecita, Córdoba",
            description: hospedaje.descripcionCorta || hospedaje.descripcionLarga || "Sin descripción disponible",
            price: rangosPrecio?.precioMinimo || 129900,
            rating: hospedaje.calificacionPromedio || null,
            featured: hospedaje.destacado || false,
            services: hospedaje.servicios?.map((s: any) => s.servicio?.id) || [],
            roomServices: [],
            availableRooms: hospedaje.cantidadHabitaciones || 1,
            tipoHospedajeId: hospedaje.tipoHotel?.id,
          }))
          setHospedajesConPrecios(basicMapping)
        } finally {
          setIsLoadingPrecios(false)
        }
      }

      calcularPreciosMinimos()
    }, [hospedajesData?.data?.length, JSON.stringify(hospedajesData?.data?.map((h: any) => h.id)), rangosPrecio?.precioMinimo])

    return {
      data: hospedajesConPrecios,
      isLoading: isLoadingPrecios
    }
  }

  // Usar el hook para obtener hospedajes con precios correctos
  const { data: hospedajesConPreciosCorrectos, isLoading: isLoadingPrecios } = useHospedajesConPreciosMinimos()

  // Calcular hospedajes filtrados por otros criterios primero (sin servicios de habitación)
  const hospedajesFiltradosBasicos = useMemo(() => {
    let filtered = hospedajesConPreciosCorrectos || []

    // Aplicar filtros básicos (sin servicios de habitación)
    if (guests > 0) {
      filtered = filtered.filter((hotel: any) => hotel.availableRooms >= rooms)
    }

    filtered = filtered.filter((hotel: any) => hotel.price >= priceRange[0] && hotel.price <= priceRange[1])

    if (selectedServices.length > 0) {
      filtered = filtered.filter((hotel: any) => 
        selectedServices.every((serviceId: string) => 
          hotel.services.includes(serviceId)
        )
      )
    }

    if (selectedTiposHospedaje.length > 0) {
      filtered = filtered.filter((hotel: any) => 
        selectedTiposHospedaje.includes(hotel.tipoHospedajeId)
      )
    }

    if (selectedRatings.length > 0) {
      filtered = filtered.filter((hotel: any) => {
        if (!hotel.rating || hotel.rating <= 0) return false
        const floorRating = Math.floor(hotel.rating)
        return selectedRatings.includes(floorRating)
      })
    }

    return filtered
  }, [hospedajesData, guests, rooms, priceRange, selectedServices, selectedTiposHospedaje, selectedRatings, rangosPrecio])

  // Hook personalizado para filtrar por servicios de habitación (sin fechas ni personas)
  const useHospedajesConServiciosHabitacionSimple = (hospedajeIds: string[], serviciosRequeridos: string[]) => {
    const [hospedajesValidos, setHospedajesValidos] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

         useEffect(() => {
       const filtrarPorServiciosHabitacion = async () => {
         if (!hospedajeIds.length || !serviciosRequeridos.length) {
           setHospedajesValidos([...hospedajeIds]) // Crear copia para evitar referencia directa
           return
         }

        setIsLoading(true)

        try {
          const hospedajesQueCumplen: string[] = []

          // Procesar cada hospedaje
          for (const hospedajeId of hospedajeIds) {
            try {
              // Obtener habitaciones del hospedaje - ENDPOINT CORREGIDO
              const responseHabitaciones = await fetch(`${getClientApiUrl()}/hospedajes/${hospedajeId}/habitaciones`)
              
              if (!responseHabitaciones.ok) {
                console.warn(`⚠️ No se pudieron obtener habitaciones para ${hospedajeId}`)
                continue
              }

              const habitacionesData = await responseHabitaciones.json()
              const habitaciones = habitacionesData.data || []

              // Verificar si alguna habitación tiene TODOS los servicios requeridos
              let hospedajeCumple = false

              for (const habitacion of habitaciones) {
                // Obtener servicios de la habitación
                const responseServicios = await fetch(`${getClientApiUrl()}/servicios/habitaciones/${habitacion.id}/servicios`)
                
                if (responseServicios.ok) {
                  const serviciosHabitacion = await responseServicios.json()
                  // MAPEO CORREGIDO - usar servicio.id, no s.id
                  const idsServiciosHabitacion = serviciosHabitacion.map((s: any) => s.servicio.id)

                  // Verificar si esta habitación tiene TODOS los servicios requeridos (AND)
                  const tieneServicios = serviciosRequeridos.every(servicioRequerido => 
                    idsServiciosHabitacion.includes(servicioRequerido)
                  )

                  if (tieneServicios) {
                    hospedajeCumple = true
                    break // Ya encontramos una habitación que cumple (OR entre habitaciones)
                  }
                }
              }

              if (hospedajeCumple) {
                hospedajesQueCumplen.push(hospedajeId)
              }

            } catch (error) {
              console.error(`❌ Error procesando hospedaje ${hospedajeId}:`, error)
            }
          }

          setHospedajesValidos(hospedajesQueCumplen)

        } catch (error) {
          console.error('❌ Error en filtro de servicios de habitación:', error)
          setHospedajesValidos(hospedajeIds) // En caso de error, mantener todos
        } finally {
          setIsLoading(false)
        }
      }

             filtrarPorServiciosHabitacion()
     }, [JSON.stringify(hospedajeIds), JSON.stringify(serviciosRequeridos)])

    return { data: hospedajesValidos, isLoading }
  }

  // Memoizar los IDs para evitar recreación en cada render
  const hospedajeIds = useMemo(() => 
    hospedajesFiltradosBasicos.map((h: any) => h.id), 
    [hospedajesFiltradosBasicos]
  )

  // Hook para filtrar por servicios de habitación
  const { data: hospedajesConServiciosHabitacion, isLoading: isLoadingHabitaciones } = useHospedajesConServiciosHabitacionSimple(
    hospedajeIds,
    selectedRoomServices
  )

  // Hook para filtrar por capacidad de huéspedes
  const useHospedajesPorCapacidad = (hospedajeIds: string[], huespedesRequeridos: number) => {
    const [hospedajesValidos, setHospedajesValidos] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
      const filtrarPorCapacidad = async () => {
        if (!hospedajeIds.length || huespedesRequeridos <= 0) {
          setHospedajesValidos([...hospedajeIds])
          return
        }

        setIsLoading(true)

        try {
          const hospedajesQueCumplen: string[] = []

          // Procesar cada hospedaje
          for (const hospedajeId of hospedajeIds) {
            try {
              // Obtener habitaciones del hospedaje
              const responseHabitaciones = await fetch(`${getClientApiUrl()}/hospedajes/${hospedajeId}/habitaciones`)
              
              if (!responseHabitaciones.ok) {
                console.warn(`⚠️ No se pudieron obtener habitaciones para ${hospedajeId}`)
                continue
              }

              const habitacionesData = await responseHabitaciones.json()
              const habitaciones = habitacionesData.data || []

              // Verificar si alguna habitación individual puede alojar a todos los huéspedes
              let hospedajeCumple = false

              for (const habitacion of habitaciones) {
                if (habitacion.capacidad >= huespedesRequeridos) {
                  hospedajeCumple = true
                  break // Ya encontramos una habitación que cumple
                }
              }

              if (hospedajeCumple) {
                hospedajesQueCumplen.push(hospedajeId)
              }

            } catch (error) {
              console.error(`❌ Error procesando hospedaje ${hospedajeId}:`, error)
            }
          }

          setHospedajesValidos(hospedajesQueCumplen)

        } catch (error) {
          console.error('❌ Error en filtro de capacidad:', error)
          setHospedajesValidos(hospedajeIds) // En caso de error, mantener todos
        } finally {
          setIsLoading(false)
        }
      }

      filtrarPorCapacidad()
    }, [JSON.stringify(hospedajeIds), huespedesRequeridos])

    return { data: hospedajesValidos, isLoading }
  }

  // Usar el hook de capacidad
  const { data: hospedajesPorCapacidad, isLoading: isLoadingCapacidad } = useHospedajesPorCapacidad(
    hospedajeIds,
    guests
  )

  // Hook para filtrar por disponibilidad de fechas y obtener precios calculados
  const useHospedajesPorDisponibilidad = (fechaInicio: Date | undefined, fechaFin: Date | undefined, guests: number) => {
    const [hospedajesDisponibles, setHospedajesDisponibles] = useState<string[]>([])
    const [preciosCalculadosPorHospedaje, setPreciosCalculadosPorHospedaje] = useState<{[key: string]: number}>({})
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
      const filtrarPorDisponibilidad = async () => {
        // Si no hay fechas, permitir todos los hospedajes
        if (!fechaInicio || !fechaFin) {
          setHospedajesDisponibles([...(hospedajeIds as string[])])
          setPreciosCalculadosPorHospedaje({})
          return
        }

        setIsLoading(true)

        try {
          // Usar el endpoint de disponibilidad global con nueva lógica
          const params = new URLSearchParams({
            fechaInicio: fechaInicio.toISOString().split('T')[0],
            fechaFin: fechaFin.toISOString().split('T')[0],
            personas: guests.toString(),
            limit: '1000' // Obtener todas las habitaciones disponibles
          })

          const response = await fetch(`${getClientApiUrl()}/habitaciones/disponibilidad?${params}`)
          
          if (!response.ok) {
            setHospedajesDisponibles(hospedajeIds as string[]) // En caso de error, mostrar todos
            setPreciosCalculadosPorHospedaje({})
            return
          }

          const habitacionesDisponibles = await response.json()

          // Extraer IDs únicos de hospedajes que tienen habitaciones disponibles
          const allIds = (habitacionesDisponibles.data || [])
            .map((habitacion: any) => habitacion.hospedaje?.id)
            .filter((id: any): id is string => typeof id === 'string')
          const hospedajeIdsConHabitaciones = [...new Set(allIds)] as string[]

          // Calcular precio mínimo por hospedaje usando precios calculados
          const preciosPorHospedaje: {[key: string]: number} = {}
          
          hospedajeIdsConHabitaciones.forEach((hospedajeId: string) => {
            // Obtener habitaciones de este hospedaje
            const habitacionesDelHospedaje = (habitacionesDisponibles.data || []).filter(
              (habitacion: any) => habitacion.hospedaje?.id === hospedajeId
            )
            
            // Obtener precios (usar precioCalculado si existe, sino precioBase)
            const precios = habitacionesDelHospedaje.map((habitacion: any) => {
              const precio = habitacion.precioCalculado || Number(habitacion.precioBase) || 0
              console.log(`💰 Habitación ${habitacion.nombre}: precioBase=${habitacion.precioBase}, precioCalculado=${habitacion.precioCalculado}, usando=${precio}`)
              return precio
            }).filter((precio: number) => precio > 0)
            
            // Guardar precio mínimo del hospedaje
            if (precios.length > 0) {
              preciosPorHospedaje[hospedajeId] = Math.min(...precios)
            }
          })

          console.log('🏨 Precios calculados por hospedaje:', preciosPorHospedaje)

          setHospedajesDisponibles(hospedajeIdsConHabitaciones)
          setPreciosCalculadosPorHospedaje(preciosPorHospedaje)

        } catch (error) {
          console.error('❌ Error en filtro de disponibilidad:', error)
          setHospedajesDisponibles(hospedajeIds as string[]) // En caso de error, mostener todos
          setPreciosCalculadosPorHospedaje({})
        } finally {
          setIsLoading(false)
        }
      }

      filtrarPorDisponibilidad()
    }, [JSON.stringify(hospedajeIds), fechaInicio?.toISOString(), fechaFin?.toISOString(), guests])

    return { data: hospedajesDisponibles, preciosCalculados: preciosCalculadosPorHospedaje, isLoading }
  }

  // Usar el hook de disponibilidad
  const { data: hospedajesPorDisponibilidad, preciosCalculados: preciosCalculadosPorHospedaje, isLoading: isLoadingDisponibilidad } = useHospedajesPorDisponibilidad(
    checkInDate,
    checkOutDate,
    guests
  )

  // Calcular hoteles filtrados finales
  const filteredHotels = useMemo(() => {
    let filtered = hospedajesFiltradosBasicos

    // Aplicar filtro de disponibilidad de fechas (siempre activo si hay fechas)
    if (checkInDate && checkOutDate) {
      // Solo mantener hospedajes que pasaron el filtro de disponibilidad
      filtered = filtered.filter((hotel: any) => 
        hospedajesPorDisponibilidad.includes(hotel.id)
      )
    }

    // Aplicar filtro de capacidad de huéspedes (siempre activo si guests > 2)
    if (guests > 2) {
      // Solo mantener hospedajes que pasaron el filtro de capacidad
      filtered = filtered.filter((hotel: any) => 
        hospedajesPorCapacidad.includes(hotel.id)
      )
    }

    // Aplicar filtro de servicios de habitación si es necesario
    if (selectedRoomServices.length > 0) {
      // Solo mantener hospedajes que pasaron el filtro de servicios de habitación
      filtered = filtered.filter((hotel: any) => 
        hospedajesConServiciosHabitacion.includes(hotel.id)
      )
    }

    // Actualizar precios con precios calculados si hay fechas
    if (checkInDate && checkOutDate && Object.keys(preciosCalculadosPorHospedaje).length > 0) {
      filtered = filtered.map((hotel: any) => {
        const precioCalculado = preciosCalculadosPorHospedaje[hotel.id]
        if (precioCalculado && precioCalculado > 0) {
          console.log(`🏨 Hospedaje ${hotel.name}: precio original=${hotel.price}, precio calculado=${precioCalculado}`)
          return {
            ...hotel,
            price: precioCalculado
          }
        }
        return hotel
      })
    }

    // Ordenar resultados
    switch (sortOption) {
      case "price-low":
        filtered.sort((a: any, b: any) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a: any, b: any) => b.price - a.price)
        break
      case "rating":
        filtered.sort((a: any, b: any) => {
          // Hoteles sin calificación van al final
          if (!a.rating && !b.rating) return 0
          if (!a.rating) return 1
          if (!b.rating) return -1
          return b.rating - a.rating
        })
        break
      default: // recommended - featured first, then by rating
        filtered.sort((a: any, b: any) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          // Hoteles sin calificación van al final
          if (!a.rating && !b.rating) return 0
          if (!a.rating) return 1
          if (!b.rating) return -1
          return b.rating - a.rating
        })
    }

    return filtered
  }, [hospedajesFiltradosBasicos, checkInDate, checkOutDate, hospedajesPorDisponibilidad, guests, hospedajesPorCapacidad, selectedRoomServices, hospedajesConServiciosHabitacion, sortOption, preciosCalculadosPorHospedaje])

  // Efecto para sincronizar estados cuando cambien los searchParams
  useEffect(() => {
    const fechaInicioParam = searchParams.get('fechaInicio')
    const fechaFinParam = searchParams.get('fechaFin')
    const huespedesParam = Number(searchParams.get('huespedes')) || 2
    const habitacionesParam = Number(searchParams.get('habitaciones')) || 1

    if (fechaInicioParam) {
      setCheckInDate(new Date(fechaInicioParam + 'T12:00:00'))
    } else {
      setCheckInDate(undefined)
    }

    if (fechaFinParam) {
      setCheckOutDate(new Date(fechaFinParam + 'T12:00:00'))
    } else {
      setCheckOutDate(undefined)
    }

    setGuests(huespedesParam)
    setRooms(habitacionesParam)
  }, [searchParams])

  // Efecto para manejar la carga inicial
  useEffect(() => {
    if (hospedajesFiltradosBasicos.length > 0 && isInitialLoad) {
      setIsInitialLoad(false)
    }
  }, [hospedajesFiltradosBasicos, isInitialLoad])

  // Efecto para actualizar el rango de precios cuando se obtienen los datos dinámicos
  useEffect(() => {
    if (rangosPrecio && rangosPrecio.precioMinimo && rangosPrecio.precioMaximo) {
      setPriceRange([rangosPrecio.precioMinimo, rangosPrecio.precioMaximo])
    }
  }, [rangosPrecio])

  const handleServiceChange = (service: string) => {
    const newSelection = selectedServices.includes(service) 
      ? selectedServices.filter(s => s !== service)
      : [...selectedServices, service]
    
    console.log('🔍 Debug - Selección de servicio:', {
      servicioSeleccionado: service,
      nuevaSeleccion: newSelection,
      serviciosCatalogo: serviciosHospedaje.find(s => s.id === service)
    })
    
    setSelectedServices(newSelection)
  }

  const handleRoomServiceChange = (service: string) => {
    setSelectedRoomServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    )
  }

  const handleRatingChange = (rating: number) => {
    setSelectedRatings(prev => 
      prev.includes(rating) 
        ? prev.filter(r => r !== rating)
        : [...prev, rating]
    )
  }

  const handleTipoHospedajeChange = (tipoId: string) => {
    setSelectedTiposHospedaje(prev => 
      prev.includes(tipoId) 
        ? prev.filter(t => t !== tipoId)
        : [...prev, tipoId]
    )
  }

  // Función removida - ahora cada ChatButton maneja su propio estado

  // Función para manejar la búsqueda desde el SearchBar
  const handleSearch = (filters: {
    checkInDate?: Date
    checkOutDate?: Date
    guests: number
    rooms: number
  }) => {
    setCheckInDate(filters.checkInDate)
    setCheckOutDate(filters.checkOutDate)
    setGuests(filters.guests)
    setRooms(filters.rooms)
    
    // Actualizar URL con los nuevos parámetros
    const params = new URLSearchParams()
    if (filters.checkInDate) {
      params.set('fechaInicio', filters.checkInDate.toISOString().split('T')[0])
    }
    if (filters.checkOutDate) {
      params.set('fechaFin', filters.checkOutDate.toISOString().split('T')[0])
    }
    params.set('huespedes', filters.guests.toString())
    params.set('habitaciones', filters.rooms.toString())
    
    // Actualizar URL sin recargar la página
    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  // Función para obtener servicios aleatorios priorizando los seleccionados
  const getServiciosParaFiltro = (tipoServicios: any[], seleccionados: string[], limite: number = 6) => {
    if (!tipoServicios.length) return []
    
    // Servicios seleccionados que existen en la lista
    const serviciosSeleccionados = tipoServicios.filter(s => seleccionados.includes(s.id))
    
    // Servicios no seleccionados
    const serviciosNoSeleccionados = tipoServicios.filter(s => !seleccionados.includes(s.id))
    
    // Mezclar servicios no seleccionados aleatoriamente
    const serviciosAleatorios = serviciosNoSeleccionados
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.max(0, limite - serviciosSeleccionados.length))
    
    // Combinar: primero seleccionados, luego aleatorios
    return [...serviciosSeleccionados, ...serviciosAleatorios]
  }

  // Servicios para filtros - 6 aleatorios de cada tipo, priorizando seleccionados
  // Usar useMemo para regenerar solo cuando cambien los datos o selecciones
  const serviciosHospedaje = useMemo(() => 
    getServiciosParaFiltro(
      servicios?.filter(s => s.tipo === 'HOSPEDAJE') || [], 
      selectedServices, 
      6
    ), [servicios, selectedServices]
  )
  
  const serviciosHabitacion = useMemo(() => 
    getServiciosParaFiltro(
      servicios?.filter(s => s.tipo === 'HABITACION') || [], 
      selectedRoomServices, 
      6
    ), [servicios, selectedRoomServices]
  )

  if ((isLoadingHospedajes || isLoadingPrecios) && isInitialLoad) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>{isLoadingPrecios ? "Calculando precios..." : "Buscando hospedajes..."}</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      {/* Search Section - Todo en gris */}
      <div className="bg-gray-100 border-b">
        {/* Search Bar */}
        <div className="container mx-auto px-4 py-6">
          <SearchBar 
            onSearch={handleSearch}
            initialGuests={guests}
            initialRooms={rooms}
            initialCheckIn={initialCheckIn}
            initialCheckOut={initialCheckOut}
          />
        </div>

        {/* Active Filters Indicator */}
        {(checkInDate || checkOutDate || guests !== 2 || rooms !== 1) && (
          <div className="px-4 pb-4">
            <div className="container mx-auto">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">Filtros activos:</span>
                {checkInDate && (
                  <span className="bg-white px-2 py-1 rounded mr-2">
                    Desde: {format(checkInDate, "dd MMM, yyyy", { locale: es })}
                  </span>
                )}
                {checkOutDate && (
                  <span className="bg-white px-2 py-1 rounded mr-2">
                    Hasta: {format(checkOutDate, "dd MMM, yyyy", { locale: es })}
                  </span>
                )}
                {guests !== 2 && (
                  <span className="bg-white px-2 py-1 rounded mr-2">
                    {guests} {guests === 1 ? 'huésped' : 'huéspedes'}
                  </span>
                )}
                {rooms !== 1 && (
                  <span className="bg-white px-2 py-1 rounded mr-2">
                    {rooms} {rooms === 1 ? 'habitación' : 'habitaciones'}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1">
        {/* Sidebar Filters */}
        <div className="w-80 bg-white border-r p-6 h-screen overflow-y-auto sticky top-0">
          <h3 className="text-lg font-semibold mb-4">Filtros</h3>
          
          {/* Price Range */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Rango de Precio</h4>
            <Slider
              value={priceRange}
              onValueChange={setPriceRange}
              max={rangosPrecio?.precioMaximo || 50000}
              min={rangosPrecio?.precioMinimo || 5000}
              step={1000}
              className="mb-2"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>${priceRange[0].toLocaleString()}</span>
              <span>${priceRange[1].toLocaleString()}</span>
            </div>
          </div>

          {/* Tipo de Hospedaje */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Tipo de Hospedaje</h4>
            <div className="space-y-2">
              {tiposHospedaje?.map((tipo: any) => (
                <div key={tipo.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={tipo.id}
                    checked={selectedTiposHospedaje.includes(tipo.id)}
                    onCheckedChange={() => handleTipoHospedajeChange(tipo.id)}
                  />
                  <label htmlFor={tipo.id} className="text-sm">
                    {tipo.nombre}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Hotel Services */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Servicios del Hospedaje</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsServiciosHospedajeModalOpen(true)}
                className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                Ver más
              </Button>
            </div>
            <div className="space-y-2">
              {serviciosHospedaje.map((service: any) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={service.id}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => handleServiceChange(service.id)}
                  />
                  <label htmlFor={service.id} className="text-sm">
                    {service.nombre}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Room Services */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">Servicios de Habitación</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsServiciosHabitacionModalOpen(true)}
                className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                Ver más
              </Button>
            </div>
            <div className="space-y-2">
              {serviciosHabitacion.map((service: any) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`room-${service.id}`}
                    checked={selectedRoomServices.includes(service.id)}
                    onCheckedChange={() => handleRoomServiceChange(service.id)}
                  />
                  <label htmlFor={`room-${service.id}`} className="text-sm">
                    {service.nombre}
                  </label>
                </div>
              ))}
            </div>
            {selectedRoomServices.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {isLoadingHabitaciones 
                  ? "* Buscando habitaciones con servicios seleccionados..."
                  : `* Filtrando por habitaciones con servicios seleccionados`
                }
              </p>
            )}
          </div>

          {/* Rating Filter */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Calificación</h4>
            <div className="space-y-2">
              {[5, 4, 3, 2].map((rating) => (
                <div key={rating} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rating-${rating}`}
                    checked={selectedRatings.includes(rating)}
                    onCheckedChange={() => handleRatingChange(rating)}
                  />
                  <label htmlFor={`rating-${rating}`} className="text-sm flex items-center">
                    {rating}+ <Star className="h-4 w-4 ml-1 text-yellow-400 fill-current" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Header with results and sorting */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                {isLoadingHospedajes ? 'Buscando...' : `${filteredHotels.length} hospedajes encontrados`}
              </h2>
              <p className="text-gray-600">La Cumbrecita, Córdoba</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex border border-orange-200 rounded-lg overflow-hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-none ${
                    viewMode === "grid" 
                      ? "bg-orange-600 text-white hover:bg-orange-700" 
                      : "text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className={`rounded-none ${
                    viewMode === "list" 
                      ? "bg-orange-600 text-white hover:bg-orange-700" 
                      : "text-orange-600 hover:bg-orange-50"
                  }`}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>

              {/* Sort Options */}
              <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommended">Recomendados</SelectItem>
                  <SelectItem value="price-low">Precio: menor a mayor</SelectItem>
                  <SelectItem value="price-high">Precio: mayor a menor</SelectItem>
                  <SelectItem value="rating">Mejor calificados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {(isLoadingHospedajes && !isInitialLoad) || 
           isLoadingPrecios ||
           (isLoadingDisponibilidad && checkInDate && checkOutDate) ||
           (isLoadingHabitaciones && selectedRoomServices.length > 0) ||
           (isLoadingCapacidad && guests > 2) ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>
                {isLoadingPrecios
                  ? "Calculando precios de habitaciones..."
                  : isLoadingDisponibilidad && checkInDate && checkOutDate
                    ? "Verificando disponibilidad para las fechas seleccionadas..."
                    : isLoadingCapacidad && guests > 2 
                      ? `Buscando habitaciones para ${guests} huéspedes...`
                      : isLoadingHabitaciones && selectedRoomServices.length > 0 
                        ? "Analizando habitaciones con servicios seleccionados..."
                        : "Actualizando resultados..."
                }
              </p>
            </div>
          ) : null}

          {/* Error State */}
          {errorHospedajes && (
            <div className="text-center py-8">
              <p className="text-red-600">Error al cargar hospedajes. Inténtalo de nuevo.</p>
            </div>
          )}

          {/* Hotels Grid/List */}
          {!isLoadingHospedajes && filteredHotels.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium mb-2">No se encontraron hospedajes</h3>
              <div className="text-gray-600 mb-4">
                {checkInDate && checkOutDate && (
                  <p className="mb-2">
                    • No hay habitaciones disponibles para las fechas seleccionadas
                  </p>
                )}
                {guests > 2 && (
                  <p className="mb-2">
                    • No hay habitaciones disponibles para {guests} huéspedes
                  </p>
                )}
                {selectedRoomServices.length > 0 && (
                  <p className="mb-2">
                    • No hay habitaciones con los servicios seleccionados
                  </p>
                )}
                {selectedServices.length > 0 && (
                  <p className="mb-2">
                    • No hay hospedajes con los servicios seleccionados
                  </p>
                )}
                {selectedTiposHospedaje.length > 0 && (
                  <p className="mb-2">
                    • No hay hospedajes del tipo seleccionado
                  </p>
                )}
                <p className="mt-3">Intenta ajustar tus filtros para ver más resultados</p>
              </div>
              <Button onClick={() => {
                setPriceRange([
                  rangosPrecio?.precioMinimo || 5000, 
                  rangosPrecio?.precioMaximo || 50000
                ])
                setSelectedServices([])
                setSelectedRoomServices([])
                setSelectedRatings([])
                setSelectedTiposHospedaje([])
              }}>
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
              {filteredHotels.map((hotel: any) => (
                <div
                  key={hotel.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                  onClick={() => {
                    // Construir URL con parámetros de búsqueda
                    const params = new URLSearchParams()
                    if (checkInDate) {
                      params.set('fechaInicio', checkInDate.toISOString().split('T')[0])
                    }
                    if (checkOutDate) {
                      params.set('fechaFin', checkOutDate.toISOString().split('T')[0])
                    }
                    params.set('huespedes', guests.toString())
                    params.set('habitaciones', rooms.toString())
                    
                    const queryString = params.toString()
                    router.push(`/hospedaje/${hotel.id}${queryString ? `?${queryString}` : ''}`)
                  }}
                >
                  <div className={`relative ${viewMode === "list" ? "w-48 h-32" : "w-full h-48"}`}>
                    <Image
                      src={hotel.image}
                      alt={hotel.name}
                      fill
                      className="object-cover"
                    />
                    {hotel.featured && (
                      <div className="absolute top-2 left-2 bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Destacado
                      </div>
                    )}
                  </div>
                  
                  <div className={`p-4 ${viewMode === "list" ? "flex-1" : ""}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg line-clamp-1">{hotel.name}</h3>
                      {hotel.rating && hotel.rating > 0 && (
                        <div className="flex items-center ml-2">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium ml-1">{hotel.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center text-gray-600 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="line-clamp-1">{hotel.location}</span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{hotel.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-2xl font-bold text-orange-600">
                          ${new Intl.NumberFormat('es-AR', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          }).format(hotel.price)}
                        </span>
                        <span className="text-gray-600 text-sm"> / noche</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <ChatButton
                          hospedajeId={hotel.id}
                          hospedajeName={hotel.name}
                          variant="icon"
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chatbot Modal removido - ahora cada ChatButton maneja su propio modal */}

      {/* Modales de servicios */}
      <ServiciosModal
        isOpen={isServiciosHospedajeModalOpen}
        onClose={() => setIsServiciosHospedajeModalOpen(false)}
        title="Servicios de Hospedaje"
        servicios={(servicios?.filter(s => s.tipo === 'HOSPEDAJE') || []).map(s => ({ id: s.id, nombre: s.nombre, descripcion: s.descripcion }))}
        selectedServicios={selectedServices}
        onServiciosChange={setSelectedServices}
      />

      <ServiciosModal
        isOpen={isServiciosHabitacionModalOpen}
        onClose={() => setIsServiciosHabitacionModalOpen(false)}
        title="Servicios de Habitación"
        servicios={(servicios?.filter(s => s.tipo === 'HABITACION') || []).map(s => ({ id: s.id, nombre: s.nombre, descripcion: s.descripcion }))}
        selectedServicios={selectedRoomServices}
        onServiciosChange={setSelectedRoomServices}
      />

      <Footer />
    </div>
  )
}
