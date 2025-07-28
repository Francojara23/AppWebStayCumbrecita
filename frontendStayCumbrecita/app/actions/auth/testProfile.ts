"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action temporal para probar qué devuelve /auth/me
 */
export async function testProfile() {
  try {
    const cookieStore = await cookies()
    const authToken = cookieStore.get("auth_token")?.value

    if (!authToken) {
      return {
        success: false,
        error: "No hay token de autenticación",
      }
    }

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
        status: response.status
      }
    }

    const profileData = await response.json()

    return {
      success: true,
      data: profileData,
    }
  } catch (error) {
    console.error("Error en testProfile:", error)
    return {
      success: false,
      error: "Error de conexión",
    }
  }
} 