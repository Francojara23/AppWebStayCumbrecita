"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para actualizar un hospedaje
const UpdateAccommodationSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  owner: z.string().optional(),
  registrationCert: z.string().optional(),
  taxId: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  services: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.string().optional(),
})

export type UpdateAccommodationData = z.infer<typeof UpdateAccommodationSchema>

interface UpdateAccommodationResponse {
  success: boolean
  data?: {
    id: string
    status: string
    // Otros campos actualizados
  }
  error?: string | Record<string, string[]>
}

/**
 * Actualiza un hospedaje existente
 *
 * @param id - ID del hospedaje a actualizar
 * @param data - Datos a actualizar
 * @returns Respuesta con el hospedaje actualizado
 */
export async function updateAccommodation(
  id: string,
  data: UpdateAccommodationData,
): Promise<UpdateAccommodationResponse> {
  try {
    // Validar ID
    if (!id) {
      return {
        success: false,
        error: "El ID del hospedaje es requerido",
      }
    }

    // Validar datos
    const validatedData = UpdateAccommodationSchema.parse(data)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Error al actualizar el hospedaje: ${response.status}`,
      }
    }

    const responseData = await response.json()
    return responseData
  } catch (error) {
    console.error("Error en updateAccommodation:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.format(),
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al actualizar el hospedaje",
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
