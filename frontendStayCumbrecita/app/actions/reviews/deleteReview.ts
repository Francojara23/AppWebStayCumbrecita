"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definición del esquema de entrada
const DeleteReviewSchema = z.object({
  id: z.string().min(1, "El ID de la opinión es requerido"),
})

// Definición del esquema de respuesta
const ResponseSchema = z.object({
  success: z.boolean(),
})

export type DeleteReviewInput = z.infer<typeof DeleteReviewSchema>

/**
 * Elimina una opinión existente
 * @param input ID de la opinión a eliminar
 * @returns Resultado de la operación
 */
export async function deleteReview(input: DeleteReviewInput) {
  try {
    // Validar los datos de entrada
    const validatedData = DeleteReviewSchema.parse(input)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró el token de autenticación")
    }

    const response = await fetch(`${getApiUrl()}/api/reviews/${validatedData.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al eliminar la opinión")
    }

    const data = await response.json()
    const validatedResponse = ResponseSchema.parse(data)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error en deleteReview:", error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al eliminar la opinión",
    }
  }
}
