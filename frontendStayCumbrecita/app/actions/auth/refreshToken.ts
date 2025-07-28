"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action para refrescar el token JWT
 */
export async function refreshToken() {
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
    const response = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: "POST",
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
        error: errorData.message || "Error al refrescar token",
      }
    }

    const result = await response.json()

    // Actualizar el token en las cookies
    if (result.token) {
      cookieStore.set({
        name: "auth_token",
        value: result.token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 semana
        path: "/",
      })
    }

    return {
      success: true,
      token: result.token,
    }
  } catch (error) {
    console.error("Error en refreshToken:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al refrescar el token",
    }
  }
} 