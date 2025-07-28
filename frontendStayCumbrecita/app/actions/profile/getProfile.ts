"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Esquema de respuesta para el perfil del usuario
 */
export const ProfileResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  profilePicture: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type ProfileResponse = z.infer<typeof ProfileResponseSchema>

/**
 * Obtiene el perfil del usuario actual
 * @returns El perfil del usuario o un error
 */
export async function getProfile(): Promise<{ data: ProfileResponse | null; error: string | null }> {
  try {
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
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        data: null,
        error: errorData.message || "Error al obtener el perfil",
      }
    }

    const profileData = await response.json()
    const validatedData = ProfileResponseSchema.parse(profileData)

    return {
      data: validatedData,
      error: null,
    }
  } catch (error) {
    console.error("Error al obtener el perfil:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido al obtener el perfil",
    }
  }
}
