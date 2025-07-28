"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID
const IdSchema = z.string().min(1, "El ID es requerido")

// Tipo para la respuesta
interface Accommodation {
  id: string
  name: string
  type: string
  status: string
  // Otros campos según necesidad
}

interface GetAccommodationByIdResponse {
  success: boolean
  data?: {
    id: string
    name: string
    type: string
    status: string
    // Otros campos según necesidad
  }
  error?: string
}

/**
 * Obtiene el detalle de un hospedaje por su ID
 *
 * @param id - ID del hospedaje
 * @returns Detalle del hospedaje
 */
export async function getAccommodationById(id: string): Promise<GetAccommodationByIdResponse> {
  try {
    // Validar ID
    const validatedId = IdSchema.parse(id)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations/${validatedId}`, {
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
        error: errorData.error || `Error al obtener el hospedaje: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationById:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener el hospedaje",
    }
  }
}
