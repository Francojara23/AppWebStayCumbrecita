"use server"
import { getApiUrl } from "@/lib/utils/api-urls"

interface GetAccommodationTypesResponse {
  success: boolean
  data?: string[]
  error?: string
}

/**
 * Obtiene la lista de tipos de hospedaje disponibles
 *
 * @returns Lista de tipos de hospedaje
 */
export async function getAccommodationTypes(): Promise<GetAccommodationTypesResponse> {
  try {
    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodation-types`, {
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
        error: errorData.error || `Error al obtener tipos de hospedaje: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationTypes:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener tipos de hospedaje",
    }
  }
}
