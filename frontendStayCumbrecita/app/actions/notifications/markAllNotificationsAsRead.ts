"use server"

import { z } from "zod"
import { getAuthTokenFromCookies } from "@/lib/utils/auth-token"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean().default(true),
  error: z.string().optional(),
})

export type MarkAllNotificationsAsReadResponse = z.infer<typeof ResponseSchema>

/**
 * Marca todas las notificaciones del usuario como leídas
 * @returns Respuesta de la operación
 */
export async function markAllNotificationsAsRead(): Promise<MarkAllNotificationsAsReadResponse> {
  try {
    // Obtener token de autenticación
    const token = await getAuthTokenFromCookies()

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/notificaciones/read-all`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }))
      return {
        success: false,
        error: errorData.message || `Error ${response.status}: ${response.statusText}`
      }
    }

    return ResponseSchema.parse({
      success: true
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Error de validación: ${error.message}`
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: false,
      error: "Error desconocido al marcar todas las notificaciones"
    }
  }
} 