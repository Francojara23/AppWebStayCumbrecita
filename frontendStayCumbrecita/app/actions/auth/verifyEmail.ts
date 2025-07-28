"use server"

import { VerifyEmailSchema, type VerifyEmailInput } from "@/lib/schemas/auth"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Server action para la verificación de email
 * CORREGIDO: Ahora usa la ruta correcta del backend
 */
export async function verifyEmail(formData: VerifyEmailInput) {
  try {
    // Validar los datos de entrada
    const validatedFields = VerifyEmailSchema.safeParse(formData)

    if (!validatedFields.success) {
      return {
        success: false,
        error: validatedFields.error.flatten().fieldErrors,
      }
    }

    const { token } = validatedFields.data

    // Realizar la solicitud al backend - RUTA CORREGIDA
    const response = await fetch(`${getApiUrl()}/auth/verify-email?token=${token}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Token inválido o expirado",
      }
    }

    const result = await response.json()

    return {
      success: true,
      message: result.message || "Email verificado exitosamente",
      userType: result.userType || "TURISTA", // Por defecto tourist si no viene
    }
  } catch (error) {
    console.error("Error en verifyEmail:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al verificar tu email",
    }
  }
}
