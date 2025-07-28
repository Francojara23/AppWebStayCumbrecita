"use server"

import { getApiUrl } from "@/lib/utils/api-urls"

interface Accommodation {
  id: string
  name: string
  // Otros campos según necesidad
}

interface GetAccommodationsWithAdvertisementResponse {
  success: boolean
  data?: {
    accommodations: Accommodation[]
  }
  error?: string
}

/**
 * Obtiene hospedajes con publicidad activa
 *
 * @returns Lista de hospedajes con publicidad activa
 */
export async function getAccommodationsWithAdvertisement(): Promise<GetAccommodationsWithAdvertisementResponse> {
  try {
    // Realizar la solicitud al backend
    const response = await fetch(`${getApiUrl()}/api/accommodations/with-advertisement`, {
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
        error: errorData.error || `Error al obtener hospedajes con publicidad: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationsWithAdvertisement:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes con publicidad",
    }
  }
}
