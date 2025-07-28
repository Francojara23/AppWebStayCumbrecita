"use server"

import { z } from "zod"
import { cookies } from "next/headers"

// Esquema de validación para los parámetros de consulta
const GetPublicidadParamsSchema = z.object({
  usuarioId: z.string().optional(),
  hospedajeId: z.string().optional(),
  activas: z.boolean().optional(),
})

// Tipo para los parámetros de consulta (entrada)
export type GetPublicidadParams = {
  usuarioId?: string
  hospedajeId?: string
  activas?: boolean
}

// Esquema de validación para la respuesta
const PublicidadSchema = z.object({
  id: z.string(),
  hospedaje: z.object({
    id: z.string(),
    nombre: z.string(),
  }),
  usuario: z.object({
    id: z.string(),
    name: z.string(),
  }),
  monto: z.number(),
  fechaInicio: z.string(),
  fechaFin: z.string(),
  estado: z.string(),
  renovacionAutomatica: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PublicidadSchema),
})

// Tipo para la respuesta
export type GetPublicidadResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene las publicidades del sistema con opciones de filtrado
 * @param params Parámetros de consulta para filtrar las publicidades
 * @returns Lista de publicidades
 */
export async function getPublicidad(params: GetPublicidadParams = {}): Promise<GetPublicidadResponse> {
  try {
    // Validar parámetros
    const validatedParams = GetPublicidadParamsSchema.parse(params)

    // Construir query string
    const queryParams = new URLSearchParams()

    if (validatedParams.usuarioId) queryParams.append("usuarioId", validatedParams.usuarioId)
    if (validatedParams.hospedajeId) queryParams.append("hospedajeId", validatedParams.hospedajeId)
    if (validatedParams.activas !== undefined) queryParams.append("activas", validatedParams.activas.toString())

    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    // Realizar petición a la API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/publicidad?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener las publicidades")
    }

    const data = await response.json()

    // Validar respuesta
    return ResponseSchema.parse({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error("Error en getPublicidad:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al obtener las publicidades")
  }
} 