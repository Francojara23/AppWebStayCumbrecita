import { useState } from 'react'
import { getApiUrl } from '@/lib/utils/api-urls'

interface CreatePublicidadData {
  hospedajeId: string
  monto: number
  fechaInicio: Date
  fechaFin: Date
  renovacionAutomatica?: boolean
}

interface CreateTarjetaData {
  numero: string
  titular: string
  vencimiento: string
  cve: string
  tipo: 'CREDITO' | 'DEBITO'
  entidad: string
}

export function useCrearPublicidad() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const crearPublicidad = async (
    publicidadData: CreatePublicidadData,
    tarjetaData: CreateTarjetaData
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1]

      // Preparar datos completos para el backend
      const requestData = {
        hospedajeId: publicidadData.hospedajeId,
        monto: publicidadData.monto,
        fechaInicio: publicidadData.fechaInicio.toISOString(),
        fechaFin: publicidadData.fechaFin.toISOString(),
        tarjeta: {
          numero: tarjetaData.numero,
          titular: tarjetaData.titular.toUpperCase(),
          vencimiento: tarjetaData.vencimiento,
          cve: tarjetaData.cve,
          tipo: tarjetaData.tipo,
          entidad: tarjetaData.entidad.toUpperCase()
        },
        renovacionAutomatica: publicidadData.renovacionAutomatica || false
      }

      console.log('🚀 Enviando datos de publicidad:', requestData)
      console.log('💳 Datos de tarjeta específicos:', {
        numero: tarjetaData.numero,
        titular: tarjetaData.titular,
        originalTitular: tarjetaData.titular.toUpperCase(),
        vencimiento: tarjetaData.vencimiento,
        cve: tarjetaData.cve,
        tipo: tarjetaData.tipo,
        entidad: tarjetaData.entidad,
        originalEntidad: tarjetaData.entidad.toUpperCase()
      })

      const response = await fetch(`${getApiUrl()}/publicidad`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Manejar errores específicos
        if (errorData.message?.includes('pago rechazado') || errorData.message?.includes('Tarjeta no válida')) {
          throw new Error('Pago rechazado: Verifica los datos de tu tarjeta')
        }
        
        if (errorData.message?.includes('permiso')) {
          throw new Error('No tienes permisos para promocionar este hospedaje')
        }

        throw new Error(errorData.message || 'Error al crear la publicidad')
      }

      const publicidad = await response.json()

      console.log('✅ Publicidad creada exitosamente:', publicidad)

      return {
        success: true,
        publicidad
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    crearPublicidad,
    isLoading,
    error
  }
} 