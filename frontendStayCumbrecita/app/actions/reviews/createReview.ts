"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definición del esquema de entrada
const CreateReviewSchema = z.object({
  reservationId: z.string().min(1, "El ID de la reserva es requerido"),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1, "El comentario es requerido"),
})

// Definición del esquema de respuesta
const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    rating: z.number(),
  }),
})

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>

/**
 * Crea una nueva opinión para una reserva
 * @param input Datos de la opinión a crear
 * @returns Resultado de la operación
 */
export async function createReview(input: CreateReviewInput) {
  try {
    // Validar los datos de entrada
    const validatedData = CreateReviewSchema.parse(input)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró el token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/api/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al crear la opinión")
    }

    const data = await response.json()
    const validatedResponse = ResponseSchema.parse(data)

    return {
      success: true,
      data: validatedResponse.data,
    }
  } catch (error) {
    console.error("Error en createReview:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear la opinión",
    }
  }
}
