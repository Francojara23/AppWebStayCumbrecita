"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para los datos de la reserva
const CreateReservationSchema = z.object({
  accommodationId: z.string().min(1, "El ID del hospedaje es requerido"),
  roomId: z.string().min(1, "El ID de la habitación es requerido"),
  checkIn: z.string().min(1, "La fecha de entrada es requerida"),
  checkOut: z.string().min(1, "La fecha de salida es requerida"),
  adults: z.number().min(1, "Se requiere al menos 1 adulto"),
  children: z.number().min(0, "El número de niños no puede ser negativo"),
  guestId: z.string().optional(), // Opcional si el usuario está autenticado
  totalAmount: z.number().min(0, "El monto total no puede ser negativo"),
})

// Tipo para los datos de la reserva
export type CreateReservationData = z.infer<typeof CreateReservationSchema>

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    status: z.string(),
  }),
})

// Tipo para la respuesta
export type CreateReservationResponse = z.infer<typeof ResponseSchema>

/**
 * Crea una nueva reserva
 * @param data Datos de la reserva a crear
 * @returns Información de la reserva creada
 */
export async function createReservation(data: CreateReservationData): Promise<CreateReservationResponse> {
  try {
    // Validar datos
    const validatedData = CreateReservationSchema.parse(data)

    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/api/reservations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al crear la reserva")
    }

    const responseData = await response.json()

    // Validar respuesta
    return ResponseSchema.parse(responseData)
  } catch (error) {
    console.error("Error en createReservation:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al crear la reserva")
  }
}
