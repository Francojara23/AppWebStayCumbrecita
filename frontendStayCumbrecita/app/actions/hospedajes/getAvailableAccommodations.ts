"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para los parámetros de disponibilidad
const AvailabilityParamsSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  guests: z.coerce.number().int().positive().optional(),
})

export type AvailabilityParams = z.infer<typeof AvailabilityParamsSchema>

interface AvailableAccommodation {
  id: string
  name: string
  roomsFree: number
  // Otros campos según necesidad
}

interface GetAvailableAccommodationsResponse {
  success: boolean
  data?: {
    accommodations: AvailableAccommodation[]
  }
  error?: string
}

/**
 * Obtiene los hospedajes disponibles en un rango de fechas
 *
 * @param params - Parámetros de disponibilidad (from, to, guests)
 * @returns Lista de hospedajes disponibles
 */
export async function getAvailableAccommodations(
  params: AvailabilityParams,
): Promise<GetAvailableAccommodationsResponse> {
  try {
    // Validar parámetros
    const validatedParams = AvailabilityParamsSchema.parse(params)

    // Construir URL con query params
    const queryParams = new URLSearchParams()
    queryParams.append("from", validatedParams.from)
    queryParams.append("to", validatedParams.to)
    if (validatedParams.guests) queryParams.append("guests", validatedParams.guests.toString())

    // Realizar la solicitud al backend
    const response = await fetch(
      `${getApiUrl()}/api/accommodations/available?${queryParams.toString()}`,
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
        error: errorData.error || `Error al obtener hospedajes disponibles: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAvailableAccommodations:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes disponibles",
    }
  }
}
