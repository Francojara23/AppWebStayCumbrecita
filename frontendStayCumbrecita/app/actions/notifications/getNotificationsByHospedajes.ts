"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para una notificación
const NotificationSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  cuerpo: z.string(),
  tipo: z.string(),
  data: z.any().optional(),
  leida: z.boolean(),
  canalEmail: z.boolean(),
  canalPush: z.boolean(),
  canalInApp: z.boolean(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean().default(true),
  data: z.array(NotificationSchema).optional(),
  error: z.string().optional(),
})

// Tipos exportados
export type NotificationByHospedajes = z.infer<typeof NotificationSchema>
export type GetNotificationsByHospedajesResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene las notificaciones relacionadas con los hospedajes donde el usuario tiene roles
 * @returns Lista de notificaciones relacionadas con hospedajes del usuario
 */
export async function getNotificationsByHospedajes(): Promise<GetNotificationsByHospedajesResponse> {
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
    const response = await fetch(`${getApiUrl()}/notificaciones/by-hospedajes`, {
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
      data: data || []
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
      error: "Error desconocido al obtener las notificaciones por hospedajes"
    }
  }
} 