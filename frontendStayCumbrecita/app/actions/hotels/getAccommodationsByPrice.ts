"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el rango de precios
const PriceRangeSchema = z.object({
  min: z.coerce.number().nonnegative(),
  max: z.coerce.number().positive(),
})

export type PriceRange = z.infer<typeof PriceRangeSchema>

interface Accommodation {
  id: string
  name: string
  price: number
  // Otros campos según necesidad
}

interface GetAccommodationsByPriceResponse {
  success: boolean
  data?: {
    accommodations: Accommodation[]
  }
  error?: string
}

/**
 * Obtiene hospedajes filtrados por rango de precio
 *
 * @param priceRange - Rango de precios (min, max)
 * @returns Lista de hospedajes en el rango de precios especificado
 */
export async function getAccommodationsByPrice(priceRange: PriceRange): Promise<GetAccommodationsByPriceResponse> {
  try {
    // Validar rango de precios
    const validatedRange = PriceRangeSchema.parse(priceRange)

    // Verificar que min sea menor que max
    if (validatedRange.min >= validatedRange.max) {
      return {
        success: false,
        error: "El precio mínimo debe ser menor que el precio máximo",
      }
    }

    // Realizar la solicitud al backend
    const response = await fetch(
      `${getApiUrl()}/api/accommodations/by-price?min=${validatedRange.min}&max=${validatedRange.max}`,
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
        error: errorData.error || `Error al obtener hospedajes por precio: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationsByPrice:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes por precio",
    }
  }
}
