"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definir el esquema de entrada para crear una publicidad
const CreateAdvertisementSchema = z.object({
  hotelId: z.string(),
  from: z.string(),
  to: z.string(),
  amount: z.string(),
  paymentMethod: z.string(),
})

// Definir el esquema de respuesta para la creación de publicidad
const CreateAdvertisementResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    id: z.string(),
    promotionActive: z.boolean(),
  }),
})

export type CreateAdvertisementInput = z.infer<typeof CreateAdvertisementSchema>

/**
 * Activa una promoción para un hospedaje
 * @param input Datos de la promoción
 * @returns Resultado de la activación
 */
export async function createAdvertisement(input: CreateAdvertisementInput) {
  try {
    // Validar los datos de entrada
    const validatedInput = CreateAdvertisementSchema.parse(input)

    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se ha iniciado sesión",
      }
    }

    const response = await fetch(`${getApiUrl()}/publicidad`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedInput),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Error al activar la promoción",
      }
    }

    const data = await response.json()
    const validatedData = CreateAdvertisementResponseSchema.parse(data)

    return {
      success: true,
      data: validatedData.data,
    }
  } catch (error) {
    console.error("Error al activar la promoción:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al activar la promoción",
    }
  }
}
