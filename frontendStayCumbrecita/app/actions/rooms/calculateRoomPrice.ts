"use server"

import { z } from "zod"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para el ID de la habitación
const roomIdSchema = z.string().min(1, "El ID de la habitación es requerido")

// Esquema de validación para las fechas
const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido. Use YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido. Use YYYY-MM-DD"),
})

// Esquema de validación para la respuesta
const responseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    total: z.number(),
    nights: z.number(),
    nightly: z.number(),
  }),
})

// Tipos para los parámetros y la respuesta
type DateRange = z.infer<typeof dateRangeSchema>
type CalculateRoomPriceResponse = z.infer<typeof responseSchema>

/**
 * Calcula el precio total de una habitación para un rango de fechas
 * @param id - ID de la habitación
 * @param dateRange - Rango de fechas (desde, hasta)
 * @returns Precio total, número de noches y precio por noche
 */
export async function calculateRoomPrice(id: string, dateRange: DateRange): Promise<CalculateRoomPriceResponse> {
  try {
    // Validar el ID de la habitación y el rango de fechas
    const validatedId = roomIdSchema.parse(id)
    const validatedDateRange = dateRangeSchema.parse(dateRange)

    // Construir la URL con los parámetros de consulta
    const url = new URL(`${getApiUrl()}/api/rooms/${validatedId}/price`)
    url.searchParams.append("from", validatedDateRange.from)
    url.searchParams.append("to", validatedDateRange.to)

    // Realizar la petición a la API
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al calcular el precio de la habitación")
    }

    // Parsear y validar la respuesta
    const data = await response.json()
    return responseSchema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.errors.map((e) => e.message).join(", ")}`)
    }

    if (error instanceof Error) {
      throw new Error(`Error al calcular el precio de la habitación: ${error.message}`)
    }

    throw new Error("Error desconocido al calcular el precio de la habitación")
  }
}
