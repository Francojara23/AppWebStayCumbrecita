"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para resetear contraseña
const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Token es requerido" }),
  passwordNueva: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "La contraseña debe ser alfanumérica" }),
})

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

/**
 * Server action para resetear contraseña con token
 */
export async function resetPassword(formData: ResetPasswordData) {
  try {
    // Validar los datos
    const validatedData = resetPasswordSchema.parse(formData)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/auth/password/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validatedData),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al resetear la contraseña",
      }
    }

    const result = await response.json()

    return {
      success: true,
      message: result.message || "Contraseña actualizada exitosamente",
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    console.error("Error en resetPassword:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al resetear la contraseña",
    }
  }
}
