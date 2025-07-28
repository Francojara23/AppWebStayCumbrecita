"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

export interface PaymentDetails {
  cardholderName?: string
  cardNumber?: string
  cardType?: string
  expiryDate?: string
  originAccount?: string
  originOwner?: string
  destinationAccount?: string
  destinationOwner?: string
  transferDate?: string
  transferId?: string
}

export interface Payment {
  id: string
  reservaId?: string | null
  metodo: "TARJETA" | "TRANSFERENCIA"
  estado: "PENDIENTE" | "PROCESANDO" | "APROBADO" | "RECHAZADO" | "CANCELADO" | "EXPIRADO" | "FALLIDO"
  montoReserva: number
  montoImpuestos: number
  montoTotal: number
  fechaPago: string
}

export interface GetUserPaymentsResponse {
  success: boolean
  data?: Payment[]
  error?: string
}

/**
 * Obtiene los pagos del usuario autenticado
 */
export async function getUserPayments(): Promise<GetUserPaymentsResponse> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    // Usar el endpoint de mis pagos para el usuario autenticado
    const endpoint = `${getApiUrl()}/pagos/mis-pagos`

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al obtener los pagos"
      }
    }

    const data = await response.json()

    // El backend devuelve { data: [...], meta: {...} }
    // Extraer el array de pagos de la propiedad 'data'
    let paymentsArray = []
    if (data && typeof data === 'object') {
      if (Array.isArray(data)) {
        // Si data es directamente un array
        paymentsArray = data
      } else if (data.data && Array.isArray(data.data)) {
        // Si data tiene la estructura { data: [...], meta: {...} }
        paymentsArray = data.data
      } else {
        console.error("Estructura de respuesta inesperada:", data)
        return {
          success: false,
          error: "Estructura de respuesta del servidor inesperada"
        }
      }
    }

    // Asegurar que tenemos un array
    if (!Array.isArray(paymentsArray)) {
      console.error("Los datos no son un array:", paymentsArray)
      return {
        success: false,
        error: "Los datos recibidos no tienen el formato esperado"
      }
    }

    return {
      success: true,
      data: paymentsArray
    }
  } catch (error) {
    console.error("Error en getUserPayments:", error)
    return {
      success: false,
      error: "Error de conexión con el servidor"
    }
  }
}

/**
 * Obtiene el historial de un pago específico
 */
export async function getPaymentHistory(paymentId: string) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/pagos/${paymentId}/historial`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al obtener el historial del pago")
    }

    return await response.json()
  } catch (error) {
    console.error("Error en getPaymentHistory:", error)
    throw error
  }
} 