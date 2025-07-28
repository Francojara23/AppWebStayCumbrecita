"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para los parámetros de consulta
const QueryParamsSchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
})

type QueryParams = z.infer<typeof QueryParamsSchema>

// Tipo para la respuesta
interface Accommodation {
  id: string
  name: string
  type: string
  status: string
  // Otros campos según necesidad
}

interface GetAccommodationsResponse {
  success: boolean
  data?: {
    accommodations: Accommodation[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

/**
 * Obtiene una lista paginada de hospedajes con filtros opcionales
 *
 * @param params - Parámetros de consulta (page, limit, search, status, type)
 * @returns Lista paginada de hospedajes
 */
export async function getAccommodations(params: QueryParams): Promise<GetAccommodationsResponse> {
  try {
    // Validar parámetros
    const validatedParams = QueryParamsSchema.parse(params)

    // Construir URL con query params
    const queryParams = new URLSearchParams()

    if (validatedParams.page) queryParams.append("page", validatedParams.page.toString())
    if (validatedParams.limit) queryParams.append("limit", validatedParams.limit.toString())
    if (validatedParams.search) queryParams.append("search", validatedParams.search)
    if (validatedParams.status) queryParams.append("status", validatedParams.status)
    if (validatedParams.type) queryParams.append("type", validatedParams.type)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || `Error al obtener hospedajes: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodations:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes",
    }
  }
}
