"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para los servicios
const ServicesSchema = z.string().min(1, "Al menos un servicio es requerido")

interface Accommodation {
  id: string
  name: string
  // Otros campos según necesidad
}

interface GetAccommodationsByServicesResponse {
  success: boolean
  data?: {
    accommodations: Accommodation[]
  }
  error?: string
}

/**
 * Obtiene hospedajes filtrados por servicios
 *
 * @param services - Servicios separados por comas (ej: "wifi,piscina")
 * @returns Lista de hospedajes con los servicios especificados
 */
export async function getAccommodationsByServices(services: string): Promise<GetAccommodationsByServicesResponse> {
  try {
    // Validar servicios
    const validatedServices = ServicesSchema.parse(services)

    // Realizar la solicitud al backend
    const response = await fetch(
      `${getApiUrl()}/api/accommodations/by-services?services=${encodeURIComponent(validatedServices)}`,
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
        error: errorData.error || `Error al obtener hospedajes por servicios: ${response.status}`,
      }
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error en getAccommodationsByServices:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener hospedajes por servicios",
    }
  }
}
