"use server"

import { z } from "zod"
import { requireAuthToken } from "@/lib/utils/auth-token"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID
const IdSchema = z.string().min(1, "El ID es requerido")

// Esquema de validación para la respuesta
const ReservationSchema = z.object({
  id: z.string(),
  accommodationId: z.string(),
  roomId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number(),
  children: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  guestId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Información adicional que podría incluirse en el detalle
  accommodation: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
  room: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),
  guest: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
})

const ResponseSchema = z.object({
  success: z.boolean(),
  data: ReservationSchema,
})

// Tipo para la respuesta
export type GetReservationByIdResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene el detalle de una reserva por su ID
 * @param id ID de la reserva
 * @returns Detalle de la reserva
 */
export async function getReservationById(id: string): Promise<GetReservationByIdResponse> {
  try {
    // Validar ID
    const validatedId = IdSchema.parse(id)

    // Obtener token de autenticación
    const token = await requireAuthToken()

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/reservas/${validatedId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener la reserva")
    }

    const data = await response.json()

    // Validar respuesta
    return ResponseSchema.parse(data)
  } catch (error) {
    console.error("Error en getReservationById:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al obtener la reserva")
  }
}
