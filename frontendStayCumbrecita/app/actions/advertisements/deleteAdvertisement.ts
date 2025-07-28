"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definir el esquema de entrada para el ID
const IdSchema = z.object({
  id: z.string(),
})

// Definir el esquema de respuesta para la eliminación
const DeleteAdvertisementResponseSchema = z.object({
  success: z.boolean(),
})

/**
 * Desactiva una promoción
 * @param id ID de la promoción a desactivar
 * @returns Resultado de la desactivación
 */
export async function deleteAdvertisement(id: string) {
  try {
    // Validar el ID
    const { id: validatedId } = IdSchema.parse({ id })

    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se ha iniciado sesión",
      }
    }

    const response = await fetch(`${getApiUrl()}/publicidad/${validatedId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Error al desactivar la promoción",
      }
    }

    const data = await response.json()
    const validatedData = DeleteAdvertisementResponseSchema.parse(data)

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error al desactivar la promoción:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al desactivar la promoción",
    }
  }
}
