"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

// Definir el esquema de respuesta para la lista de publicidades
const AdvertisementSchema = z.object({
  id: z.string(),
  hospedaje: z.object({
    id: z.string(),
    nombre: z.string(),
  }),
  usuario: z.object({
    id: z.string(),
    nombre: z.string(),
    apellido: z.string(),
  }),
  monto: z.string(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  estado: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// El backend devuelve directamente un array, no un objeto con success/data
const AdvertisementsResponseSchema = z.array(AdvertisementSchema)

export type Advertisement = z.infer<typeof AdvertisementSchema>

/**
 * Obtiene la lista de publicidades
 * @returns Lista de publicidades
 */
export async function getAdvertisements() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return {
        success: false,
        error: "No se ha iniciado sesión",
      }
    }

    const response = await fetch(`${getApiUrl()}/publicidad/administrar`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.error || "Error al obtener las publicidades",
      }
    }

    const data = await response.json()
    const validatedData = AdvertisementsResponseSchema.parse(data)

    return {
      success: true,
      data: {
        advertisements: validatedData,
      },
    }
  } catch (error) {
    console.error("Error al obtener las publicidades:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al obtener las publicidades",
    }
  }
}
