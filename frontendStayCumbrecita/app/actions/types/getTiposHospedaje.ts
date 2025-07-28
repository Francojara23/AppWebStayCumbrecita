"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para un tipo de hospedaje
const TipoHospedajeSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// Esquema de validación para la respuesta
const ResponseSchema = z.array(TipoHospedajeSchema)

// Tipos exportados
export type TipoHospedaje = z.infer<typeof TipoHospedajeSchema>
export type GetTiposHospedajeResponse = {
  success: boolean
  data?: TipoHospedaje[]
  error?: string
}

/**
 * Obtiene todos los tipos de hospedaje disponibles
 * @returns Lista de tipos de hospedaje
 */
export async function getTiposHospedaje(): Promise<GetTiposHospedajeResponse> {
  try {
    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/tipos-hospedaje`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "default", // Los tipos de hospedaje cambian raramente, podemos usar cache
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
    console.error("Error en getTiposHospedaje:", error)

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
      error: "Error desconocido al obtener los tipos de hospedaje"
    }
  }
} 