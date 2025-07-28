"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el tipo
const TypeSchema = z.string().min(1, "El tipo es requerido")

interface Accommodation {
  id: string
  name: string
  type: string
  // Otros campos según necesidad
}

interface GetAccommodationsByTypeResponse {
  success: boolean
  data?: {
    accommodations: Accommodation[]
  }
  error?: string
}

/**
 * Obtiene hospedajes filtrados por tipo
 *
 * @param type - Tipo de hospedaje
 * @returns Lista de hospedajes del tipo especificado
 */
export async function getAccommodationsByType(type: string): Promise<GetAccommodationsByTypeResponse> {
  try {
    // Validar tipo
    const validatedType = TypeSchema.parse(type)

    // Realizar la solicitud al backend
    const response = await fetch(
      `${getApiUrl()}/api/accommodations/by-type?type=${encodeURIComponent(validatedType)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Error al obtener hospedajes por tipo: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationsByType:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes por tipo",
    }
  }
}
