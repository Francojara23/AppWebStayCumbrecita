import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toast } from '@/hooks/use-toast'
import type { 
  Hospedaje, 
  Habitacion, 
  Opinion, 
  Servicio, 
  HospedajeServicio,
  Reserva, 
  TipoHospedaje,
  Publicidad 
} from '@/lib/types/api'
import { useState, useEffect } from 'react'

// ========================
// HOOKS PARA HOSPEDAJES
// ========================

export function useHospedaje(id: string) {
  return useQuery({
    queryKey: ['hospedaje', id],
    queryFn: async () => {
      const response = await api.get<Hospedaje>(`/hospedajes/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useHospedajes(filters?: {
  page?: number
  limit?: number
  tipoHotelId?: number
  estado?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['hospedajes', filters],
    queryFn: async () => {
      const response = await api.get('/hospedajes', filters)
      return response.data
    },
  })
}

export function useHospedajesDestacados() {
  return useQuery({
    queryKey: ['hospedajes', 'destacados'],
    queryFn: async () => {
      const response = await api.get('/hospedajes/destacados')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// ========================
// HOOKS PARA HABITACIONES
// ========================

export function useHabitacionesHospedaje(hospedajeId: string, fechaInicio?: string, fechaFin?: string) {
  return useQuery({
    queryKey: ['habitaciones', 'hospedaje', hospedajeId, fechaInicio, fechaFin],
    queryFn: async () => {
      const params = fechaInicio && fechaFin ? { fechaInicio, fechaFin } : {}
      const response = await api.get<{ data: Habitacion[], meta: { total: number, page: number, limit: number, totalPages: number } }>(`/hospedajes/${hospedajeId}/habitaciones`, params)
      return response.data
    },
    enabled: !!hospedajeId,
  })
}

export function useHabitacionesDisponibles(params: {
  fechaInicio: string
  fechaFin: string
  personas: number
  hospedajeIds?: string[]
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['habitaciones', 'disponibles', params],
    queryFn: async () => {
      // Si se especifican hospedajes específicos, hacer múltiples consultas
      if (params.hospedajeIds && params.hospedajeIds.length > 0) {
        const promises = params.hospedajeIds.map(async (hospedajeId) => {
          const response = await api.get(`/habitaciones/hospedajes/${hospedajeId}/disponibilidad`, {
            fechaInicio: params.fechaInicio,
            fechaFin: params.fechaFin,
            personas: params.personas,
            limit: 100 // Obtener todas las habitaciones del hospedaje
          })
          return response.data
        })
        
        const results = await Promise.all(promises)
        // Combinar todos los resultados
        const allHabitaciones = results.flatMap(result => result.data || [])
        return { data: allHabitaciones, meta: { total: allHabitaciones.length } }
      } else {
        // Buscar en todos los hospedajes
        const response = await api.get('/habitaciones/disponibilidad', {
          fechaInicio: params.fechaInicio,
          fechaFin: params.fechaFin,
          personas: params.personas,
          limit: 1000 // Obtener muchas habitaciones para el filtrado
        })
        return response.data
      }
    },
    enabled: params.enabled !== false && !!params.fechaInicio && !!params.fechaFin && !!params.personas,
    staleTime: 2 * 60 * 1000, // 2 minutos - datos de disponibilidad cambian frecuentemente
  })
}

// Hook específico para filtrar hospedajes por servicios de habitación
export function useHospedajesConServiciosHabitacion(params: {
  hospedajeIds: string[]
  fechaInicio: string
  fechaFin: string
  personas: number
  serviciosRequeridos: string[]
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['hospedajes', 'servicios-habitacion', params],
    queryFn: async () => {
      console.log('🚀 Iniciando filtro de servicios de habitación')
      console.log('📋 Parámetros:', params)
      
      if (!params.hospedajeIds.length || !params.serviciosRequeridos.length) {
        console.log('⚠️ Sin hospedajes o servicios para filtrar')
        return params.hospedajeIds
      }

      const hospedajesValidos: string[] = []

      // Usar Promise.allSettled para manejar errores individualmente
      const resultados = await Promise.allSettled(
        params.hospedajeIds.map(async (hospedajeId) => {
          console.log(`🔍 Verificando hospedaje: ${hospedajeId}`)
          
          try {
            // Usar el hook existente de habitaciones por hospedaje
            const response = await api.get(`/hospedajes/${hospedajeId}/habitaciones`, {
              fechaInicio: params.fechaInicio,
              fechaFin: params.fechaFin
            })

            const habitaciones = response.data?.data || []
            console.log(`🏠 Habitaciones encontradas para ${hospedajeId}:`, habitaciones.length)
            
            // Verificar si alguna habitación tiene TODOS los servicios requeridos
            const tieneHabitacionConServicios = habitaciones.some((habitacion: any) => {
              const serviciosHabitacion = habitacion.servicios?.map((s: any) => s.id) || []
              console.log(`🔧 Servicios de habitación ${habitacion.id}:`, serviciosHabitacion)
              
              const tieneServicios = params.serviciosRequeridos.every(servicioId => 
                serviciosHabitacion.includes(servicioId)
              )
              
              console.log(`✅ ¿Habitación ${habitacion.id} tiene servicios requeridos?`, tieneServicios)
              return tieneServicios
            })

            console.log(`🎯 ¿Hospedaje ${hospedajeId} tiene habitaciones con servicios?`, tieneHabitacionConServicios)
            
            return {
              hospedajeId,
              valido: tieneHabitacionConServicios
            }
          } catch (error: any) {
            console.error(`❌ Error en hospedaje ${hospedajeId}:`, error?.message || error)
            return {
              hospedajeId,
              valido: false,
              error: error?.message || 'Error desconocido'
            }
          }
        })
      )

      // Procesar resultados
      resultados.forEach((resultado, index) => {
        if (resultado.status === 'fulfilled' && resultado.value.valido) {
          hospedajesValidos.push(resultado.value.hospedajeId)
        } else if (resultado.status === 'rejected') {
          console.error(`❌ Promesa rechazada para hospedaje ${params.hospedajeIds[index]}:`, resultado.reason)
        }
      })

      console.log('🏆 Hospedajes válidos finales:', hospedajesValidos)
      return hospedajesValidos
    },
    enabled: params.enabled !== false && !!params.fechaInicio && !!params.fechaFin && !!params.personas && params.hospedajeIds.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: false, // No reintentar en caso de error
  })
}

export function useDisponibilidadHabitacion(habitacionId: string, fechaInicio: string, fechaFin: string) {
  return useQuery({
    queryKey: ['habitacion', 'disponibilidad', habitacionId, fechaInicio, fechaFin],
    queryFn: async () => {
      const response = await api.get(`/habitaciones/${habitacionId}/disponibilidad`, {
        fechaInicio,
        fechaFin
      })
      return response.data
    },
    enabled: !!habitacionId && !!fechaInicio && !!fechaFin,
  })
}

// ========================
// HOOKS PARA OPINIONES
// ========================

export function useOpinionesHospedaje(hospedajeId: string) {
  return useQuery({
    queryKey: ['opiniones', 'hospedaje', hospedajeId],
    queryFn: async () => {
      const response = await api.get<Opinion[]>(`/opiniones/hospedaje/${hospedajeId}`)
      return response.data
    },
    enabled: !!hospedajeId,
  })
}

// ========================
// HOOKS PARA SERVICIOS
// ========================

export function useServicios() {
  return useQuery({
    queryKey: ['servicios'],
    queryFn: async () => {
      const response = await api.get<Servicio[]>('/servicios/catalogo')
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para actualizar hospedaje
export function useUpdateHospedaje() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await api.patch(`/hospedajes/${id}`, data)
      return response.data
    },
    onSuccess: (data, variables) => {
      // Invalidar cache del hospedaje específico
      queryClient.invalidateQueries({ queryKey: ['hospedaje', variables.id] })
      // Invalidar cache de mis hospedajes
      queryClient.invalidateQueries({ queryKey: ['hospedajes', 'mis-hospedajes'] })
      
      toast({
        title: "Hospedaje actualizado",
        description: "Los cambios se guardaron exitosamente",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.response?.data?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
    },
  })
}

// Hook para gestionar servicios de hospedaje
export function useHospedajeServicios(hospedajeId: string) {
  const queryClient = useQueryClient()
  
  const addServicio = useMutation({
    mutationFn: async ({ servicioId, precioExtra, observaciones }: { servicioId: string, precioExtra?: number, observaciones?: string }) => {
      const response = await api.post(`/servicios/hospedajes/${hospedajeId}/servicios`, {
        servicioId,
        precioExtra,
        observaciones
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios', 'hospedaje', hospedajeId] })
      queryClient.invalidateQueries({ queryKey: ['hospedaje', hospedajeId] })
    },
  })
  
  const removeServicio = useMutation({
    mutationFn: async (servicioId: string) => {
      const response = await api.delete(`/servicios/hospedajes/${hospedajeId}/servicios/${servicioId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios', 'hospedaje', hospedajeId] })
      queryClient.invalidateQueries({ queryKey: ['hospedaje', hospedajeId] })
    },
  })
  
  return {
    addServicio: addServicio.mutateAsync,
    removeServicio: removeServicio.mutateAsync,
    isLoading: addServicio.isPending || removeServicio.isPending,
  }
}

// Hook para subir imágenes de hospedaje
export function useUploadImagenHospedaje() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ hospedajeId, file, descripcion, orden }: { hospedajeId: string, file: File, descripcion?: string, orden?: number }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (descripcion) formData.append('descripcion', descripcion)
      if (orden) formData.append('orden', orden.toString())
      
      const response = await api.post(`/hospedajes/${hospedajeId}/imagenes`, formData)
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospedaje', variables.hospedajeId] })
      
      toast({
        title: "Imagen subida",
        description: "La imagen se agregó exitosamente",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al subir imagen",
        description: error.response?.data?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
    },
  })
}

