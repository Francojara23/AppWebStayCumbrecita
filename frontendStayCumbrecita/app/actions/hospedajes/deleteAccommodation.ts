"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID
const IdSchema = z.string().min(1, "El ID es requerido")

interface DeleteAccommodationResponse {
  success: boolean
  error?: string
}

/**
 * Elimina un hospedaje por su ID
 *
 * @param id - ID del hospedaje a eliminar
 * @returns Respuesta de éxito o error
 */
export async function deleteAccommodation(id: string): Promise<DeleteAccommodationResponse> {
  try {
    // Validar ID
    const validatedId = IdSchema.parse(id)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations/${validatedId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAuthToken()}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Error al eliminar el hospedaje: ${response.status}`,
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error en deleteAccommodation:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al eliminar el hospedaje",
    }
  }
}

// Función auxiliar para obtener el token de autenticación
async function getAuthToken(): Promise<string> {
  // En una implementación real, esto obtendría el token de las cookies o de algún otro almacenamiento
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("auth_token")
  return authCookie?.value || ""
}
