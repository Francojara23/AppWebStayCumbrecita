"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID de la habitación
const roomIdSchema = z.string().min(1, "El ID de la habitación es requerido")

// Esquema de validación para la respuesta
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    name: z.string(),
    capacity: z.number(),
    // Otros campos pueden ser añadidos según sea necesario
  }),
})

// Tipo para la respuesta
type GetRoomByIdResponse = z.infer<typeof responseSchema>

/**
 * Obtiene el detalle de una habitación específica
 * @param id - ID de la habitación
 * @returns Detalle de la habitación
 */
export async function getRoomById(id: string): Promise<GetRoomByIdResponse> {
  try {
    // Validar el ID de la habitación
    const validatedId = roomIdSchema.parse(id)

    // Realizar la petición a la API
    const response = await fetch(`${getApiUrl()}/api/rooms/${validatedId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener la habitación")
    }

    // Parsear y validar la respuesta
    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    if (error instanceof Error) {
      throw new Error(`Error al obtener la habitación: ${error.message}`)
    }

    throw new Error("Error desconocido al obtener la habitación")
  }
}
