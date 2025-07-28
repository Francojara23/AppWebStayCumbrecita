"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definición del esquema de respuesta
const ReservationSchema = z.object({
  id: z.string(),
  accommodationId: z.string(),
  accommodationName: z.string(),
  roomId: z.string(),
  roomName: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  totalPrice: z.number(),
  status: z.string(),
  createdAt: z.string(),
})

const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    reservations: z.array(ReservationSchema),
  }),
})

export type PendingReservation = z.infer<typeof ReservationSchema>

/**
 * Obtiene las reservas sin opinión del usuario actual
 * @returns Lista de reservas sin opinión
 */
export async function getPendingReservations() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró el token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/api/reviews/pending-reservations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener las reservas pendientes de opinión")
    }

    const data = await response.json()
    const validatedData = ResponseSchema.parse(data)

    return {
      success: true,
      data: validatedData.data,
    }
  } catch (error) {
    console.error("Error en getPendingReservations:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener las reservas pendientes",
    }
  }
}
