"use server"

import { ForgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas/auth"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action para solicitar recuperación de contraseña
 * CORREGIDO: Ahora usa la ruta correcta del backend
 */
export async function forgotPassword(formData: ForgotPasswordInput) {
  try {
    // Validar los datos de entrada
    const validatedFields = ForgotPasswordSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.flatten().fieldErrors,
      }
    }

    const { email } = validatedFields.data

    // Realizar la solicitud al backend - RUTA CORREGIDA
    const response = await fetch(`${getApiUrl()}/auth/password/forgot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al procesar la solicitud",
      }
    }

    const result = await response.json()

    return {
      success: true,
      message: result.message || "Se ha enviado un email con instrucciones para restablecer tu contraseña.",
    }
  } catch (error) {
    console.error("Error en forgotPassword:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al procesar tu solicitud",
    }
  }
}
