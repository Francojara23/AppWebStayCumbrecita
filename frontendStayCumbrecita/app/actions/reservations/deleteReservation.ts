"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID
const IdSchema = z.string().min(1, "El ID es requerido")

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean(),
})

// Tipo para la respuesta
export type DeleteReservationResponse = z.infer<typeof ResponseSchema>

/**
 * Elimina una reserva por su ID
 * @param id ID de la reserva a eliminar
 * @returns Confirmación de eliminación
 */
export async function deleteReservation(id: string): Promise<DeleteReservationResponse> {
  try {
    // Validar ID
    const validatedId = IdSchema.parse(id)

    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/api/reservations/${validatedId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al eliminar la reserva")
    }

    const data = await response.json()

    // Validar respuesta
    return ResponseSchema.parse(data)
  } catch (error) {
    console.error("Error en deleteReservation:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al eliminar la reserva")
  }
}
