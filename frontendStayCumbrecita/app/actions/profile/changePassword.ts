"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Esquema para validar los datos de cambio de contraseña
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "La contraseña actual debe tener al menos 8 caracteres"),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(8, "La confirmación de contraseña debe tener al menos 8 caracteres"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>

/**
 * Cambia la contraseña del usuario actual
 * @param data Datos para cambiar la contraseña
 * @returns Un mensaje de éxito o un error
 */
export async function changePassword(data: ChangePasswordData): Promise<{
  success: boolean
  message: string
}> {
  try {
    // Validar los datos de entrada
    const validatedData = ChangePasswordSchema.parse(data)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        success: false,
        message: "No estás autenticado",
      }
    }

    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/profile/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: validatedData.currentPassword,
        newPassword: validatedData.newPassword,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        message: errorData.message || "Error al cambiar la contraseña",
      }
    }

    return {
      success: true,
      message: "Contraseña actualizada correctamente",
    }
  } catch (error) {
    console.error("Error al cambiar la contraseña:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Error desconocido al cambiar la contraseña",
    }
  }
}
