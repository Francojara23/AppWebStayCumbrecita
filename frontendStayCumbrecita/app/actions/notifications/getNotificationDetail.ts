"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el detalle de una notificación
const NotificationDetailSchema = z.object({
  titulo: z.string(),
  cuerpoResumen: z.string(),
  cuerpoDetallado: z.string(),
  tipo: z.string(),
  data: z.any().optional(),
  createdAt: z.string(),
})

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean().default(true),
  data: NotificationDetailSchema.optional(),
  error: z.string().optional(),
})

// Tipos exportados
export type NotificationDetail = z.infer<typeof NotificationDetailSchema>
export type GetNotificationDetailResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene el contenido detallado de una notificación específica
 * @param notificationId ID de la notificación
 * @returns Contenido detallado de la notificación
 */
export async function getNotificationDetail(notificationId: string): Promise<GetNotificationDetailResponse> {
  try {
    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/notificaciones/${notificationId}/detalle`, {
      method: "GET",
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

    const data = await response.json()

    // Validar respuesta
    return ResponseSchema.parse({
      success: true,
      data: data
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
      error: "Error desconocido al obtener el detalle de la notificación"
    }
  }
} 