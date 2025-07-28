import { useState, useEffect } from 'react'
import { api } from '@/lib/api/client'

interface Empleado {
  id: string
  usuario: {
    id: string
    nombre: string
    apellido: string
    dni: string
    email: string
  }
  rol: {
    id: string
    nombre: string
    descripcion: string
  }
}

interface UseEmpleadosHospedajeResult {
  empleados: Empleado[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useEmpleadosHospedaje(hospedajeId: string | null): UseEmpleadosHospedajeResult {
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmpleados = async () => {
    if (!hospedajeId) {
      setEmpleados([])
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await api.get(`/empleados/hospedaje/${hospedajeId}`)
      setEmpleados(response.data || [])
      
      console.log('👥 Empleados cargados:', response.data?.length || 0)
    } catch (err: any) {
      console.error('Error cargando empleados:', err)
      setError(err.response?.data?.message || 'Error al cargar empleados')
      setEmpleados([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEmpleados()
  }, [hospedajeId])

  return {
    empleados,
    isLoading,
    error,
    refetch: fetchEmpleados
  }
} 