"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definición del esquema de entrada
const UpdateReviewSchema = z
  .object({
    id: z.string().min(1, "El ID de la opinión es requerido"),
    rating: z.number().min(1).max(5).optional(),
    comment: z.string().min(1, "El comentario es requerido").optional(),
  })
  .refine((data) => data.rating !== undefined || data.comment !== undefined, {
    message: "Debe proporcionar al menos un campo para actualizar",
  })

// Definición del esquema de respuesta
const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    comment: z.string().optional(),
    rating: z.number().optional(),
  }),
})

export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>

/**
 * Actualiza una opinión existente
 * @param input Datos de la opinión a actualizar
 * @returns Resultado de la operación
 */
export async function updateReview(input: UpdateReviewInput) {
  try {
    // Validar los datos de entrada
    const validatedData = UpdateReviewSchema.parse(input)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró el token de autenticación")
    }

    // Extraer el ID y eliminar del objeto para el cuerpo de la solicitud
    const { id, ...updateData } = validatedData

    const response = await fetch(`${getApiUrl()}/api/reviews/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updateData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al actualizar la opinión")
    }

    const data = await response.json()
    const validatedResponse = ResponseSchema.parse(data)

    return {
      success: true,
      data: validatedResponse.data,
    }
  } catch (error) {
    console.error("Error en updateReview:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al actualizar la opinión",
    }
  }
}
