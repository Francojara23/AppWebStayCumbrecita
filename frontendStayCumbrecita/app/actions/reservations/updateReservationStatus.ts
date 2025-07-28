"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID
const IdSchema = z.string().min(1, "El ID es requerido")

// Esquema de validación para el estado
const StatusSchema = z.object({
  status: z.enum(["Pendiente", "Confirmada", "Cancelada", "Completada"], {
    errorMap: () => ({ message: "Estado no válido" }),
  }),
})

// Tipo para los datos de actualización
export type UpdateReservationStatusData = z.infer<typeof StatusSchema>

// Esquema de validación para la respuesta
const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    status: z.string(),
  }),
})

// Tipo para la respuesta
export type UpdateReservationStatusResponse = z.infer<typeof ResponseSchema>

/**
 * Actualiza el estado de una reserva
 * @param id ID de la reserva
 * @param data Datos de actualización (estado)
 * @returns Información de la reserva actualizada
 */
export async function updateReservationStatus(
  id: string,
  data: UpdateReservationStatusData,
): Promise<UpdateReservationStatusResponse> {
  try {
    // Validar ID y datos
    const validatedId = IdSchema.parse(id)
    const validatedData = StatusSchema.parse(data)

    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/api/reservations/${validatedId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al actualizar el estado de la reserva")
    }

    const responseData = await response.json()

    // Validar respuesta
    return ResponseSchema.parse(responseData)
  } catch (error) {
    console.error("Error en updateReservationStatus:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al actualizar el estado de la reserva")
  }
}
