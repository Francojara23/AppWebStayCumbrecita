'use server'

import { cookies } from 'next/headers'
import { getApiUrl } from "@/lib/utils/api-urls"

export async function updateTono(hospedajeId: string, tono: string) {
  try {
    // Obtener token de las cookies del servidor
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return { 
        success: false, 
        error: 'No hay token de autenticación' 
      }
    }

    const response = await fetch(`${getApiUrl()}/chatbot/${hospedajeId}/tono`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tono }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error del servidor:', errorText)
      return { 
        success: false, 
        error: `Error ${response.status}: ${response.statusText}` 
      }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error: any) {
    console.error('Error updating tono:', error)
    return { 
      success: false, 
      error: error.message || 'Error al actualizar el tono' 
    }
  }
} 