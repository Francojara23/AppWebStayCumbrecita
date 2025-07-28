"use server"

import { z } from "zod"
import { getAuthTokenFromCookies } from "@/lib/utils/auth-token"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.any().optional(),
  error: z.string().optional(),
})

export type MarkNotificationAsReadResponse = z.infer<typeof ResponseSchema>

/**
 * Marca una notificación como leída o no leída
 * @param notificationId ID de la notificación
 * @param leida true para marcar como leída, false para no leída
 * @returns Respuesta de la operación
 */
export async function markNotificationAsRead(
  notificationId: string, 
  leida: boolean
): Promise<MarkNotificationAsReadResponse> {
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
    const response = await fetch(`${getApiUrl()}/notificaciones/${notificationId}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ leida }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }))
      return {
        success: false,
        error: errorData.message || `Error ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    return ResponseSchema.parse({
      success: true,
      data
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
      error: "Error desconocido al marcar la notificación"
    }
  }
} 