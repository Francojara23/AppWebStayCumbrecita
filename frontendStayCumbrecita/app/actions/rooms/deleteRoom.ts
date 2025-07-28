"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID de la habitación
const roomIdSchema = z.string().min(1, "El ID de la habitación es requerido")

// Esquema de validación para la respuesta
const responseSchema = z.object({
  success: z.boolean(),
})

// Tipo para la respuesta
type DeleteRoomResponse = z.infer<typeof responseSchema>

/**
 * Elimina una habitación existente
 * @param id - ID de la habitación a eliminar
 * @returns Confirmación de eliminación
 */
export async function deleteRoom(id: string): Promise<DeleteRoomResponse> {
  try {
    // Validar el ID de la habitación
    const validatedId = roomIdSchema.parse(id)

    // Realizar la petición a la API
    const response = await fetch(`${getApiUrl()}/api/rooms/${validatedId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Asumiendo que el token se guarda en localStorage
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al eliminar la habitación")
    }

    // Parsear y validar la respuesta
    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    if (error instanceof Error) {
      throw new Error(`Error al eliminar la habitación: ${error.message}`)
    }

    throw new Error("Error desconocido al eliminar la habitación")
  }
}
