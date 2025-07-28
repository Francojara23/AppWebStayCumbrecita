"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action para obtener el perfil del usuario autenticado
 */
export async function getProfile() {
  try {
    // Obtener el token de autenticación
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth_token")?.value

    if (!authToken) {
      return {
        success: false,
        error: "No estás autenticado",
      }
    }

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al obtener el perfil",
      }
    }

    const profileData = await response.json()

    return {
      success: true,
      user: profileData,
    }
  } catch (error) {
    console.error("Error en getProfile:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al obtener el perfil",
    }
  }
} 