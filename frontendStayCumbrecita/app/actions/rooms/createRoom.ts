"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID del hospedaje
const accommodationIdSchema = z.string().min(1, "El ID del hospedaje es requerido")

// Esquema de validación para los datos de la habitación
const roomDataSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  shortDescription: z.string(),
  longDescription: z.string(),
  type: z.string(),
  capacity: z.number().int().positive(),
  photos: z.array(z.string()),
  services: z.record(z.any()),
  prices: z.object({
    base: z.object({
      value: z.string(),
      use: z.boolean(),
    }),
  }),
})

// Esquema de validación para la respuesta
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    price: z.number(),
  }),
})

// Tipos para los parámetros y la respuesta
type CreateRoomData = z.infer<typeof roomDataSchema>
type CreateRoomResponse = z.infer<typeof responseSchema>

/**
 * Crea una nueva habitación para un hospedaje específico
 * @param accommodationId - ID del hospedaje
 * @param roomData - Datos de la habitación a crear
 * @returns Datos de la habitación creada
 */
export async function createRoom(accommodationId: string, roomData: CreateRoomData): Promise<CreateRoomResponse> {
  try {
    // Validar el ID del hospedaje y los datos de la habitación
    const validatedId = accommodationIdSchema.parse(accommodationId)
    const validatedData = roomDataSchema.parse(roomData)

    // Realizar la petición a la API
    const response = await fetch(`${getApiUrl()}/api/accommodations/${validatedId}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`, // Asumiendo que el token se guarda en localStorage
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al crear la habitación")
    }

    // Parsear y validar la respuesta
    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    if (error instanceof Error) {
      throw new Error(`Error al crear la habitación: ${error.message}`)
    }

    throw new Error("Error desconocido al crear la habitación")
  }
}
