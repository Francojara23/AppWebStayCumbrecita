import { useState, useEffect, useMemo } from 'react'
import { useMisHospedajes } from '@/hooks/use-api'
import { getApiUrl } from "@/lib/utils/api-urls"

// Mapeo de estados frontend -> backend
const ESTADOS_MAPPING = {
  'todos': undefined,
  'activo': 'ACTIVO',
  'inactivo': 'INACTIVO',
  'pendiente': 'PENDIENTE'
}

// Mapeo de estados backend -> frontend (para mostrar)
const ESTADOS_DISPLAY = {
  'ACTIVO': 'Activo',
  'INACTIVO': 'Inactivo', 
  'PENDIENTE': 'Pendiente'
}

interface FiltrosHospedajes {
  searchTerm: string
  statusFilter: string
  typeFilter: string
  page: number
  limit: number
}

interface HospedajeProcesado {
  id: string
  name: string
  type: string
  status: string
  rooms: number
  shortDescription: string
  longDescription: string
  owner: string
  registrationCert: string
  taxId: string
  contactPerson: string
  phone: string
  email: string
  services: string[]
  images: string[]
  raw: any // Datos originales del backend
}

export function useHospedajesFiltros(filtros: FiltrosHospedajes) {
  const { searchTerm, statusFilter, typeFilter, page, limit } = filtros
  
  // Convertir filtros frontend a backend
  const estadoBackend = ESTADOS_MAPPING[statusFilter as keyof typeof ESTADOS_MAPPING]
  
  // Hook principal para obtener datos (sin filtro de estado - se filtra en frontend)
  const { data: hospedajesData, isLoading, error } = useMisHospedajes({
    search: searchTerm || undefined,
    estado: undefined, // No filtrar por estado en backend
    tipo: typeFilter === 'todos' ? undefined : typeFilter,
    page: 1, // Traer desde página 1
    limit: 100 // Traer más para hacer filtrado en frontend
  })

  // Debug: Log de filtros aplicados
  useEffect(() => {
    console.log('🔍 Filtros aplicados:', {
      statusFilter,
      estadoBackend,
      typeFilter,
      searchTerm
    })
  }, [statusFilter, estadoBackend, typeFilter, searchTerm])

  // Debug: Log de respuesta del backend
  useEffect(() => {
    if (hospedajesData) {
      console.log('🏨 Respuesta completa del backend:', {
        totalRecibidos: hospedajesData.data?.length || 0,
        filtroEnviado: {
          estado: estadoBackend,
          search: searchTerm || undefined,
          tipo: typeFilter === 'todos' ? undefined : typeFilter
        },
        hospedajes: hospedajesData.data?.map((h: any) => ({
          nombre: h.nombre,
          estado: h.estado
        })) || []
      })
    }
  }, [hospedajesData, estadoBackend, searchTerm, typeFilter])

  // Estado para habitaciones de cada hospedaje
  const [habitacionesMap, setHabitacionesMap] = useState<Record<string, number>>({})
  const [loadingHabitaciones, setLoadingHabitaciones] = useState(false)

  // Función para obtener habitaciones de cada hospedaje
  const loadHabitaciones = async (hospedajes: any[]) => {
    if (!hospedajes?.length) return

    setLoadingHabitaciones(true)
    const habitacionesPromises = hospedajes.map(async (hospedaje) => {
      try {
        const response = await fetch(`${getApiUrl()}/hospedajes/${hospedaje.id}/habitaciones`)
        if (response.ok) {
          const data = await response.json()
          return { id: hospedaje.id, count: data.data?.length || 0 }
        }
        return { id: hospedaje.id, count: 0 }
      } catch (error) {
        console.error(`Error obteniendo habitaciones para ${hospedaje.id}:`, error)
        return { id: hospedaje.id, count: 0 }
      }
    })

    try {
      const resultados = await Promise.all(habitacionesPromises)
      const newHabitacionesMap: Record<string, number> = {}
      
      resultados.forEach(({ id, count }) => {
        newHabitacionesMap[id] = count
      })
      
      setHabitacionesMap(newHabitacionesMap)
      console.log('🏨 Habitaciones cargadas:', newHabitacionesMap)
    } catch (error) {
      console.error('Error cargando habitaciones:', error)
    } finally {
      setLoadingHabitaciones(false)
    }
  }

  // Cargar habitaciones cuando cambien los hospedajes
  useEffect(() => {
    if (hospedajesData?.data?.length) {
      loadHabitaciones(hospedajesData.data)
    }
  }, [hospedajesData?.data?.length])

  // Procesar hospedajes con datos correctos
  const hospedajesProcesados: HospedajeProcesado[] = useMemo(() => {
    if (!hospedajesData?.data) return []

    console.log('📊 Datos crudos del backend:', hospedajesData.data.map((h: any) => ({
      nombre: h.nombre,
      estadoOriginal: h.estado,
      estadoMapeado: ESTADOS_DISPLAY[h.estado as keyof typeof ESTADOS_DISPLAY] || h.estado
    })))

    return hospedajesData.data.map((hospedaje: any) => {
      const processed = {
        id: hospedaje.id,
        name: hospedaje.nombre,
        type: hospedaje.tipoHotel?.nombre || "Hotel",
        status: ESTADOS_DISPLAY[hospedaje.estado as keyof typeof ESTADOS_DISPLAY] || hospedaje.estado,
        rooms: habitacionesMap[hospedaje.id] || 0,
        shortDescription: hospedaje.descripcionCorta?.substring(0, 100) + "..." || "",
        longDescription: hospedaje.descripcionLarga || hospedaje.descripcionCorta || "",
        owner: hospedaje.propietario?.name || "Sin propietario",
        registrationCert: "inscripcion/documento.pdf",
        taxId: hospedaje.propietario?.taxId || "00-00000000-0",
        contactPerson: hospedaje.responsable || "Sin contacto",
        phone: hospedaje.telefonoContacto || "Sin teléfono",
        email: hospedaje.mailContacto || "Sin email",
        services: hospedaje.servicios?.map((s: any) => s.nombre) || [],
        images: hospedaje.imagenes?.map((img: any) => img.url) || [],
        raw: hospedaje
      }

      // Debug específico para La Roc-K Suites
      if (hospedaje.nombre?.toLowerCase().includes('rock') || hospedaje.nombre?.toLowerCase().includes('suites')) {
        console.log('🏨 DEBUG La Roc-K Suites:', {
          nombre: hospedaje.nombre,
          estadoOriginalBackend: hospedaje.estado,
          estadoMapeadoFrontend: processed.status,
          filtroActualStatus: statusFilter,
          filtroBackend: estadoBackend
        })
      }

      return processed
    })
  }, [hospedajesData?.data, habitacionesMap, statusFilter, estadoBackend])

  // Filtrar por estado y tipo en frontend
  const hospedajesFiltrados = useMemo(() => {
    let filtered = hospedajesProcesados

    // Filtrar por estado en frontend
    if (statusFilter !== "todos") {
      const estadoAFiltrar = ESTADOS_DISPLAY[estadoBackend as keyof typeof ESTADOS_DISPLAY]
      filtered = filtered.filter((hotel) => hotel.status === estadoAFiltrar)
      
      // Debug: Log de filtrado de estados
      console.log(`🔍 Filtro estado: "${statusFilter}" → "${estadoAFiltrar}" | Resultados: ${filtered.length}`)
    }

    // Filtrar por tipo si no es "todos"
    if (typeFilter !== "todos") {
      filtered = filtered.filter((hotel) => 
        hotel.type?.toLowerCase() === typeFilter.toLowerCase()
      )
      
      // Debug: Log de filtrado de tipos
      console.log(`🔍 Filtro tipo: "${typeFilter}" | Resultados: ${filtered.length}`)
    }

    return filtered
  }, [hospedajesProcesados, statusFilter, estadoBackend, typeFilter])

  // Aplicar paginación local
  const { hospedajesPaginados, totalPages, totalItems } = useMemo(() => {
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginados = hospedajesFiltrados.slice(startIndex, endIndex)
    
    return {
      hospedajesPaginados: paginados,
      totalPages: Math.ceil(hospedajesFiltrados.length / limit),
      totalItems: hospedajesFiltrados.length
    }
  }, [hospedajesFiltrados, page, limit])

  return {
    hospedajes: hospedajesPaginados,
    totalItems,
    totalPages,
    isLoading: isLoading || loadingHabitaciones,
    error,
    // Para debug
    stats: {
      totalBackend: hospedajesData?.data?.length || 0,
      totalProcesados: hospedajesProcesados.length,
      totalFiltrados: hospedajesFiltrados.length,
      habitacionesCargadas: Object.keys(habitacionesMap).length
    }
  }
}

// Estados disponibles para el select
export const ESTADOS_OPCIONES = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'pendiente', label: 'Pendiente' }
] 