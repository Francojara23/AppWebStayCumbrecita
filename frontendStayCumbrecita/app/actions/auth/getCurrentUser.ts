"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para la respuesta del usuario
const UserSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string().email(),
  telefono: z.string().optional().nullable(),
  dni: z.string().optional().nullable(),
  direccion: z.string().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
  estadoConfirmacion: z.union([z.string(), z.boolean()]),
  roles: z.array(z.object({
    id: z.string(),
    nombre: z.string(),
  })),
})

const ResponseSchema = z.object({
  success: z.boolean(),
  data: UserSchema.optional(),
  error: z.string().optional(),
  shouldRedirectToHome: z.boolean().optional(),
})

// Tipo para la respuesta
export type GetCurrentUserResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene los datos del usuario logueado actualmente
 * @returns Datos del usuario logueado o información de error
 */
export async function getCurrentUser(): Promise<GetCurrentUserResponse> {
  try {
    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación",
        shouldRedirectToHome: true
      }
    }

    // Realizar petición a la API para obtener el perfil del usuario
    const response = await fetch(`${getApiUrl()}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      // Si es un error de autorización (401, 403), redirigir a home
      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          error: "Usuario no autorizado",
          shouldRedirectToHome: true
        }
      }

      const errorData = await response.json()
      return {
        success: false,
        error: errorData.message || "Error al obtener los datos del usuario",
        shouldRedirectToHome: true
      }
    }

    const data = await response.json()

    // Validar respuesta
    const validatedData = UserSchema.parse(data)

    return {
      success: true,
      data: validatedData,
    }
  } catch (error) {
    console.error("Error en getCurrentUser:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Error de validación: ${error.message}`,
        shouldRedirectToHome: true
      }
    }

    return {
      success: false,
      error: "Error desconocido al obtener los datos del usuario",
      shouldRedirectToHome: true
    }
  }
}