// Hook para subir documentos de hospedaje
export function useUploadDocumentoHospedaje() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ hospedajeId, file, nombre, descripcion, tipoDocumento }: { hospedajeId: string, file: File, nombre: string, descripcion?: string, tipoDocumento?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('nombre', nombre)
      if (descripcion) formData.append('descripcion', descripcion)
      if (tipoDocumento) formData.append('tipoDocumento', tipoDocumento)
      
      const response = await api.post(`/hospedajes/${hospedajeId}/documentos`, formData)
      return response.data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hospedaje', variables.hospedajeId] })
      
      toast({
        title: "Documento subido",
        description: "El documento se agregó exitosamente",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al subir documento",
        description: error.response?.data?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
    },
  })
}

export function useServiciosHospedaje(hospedajeId: string) {
  return useQuery({
    queryKey: ['servicios', 'hospedaje', hospedajeId],
    queryFn: async () => {
      const response = await api.get<HospedajeServicio[]>(`/servicios/hospedajes/${hospedajeId}/servicios`)
      return response.data
    },
    enabled: !!hospedajeId,
  })
}

export function useServiciosHabitacion(habitacionId: string) {
  return useQuery({
    queryKey: ['servicios', 'habitacion', habitacionId],
    queryFn: async () => {
      const response = await api.get<Servicio[]>(`/servicios/habitaciones/${habitacionId}/servicios`)
      return response.data
    },
    enabled: !!habitacionId,
  })
}

