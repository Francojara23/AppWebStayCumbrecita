'use server'

import { requireAuthToken } from '@/lib/utils/auth-token'
import { getApiUrl } from '@/lib/utils/api-urls'

export interface CheckinRecord {
  id: string
  reservaId: string
  codigo: string
  hospedaje: string
  titular: string
  fechaCheckin: Date
  habitaciones: number
  totalHuespedes: number
  realizadoPor: string
  estado: string
}

export interface GetCheckinsResponse {
  success: boolean
  data: CheckinRecord[]
  message?: string
}

export async function getCheckinsRealizados(): Promise<GetCheckinsResponse> {
  try {
    // Obtener token usando la misma utilidad que otras páginas admin
    const token = await requireAuthToken()

    const response = await fetch(`${getApiUrl()}/reservas/checkins-realizados`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      console.error('❌ Error al obtener check-ins:', response.status, response.statusText)
      return {
        success: false,
        data: [],
        message: `Error HTTP: ${response.status}`
      }
    }

    const result = await response.json()
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
        message: result.message || 'Check-ins obtenidos exitosamente'
      }
    } else {
      return {
        success: false,
        data: [],
        message: result.message || 'Error al obtener check-ins'
      }
    }
  } catch (error) {
    console.error('❌ Error en getCheckinsRealizados:', error)
    
    // Si es error de autenticación, devolver mensaje específico
    if (error instanceof Error && error.message.includes('token')) {
      return {
        success: false,
        data: [],
        message: 'Error de autenticación. Por favor, inicie sesión nuevamente.'
      }
    }
    
    return {
      success: false,
      data: [],
      message: 'Error al conectar con el servidor'
    }
  }
}