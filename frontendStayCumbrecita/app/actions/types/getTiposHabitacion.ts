"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para un tipo de habitación
const TipoHabitacionSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable().optional(),
  capacidadMaxima: z.number().optional(),
  activo: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// Esquema de validación para la respuesta
const ResponseSchema = z.array(TipoHabitacionSchema)

// Tipos exportados
export type TipoHabitacion = z.infer<typeof TipoHabitacionSchema>
export type GetTiposHabitacionResponse = {
  success: boolean
  data?: TipoHabitacion[]
  error?: string
}

/**
 * Obtiene todos los tipos de habitación disponibles
 * @returns Lista de tipos de habitación
 */
export async function getTiposHabitacion(): Promise<GetTiposHabitacionResponse> {
  try {
    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/tipos-habitacion`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "default", // Los tipos de habitación cambian raramente, podemos usar cache
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
    console.error("Error en getTiposHabitacion:", error)

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
      error: "Error desconocido al obtener los tipos de habitación"
    }
  }
} 