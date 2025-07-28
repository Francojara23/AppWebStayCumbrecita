"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para crear un hospedaje
const CreateAccommodationSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  type: z.string().min(1, "El tipo es requerido"),
  shortDescription: z.string().min(1, "La descripción corta es requerida"),
  longDescription: z.string().optional(),
  owner: z.string().min(1, "El propietario es requerido"),
  registrationCert: z.string().optional(),
  taxId: z.string().min(1, "El ID fiscal es requerido"),
  contactPerson: z.string().min(1, "La persona de contacto es requerida"),
  phone: z.string().min(1, "El teléfono es requerido"),
  email: z.string().email("Email inválido"),
  services: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
})

export type CreateAccommodationData = z.infer<typeof CreateAccommodationSchema>

interface CreateAccommodationResponse {
  success: boolean
  data?: {
    id: string
    name: string
    type: string
    status: string
  }
  error?: string | Record<string, string[]>
}

/**
 * Crea un nuevo hospedaje
 *
 * @param data - Datos del hospedaje a crear
 * @returns Respuesta con el hospedaje creado
 */
export async function createAccommodation(data: CreateAccommodationData): Promise<CreateAccommodationResponse> {
  try {
    // Validar datos
    const validatedData = CreateAccommodationSchema.parse(data)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations`, {
      method: "POST",
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
        error: errorData.error || `Error al crear el hospedaje: ${response.status}`,
      }
    }

    const responseData = await response.json()
    return responseData
  } catch (error) {
    console.error("Error en createAccommodation:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.format(),
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear el hospedaje",
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
