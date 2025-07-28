"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"
import { cookies } from "next/headers"

// Esquema de validación para un servicio
const ServicioSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  icono: z.string().nullable().optional(),
  descripcion: z.string().nullable().optional(),
  tipo: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// Esquema de validación para la respuesta del backend (array directo)
const ResponseSchema = z.array(ServicioSchema)

// Tipos exportados
export type Servicio = z.infer<typeof ServicioSchema>
export type GetServicesByTypeResponse = {
  success: boolean
  data?: Servicio[]
  error?: string
}

/**
 * Obtiene los servicios del catálogo filtrados por tipo
 * @param tipo El tipo de servicio a filtrar (ej: "HOSPEDAJE", "HABITACION")
 * @returns Lista de servicios del tipo especificado
 */
export async function getServicesByType(tipo: string): Promise<GetServicesByTypeResponse> {
  try {
    // Validar parámetro
    if (!tipo || typeof tipo !== "string") {
      return {
        success: false,
        error: "El tipo de servicio es requerido"
      }
    }

    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se encontró token de autenticación"
      }
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/servicios/catalogo/tipo/${encodeURIComponent(tipo)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "default", // Cache por defecto para mejorar rendimiento
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Error desconocido" }))
      return {
        success: false,
        error: errorData.message || `Error ${response.status}: ${response.statusText}`
      }
    }

    const data = await response.json()

    // Validar respuesta
    const validatedData = ResponseSchema.parse(data)

    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    console.error("Error en getServicesByType:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Error de validación: ${error.message}`
      }
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    }

    return {
      success: false,
      error: "Error desconocido al obtener los servicios"
    }
  }
} 