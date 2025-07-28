"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { ProfileResponseSchema } from "./getProfile"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Esquema para validar los datos de actualización del perfil
 */
export const UpdateProfileSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres").optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  profilePicture: z.string().url().optional(),
})

export type UpdateProfileData = z.infer<typeof UpdateProfileSchema>

/**
 * Actualiza el perfil del usuario actual
 * @param data Datos para actualizar el perfil
 * @returns El perfil actualizado o un error
 */
export async function updateProfile(data: UpdateProfileData): Promise<{
  data: z.infer<typeof ProfileResponseSchema> | null
  error: string | null
}> {
  try {
    // Validar los datos de entrada
    const validatedData = UpdateProfileSchema.parse(data)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        data: null,
        error: "No estás autenticado",
      }
    }

    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        data: null,
        error: errorData.message || "Error al actualizar el perfil",
      }
    }

    const profileData = await response.json()
    const validatedResponse = ProfileResponseSchema.parse(profileData)

    return {
      data: validatedResponse,
      error: null,
    }
  } catch (error) {
    console.error("Error al actualizar el perfil:", error)

    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido al actualizar el perfil",
    }
  }
}
