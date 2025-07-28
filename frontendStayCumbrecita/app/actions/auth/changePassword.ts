"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para cambio de contraseña
const changePasswordSchema = z.object({
  passwordActual: z.string().min(1, { message: "La contraseña actual es requerida" }),
  passwordNueva: z.string()
    .min(8, { message: "La nueva contraseña debe tener al menos 8 caracteres" })
    .regex(/^[a-zA-Z0-9]+$/, { message: "La contraseña debe ser alfanumérica" }),
})

type ChangePasswordData = z.infer<typeof changePasswordSchema>

/**
 * Server action para cambiar contraseña del usuario autenticado
 */
export async function changePassword(formData: ChangePasswordData) {
  try {
    // Validar los datos
    const validatedData = changePasswordSchema.parse(formData)

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
    const response = await fetch(`${getApiUrl()}/auth/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(validatedData),
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al cambiar la contraseña",
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

    console.error("Error en changePassword:", error)
    return {
      success: false,
      error: "Ha ocurrido un error al cambiar la contraseña",
    }
  }
} 