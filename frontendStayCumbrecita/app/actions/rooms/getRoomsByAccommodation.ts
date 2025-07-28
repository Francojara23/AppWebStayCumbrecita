"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID del hospedaje
const accommodationIdSchema = z.string().min(1, "El ID del hospedaje es requerido")

// Esquema de validación para la respuesta
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    rooms: z.array(z.any()),
  }),
})

// Tipo para la respuesta
type GetRoomsByAccommodationResponse = z.infer<typeof responseSchema>

/**
 * Obtiene las habitaciones de un hospedaje específico
 * @param accommodationId - ID del hospedaje
 * @returns Lista de habitaciones del hospedaje
 */
export async function getRoomsByAccommodation(accommodationId: string): Promise<GetRoomsByAccommodationResponse> {
  try {
    // Validar el ID del hospedaje
    const validatedId = accommodationIdSchema.parse(accommodationId)

    // Realizar la petición a la API
    const response = await fetch(`${getApiUrl()}/api/accommodations/${validatedId}/rooms`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener las habitaciones")
    }

    // Parsear y validar la respuesta
    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    if (error instanceof Error) {
      throw new Error(`Error al obtener las habitaciones: ${error.message}`)
    }

    throw new Error("Error desconocido al obtener las habitaciones")
  }
}
