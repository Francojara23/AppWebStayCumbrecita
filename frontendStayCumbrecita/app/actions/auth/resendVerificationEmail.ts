"use server"

import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action para reenviar email de verificación
 */
export async function resendVerificationEmail() {
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
    const response = await fetch(`${getApiUrl()}/auth/verify-email/resend`, {
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
        error: errorData.message || "Error al reenviar email de verificación",
      }
    }

    const result = await response.json()

    return {
      success: true,
      message: result.message || "Email de verificación enviado exitosamente",
    }
  } catch (error) {
    console.error("Error en resendVerificationEmail:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al reenviar el email de verificación",
    }
  }
} 