// ========================
// HOOKS PARA TIPOS DE HOSPEDAJE
// ========================

export function useTiposHospedaje() {
  return useQuery({
    queryKey: ['tipos-hospedaje'],
    queryFn: async () => {
      const response = await api.get('/tipos-hospedaje')
      return response.data
    },
    staleTime: 15 * 60 * 1000, // 15 minutos
  })
}

// ========================
// HOOKS PARA RANGOS DE PRECIO
// ========================

export function useRangosPrecio(fechaInicio?: string, fechaFin?: string) {
  return useQuery({
    queryKey: ['rangos-precio', fechaInicio, fechaFin],
    queryFn: async () => {
      const params: any = {}
      if (fechaInicio) params.fechaInicio = fechaInicio
      if (fechaFin) params.fechaFin = fechaFin
      
      const response = await api.get('/habitaciones/precios/rangos', params)
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// ========================
// HOOKS PARA RESERVAS
// ========================

export function useReservasUsuario(usuarioId?: string) {
  return useQuery({
    queryKey: ['reservas', 'mis-reservas'],
    queryFn: async () => {
      console.log('🔍 Obteniendo mis reservas')
      const response = await api.get<Reserva[]>('/reservas/mis-reservas')
      console.log('📄 Respuesta de mis reservas:', response.data)
      return response.data
    },
    enabled: !!usuarioId, // Solo ejecutar si hay usuario autenticado
    retry: 1,
    staleTime: 30000, // 30 segundos
  })
}

export function useReserva(reservaId: string) {
  return useQuery({
    queryKey: ['reserva', reservaId],
    queryFn: async () => {
      const response = await api.get<Reserva>(`/reservas/${reservaId}`)
      return response.data
    },
    enabled: !!reservaId,
  })
}

export function usePagosUsuario(usuarioId?: string) {
  return useQuery({
    queryKey: ['pagos', 'mis-pagos'],
    queryFn: async () => {
      console.log('🔍 Obteniendo mis pagos')
      const response = await api.get('/pagos/mis-pagos')
      console.log('📄 Respuesta de mis pagos:', response.data)
      return response.data
    },
    enabled: !!usuarioId, // Solo ejecutar si hay usuario autenticado
    retry: 1,
    staleTime: 30000, // 30 segundos
  })
}

export function useNotificacionesUsuario(usuarioId?: string) {
  return useQuery({
    queryKey: ['notificaciones', 'usuario', usuarioId],
    queryFn: async () => {
      const response = await api.get('/notificaciones')
      return response.data
    },
    enabled: !!usuarioId,
    retry: 1,
    staleTime: 30000, // 30 segundos
  })
}

// ========================
// MUTATIONS PARA NOTIFICACIONES
// ========================

export function useMarcarNotificacionLeida() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, leida }: { id: string, leida: boolean }) => {
      const response = await api.patch(`/notificaciones/${id}/read`, { leida })
      return response.data
    },
    onSuccess: (data, variables) => {
      // Invalidar las notificaciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      
      toast({
        title: variables.leida ? "Notificación marcada como leída" : "Notificación marcada como no leída",
        description: "El estado se ha actualizado correctamente",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al marcar notificación",
        description: error.response?.data?.message || "Ha ocurrido un error",
        variant: "destructive"
      })
    }
  })
}

