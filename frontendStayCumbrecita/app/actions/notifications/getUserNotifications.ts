"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

export interface Notification {
  id: string
  titulo: string
  cuerpo: string
  tipo: "INFO" | "SUCCESS" | "WARNING" | "ERROR"
  data?: any
  leida: boolean
  canalEmail: boolean
  canalPush: boolean
  canalInApp: boolean
  readAt?: string
  createdAt: string
  updatedAt: string
}

export interface GetNotificationsResponse {
  success: boolean
  data?: Notification[]
  error?: string
}

/**
 * Obtiene todas las notificaciones del usuario autenticado
 */
export async function getUserNotifications(): Promise<GetNotificationsResponse> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    const response = await fetch(`${getApiUrl()}/notificaciones`, {
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
        error: errorData.message || "Error al obtener las notificaciones"
      }
    }

    const data = await response.json()

    return {
      success: true,
      data: data
    }
  } catch (error) {
    return {
      success: false,
      error: "Error de conexión con el servidor"
    }
  }
}

/**
 * Marca una notificación como leída o no leída
 */
export async function markNotificationAsRead(notificationId: string, read: boolean = true) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/notificaciones/${notificationId}/read`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ read }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al marcar la notificación")
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

/**
 * Marca todas las notificaciones como leídas
 */
export async function markAllNotificationsAsRead() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/notificaciones/read-all`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al marcar todas las notificaciones")
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

/**
 * Elimina una notificación
 */
export async function deleteNotification(notificationId: string) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/notificaciones/${notificationId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al eliminar la notificación")
    }

    return { success: true }
  } catch (error) {
    throw error
  }
} 