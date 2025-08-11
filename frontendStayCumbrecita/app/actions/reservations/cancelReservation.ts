"use server"

import { getApiUrl } from "@/lib/utils/api-urls"
import { requireAuthToken } from "@/lib/utils/auth-token"

interface CancelReservationRequest {
  motivo: string
  notificarTurista?: boolean
  canceladoPor?: string
  metadatos?: any
}

interface CancelReservationResponse {
  success: boolean
  message: string
  reserva?: any
  pagos?: any[]
}

export async function cancelReservation(
  reservaId: string, 
  data: CancelReservationRequest
): Promise<CancelReservationResponse> {
  try {
    // Obtener token de autenticación
    const token = await requireAuthToken()

    const response = await fetch(`${getApiUrl()}/reservas/${reservaId}/cancelar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      message: 'Reserva cancelada exitosamente',
      reserva: result,
      pagos: result.pagos || []
    }

  } catch (error) {
    console.error('Error cancelando reserva:', error)
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido al cancelar la reserva'
    }
  }
}