export function useMarcarTodasNotificacionesLeidas() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.patch('/notificaciones/read-all')
      return response.data
    },
    onSuccess: () => {
      // Invalidar las notificaciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      
      toast({
        title: "Notificaciones actualizadas",
        description: "Todas las notificaciones han sido marcadas como leídas",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al marcar notificaciones",
        description: error.response?.data?.message || "Ha ocurrido un error",
        variant: "destructive"
      })
    }
  })
}

export function useEliminarNotificacion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/notificaciones/${id}`)
      return response.data
    },
    onSuccess: () => {
      // Invalidar las notificaciones para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      
      toast({
        title: "Notificación eliminada",
        description: "La notificación ha sido eliminada correctamente",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar notificación",
        description: error.response?.data?.message || "Ha ocurrido un error",
        variant: "destructive"
      })
    }
  })
}

// ========================
// HOOKS PARA CÁLCULOS DE PRECIOS
// ========================

export function useCalcularPrecio(data: {
  hospedajeId: string
  habitacionIds: string[]
  fechaInicio: string
  fechaFin: string
  huespedes: number
}) {
  return useQuery({
    queryKey: ['calcular-precio', data],
    queryFn: async () => {
      const response = await api.post('/reservas/calcular-precio', data)
      return response.data
    },
    enabled: !!(data.hospedajeId && data.habitacionIds.length && data.fechaInicio && data.fechaFin),
  })
}

// ========================
// HOOKS PARA PUBLICIDAD
// ========================

export function usePublicidadesActivas() {
  return useQuery({
    queryKey: ['publicidad', 'activas'],
    queryFn: async () => {
      const response = await api.get<Publicidad[]>('/publicidad/activas')
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export function useMisPublicidades() {
  return useQuery({
    queryKey: ['publicidad', 'mis-publicidades'],
    queryFn: async () => {
      const response = await api.get('/publicidad/administrar')
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// ========================
// MUTATIONS PARA RESERVAS
// ========================

export function useCrearReserva() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/reservas', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: "Reserva creada",
        description: "Tu reserva ha sido creada exitosamente",
      })
      queryClient.invalidateQueries({ queryKey: ['reservas'] })
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear reserva",
        description: error.response?.data?.message || "Ha ocurrido un error",
        variant: "destructive"
      })
    }
  })
}

// ========================
// HOOKS PARA ADMINISTRACIÓN
// ========================

export function useHospedajesAdmin(filters?: {
  estado?: string
  tipo?: string
  propietarioId?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['hospedajes', 'admin', filters],
    queryFn: async () => {
      const response = await api.get('/hospedajes', filters)
      return response.data
    },
  })
}

export function useEstadisticasHospedajes() {
  return useQuery({
    queryKey: ['hospedajes', 'estadisticas'],
    queryFn: async () => {
      const response = await api.get('/hospedajes/estadisticas')
      return response.data
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

export function useCambiarEstadoHospedaje() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string, estado: string }) => {
      const response = await api.put(`/hospedajes/${id}/estado`, { estado })
      return response.data
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado del hospedaje ha sido actualizado",
      })
      queryClient.invalidateQueries({ queryKey: ['hospedajes'] })
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar estado",
        description: error.response?.data?.message || "Ha ocurrido un error",
        variant: "destructive"
      })
    }
  })
}

export function useMisHospedajes(filters?: {
  estado?: string
  tipo?: string
  search?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['hospedajes', 'mis-hospedajes', filters],
    queryFn: async () => {
      const response = await api.get('/hospedajes/mis-hospedajes', filters)
      return response.data
    },
  })
}

// ========================
// HOOKS PARA IMÁGENES
// ========================

export function useImagenesHospedaje(hospedajeId: string) {
  return useQuery({
    queryKey: ['imagenes', 'hospedaje', hospedajeId],
    queryFn: async () => {
      const response = await api.get(`/uploads/imagenes/hospedaje/${hospedajeId}`)
      return response.data
    },
    enabled: !!hospedajeId,
  })
}

// Hook para verificar disponibilidad de habitaciones de un hospedaje específico (solo por fechas)
export function useDisponibilidadHabitaciones(
  hospedajeId: string,
  fechaInicio?: string,
  fechaFin?: string
) {
  const [habitacionesDisponibles, setHabitacionesDisponibles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const verificarDisponibilidad = async () => {
      // Si no hay fechas, considerar todas las habitaciones como disponibles por fechas
      if (!fechaInicio || !fechaFin || !hospedajeId) {
        setHabitacionesDisponibles([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Usar el endpoint de disponibilidad con filtro por hospedaje (SIN filtro de huéspedes)
        const params = new URLSearchParams({
          fechaInicio,
          fechaFin,
          hospedajeId,
          limit: '1000'
        })

        const response = await api.get('/habitaciones/disponibilidad', Object.fromEntries(params))
        const data = response.data
        
        // Extraer IDs de habitaciones disponibles por fechas
        const habitacionesDisponiblesIds = (data.data || []).map((habitacion: any) => habitacion.id)
        
        setHabitacionesDisponibles(habitacionesDisponiblesIds)
      } catch (err) {
        console.error('Error verificando disponibilidad:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setHabitacionesDisponibles([]) // En caso de error, mostrar todas como no disponibles
      } finally {
        setIsLoading(false)
      }
    }

    verificarDisponibilidad()
  }, [hospedajeId, fechaInicio, fechaFin])

  return {
    habitacionesDisponibles,
    isLoading,
    error
  }
}

// ========================
// HOOK PARA BUSCAR EMPLEADO POR DNI
// ========================

export function useBuscarEmpleadoPorDni() {
  const [isLoading, setIsLoading] = useState(false)
  const [empleado, setEmpleado] = useState<any | null>(null)
  const [error, setError] = useState<string | null>(null)

  const buscar = async (dni: string) => {
    setIsLoading(true)
    setError(null)
    setEmpleado(null)
    try {
      const response = await api.get(`/users/buscar-por-dni`, { dni })
      if (Array.isArray(response.data) && response.data.length > 0) {
        // Tomar el primer empleado encontrado
        setEmpleado(response.data[0])
      } else {
        setEmpleado(null)
        setError('No se encontró ningún empleado con ese DNI')
      }
    } catch (err: any) {
      setEmpleado(null)
      setError(err?.response?.data?.message || 'Error al buscar empleado')
    } finally {
      setIsLoading(false)
    }
  }

  return { buscar, isLoading, empleado, error }
}

// ========================
// HOOK PARA ROLES
// ========================

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get('/roles')
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// ========================
// HOOK PARA CREAR EMPLEADO
// ========================

export function useCrearEmpleado() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { usuarioId: string, rolId: string, hospedajeId: string }) => {
      const response = await api.post('/empleados', data)
      return response.data
    },
    onSuccess: () => {
      toast({
        title: "Empleado creado",
        description: "El empleado ha sido agregado exitosamente",
      })
      // Invalidar queries relacionadas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ['empleados'] })
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear empleado",
        description: error.response?.data?.message || "Ha ocurrido un error",
        variant: "destructive"
      })
    }
  })
}

// ========================
// HOOK PARA LISTAR EMPLEADOS
// ========================

export function useEmpleadosHospedaje(hospedajeId: string) {
  return useQuery({
    queryKey: ['empleados', 'hospedaje', hospedajeId],
    queryFn: async () => {
      const response = await api.get(`/empleados/hospedaje/${hospedajeId}`)
      return response.data
    },
    enabled: !!hospedajeId,
  })
}

// ========================
// HOOKS PARA HABITACIONES
// ========================

// Hook para obtener datos de una habitación específica
export function useHabitacion(habitacionId: string) {
  return useQuery({
    queryKey: ['habitacion', habitacionId],
    queryFn: async () => {
      const response = await api.get(`/habitaciones/${habitacionId}`)
      return response.data
    },
    enabled: !!habitacionId,
  })
}

// Hook para obtener tipos de habitación
export function useTiposHabitacion() {
  return useQuery({
    queryKey: ['tipos-habitacion'],
    queryFn: async () => {
      const response = await api.get('/tipos-habitacion')
      return response.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para actualizar habitación
export function useUpdateHabitacion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const response = await api.patch(`/habitaciones/${id}`, data)
      return response.data
    },
    onSuccess: (data, variables) => {
      // Invalidar cache de la habitación específica
      queryClient.invalidateQueries({ queryKey: ['habitacion', variables.id] })
      // Invalidar cache de habitaciones del hospedaje
      if (data.hospedaje?.id) {
        queryClient.invalidateQueries({ queryKey: ['habitaciones', 'hospedaje', data.hospedaje.id] })
      }
      
      toast({
        title: "Habitación actualizada",
        description: "Los cambios se guardaron exitosamente",
      })
    },
    onError: (error: any) => {
      toast({
        title: "Error al actualizar",
        description: error.response?.data?.message || "Ocurrió un error inesperado",
        variant: "destructive",
      })
    },
  })
}

// Hook para gestionar servicios de habitación
export function useHabitacionServiciosManagement(habitacionId: string) {
  const queryClient = useQueryClient()
  
  const addServicio = useMutation({
    mutationFn: async ({ servicioId, precioExtra, observaciones, incrementoCapacidad }: { servicioId: string, precioExtra?: number, observaciones?: string, incrementoCapacidad?: number }) => {
      const response = await api.post(`/servicios/habitaciones/${habitacionId}/servicios`, {
        servicioId,
        precioExtra,
        observaciones,
        incrementoCapacidad
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios', 'habitacion', habitacionId] })
      queryClient.invalidateQueries({ queryKey: ['habitacion', habitacionId] })
    },
  })
  
  const removeServicio = useMutation({
    mutationFn: async (servicioId: string) => {
      const response = await api.delete(`/servicios/habitaciones/${habitacionId}/servicios/${servicioId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios', 'habitacion', habitacionId] })
      queryClient.invalidateQueries({ queryKey: ['habitacion', habitacionId] })
    },
  })
  
  return {
    addServicio: addServicio.mutateAsync,
    removeServicio: removeServicio.mutateAsync,
    isLoading: addServicio.isPending || removeServicio.isPending,
  }
}

 