"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID de la habitación
const roomIdSchema = z.string().min(1, "El ID de la habitación es requerido")

// Esquema de validación para los datos de actualización
// Todos los campos son opcionales para permitir actualizaciones parciales
const updateDataSchema = z
  .object({
    name: z.string().optional(),
    shortDescription: z.string().optional(),
    longDescription: z.string().optional(),
    type: z.string().optional(),
    capacity: z.number().int().positive().optional(),
    photos: z.array(z.string()).optional(),
    services: z.record(z.any()).optional(),
    prices: z
      .object({
        base: z.object({
          value: z.string(),
          use: z.boolean(),
        }),
      })
      .optional(),
  })
  .partial()

// Esquema de validación para la respuesta
const responseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string(),
      // Incluimos capacity como ejemplo, pero la respuesta puede contener cualquier campo actualizado
      capacity: z.number().optional(),
    })
    .passthrough(), // Permitimos campos adicionales en la respuesta
})

// Tipos para los parámetros y la respuesta
type UpdateRoomData = z.infer<typeof updateDataSchema>
type UpdateRoomResponse = z.infer<typeof responseSchema>

/**
 * Actualiza una habitación existente
 * @param id - ID de la habitación a actualizar
 * @param updateData - Datos a actualizar
 * @returns Datos actualizados de la habitación
 */
export async function updateRoom(id: string, updateData: UpdateRoomData): Promise<UpdateRoomResponse> {
  try {
    // Validar el ID de la habitación y los datos de actualización
    const validatedId = roomIdSchema.parse(id)
    const validatedData = updateDataSchema.parse(updateData)

    // Realizar la petición a la API
    const response = await fetch(`${getApiUrl()}/api/rooms/${validatedId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Asumiendo que el token se guarda en localStorage
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al actualizar la habitación")
    }

    // Parsear y validar la respuesta
    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    if (error instanceof Error) {
      throw new Error(`Error al actualizar la habitación: ${error.message}`)
    }

    throw new Error("Error desconocido al actualizar la habitación")
  }
}
