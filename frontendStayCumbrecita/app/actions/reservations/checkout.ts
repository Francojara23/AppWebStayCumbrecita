'use server'

import { getApiUrl } from '@/lib/utils/api-urls'
import { requireAuthToken } from '@/lib/utils/auth-token'
import { DatosCheckout, CheckoutCompletoData, CheckoutResult } from '@/types/checkout'

export async function getDatosCheckout(reservaId: string): Promise<{
  success: boolean
  data?: DatosCheckout
  message: string
}> {
  try {
    const token = await requireAuthToken()

    const response = await fetch(`${getApiUrl()}/reservas/${reservaId}/datos-checkout`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
      return {
        success: false,
        message: errorData.message || `Error ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()
    
    return {
      success: true,
      data,
      message: 'Datos obtenidos exitosamente'
    }
  } catch (error) {
    console.error('Error obteniendo datos de checkout:', error)
    return {
      success: false,
      message: 'Error de conexión con el servidor'
    }
  }
}

export async function confirmarCheckout(
  reservaId: string, 
  datosCheckout: CheckoutCompletoData
): Promise<{
  success: boolean
  data?: CheckoutResult
  message: string
}> {
  try {
    const token = await requireAuthToken()

    console.log('🚀 Enviando datos de checkout:', datosCheckout)

    const response = await fetch(`${getApiUrl()}/reservas/${reservaId}/confirmar-checkout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify(datosCheckout),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
      console.error('❌ Error en respuesta del checkout:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      })
      return {
        success: false,
        message: errorData.message || `Error ${response.status}: ${response.statusText}`
      }
    }

    const result = await response.json()
    console.log('✅ Checkout completado exitosamente:', result)

    return {
      success: true,
      data: result,
      message: 'Checkout realizado exitosamente'
    }
  } catch (error) {
    console.error('❌ Error en checkout:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return {
      success: false,
      message: `Error al realizar checkout: ${errorMessage}`
    }
  }
}