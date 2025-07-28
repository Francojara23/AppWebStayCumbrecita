"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID
const IdSchema = z.string().min(1, "El ID es requerido")

interface GetAccommodationServicesResponse {
  success: boolean
  data?: {
    services: string[]
  }
  error?: string
}

/**
 * Obtiene los servicios de un hospedaje por su ID
 *
 * @param id - ID del hospedaje
 * @returns Lista de servicios del hospedaje
 */
export async function getAccommodationServices(id: string): Promise<GetAccommodationServicesResponse> {
  try {
    // Validar ID
    const validatedId = IdSchema.parse(id)

    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations/${validatedId}/services`, {
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
        error: errorData.error || `Error al obtener servicios del hospedaje: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationServices:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener servicios del hospedaje",
    }
  }
}
