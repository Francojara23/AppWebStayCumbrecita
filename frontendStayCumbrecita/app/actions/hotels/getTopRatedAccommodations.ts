"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el límite
const LimitSchema = z.coerce.number().int().positive().optional().default(10)

interface RatedAccommodation {
  id: string
  name: string
  rating: number
  // Otros campos según necesidad
}

interface GetTopRatedAccommodationsResponse {
  success: boolean
  data?: {
    accommodations: RatedAccommodation[]
  }
  error?: string
}

/**
 * Obtiene los N hospedajes mejor calificados
 *
 * @param limit - Número máximo de hospedajes a retornar
 * @returns Lista de hospedajes mejor calificados
 */
export async function getTopRatedAccommodations(limit = 10): Promise<GetTopRatedAccommodationsResponse> {
  try {
    // Validar límite
    const validatedLimit = LimitSchema.parse(limit)

    // Realizar la solicitud al backend
    const response = await fetch(
      `${getApiUrl()}/api/accommodations/top-rated?limit=${validatedLimit}`,
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
        error: errorData.error || `Error al obtener hospedajes mejor calificados: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getTopRatedAccommodations:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes mejor calificados",
    }
  }
}
