"use server"

import { z } from "zod"
import { requireAuthToken } from "@/lib/utils/auth-token"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para los parámetros de consulta
const GetReservationsParamsSchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  status: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accommodationId: z.string().optional(),
})

// Tipo para los parámetros de consulta (entrada)
export type GetReservationsParams = {
  page?: number
  limit?: number
  status?: string
  startDate?: string
  endDate?: string
  accommodationId?: string
}

// Esquema de validación para la respuesta
const ReservationSchema = z.object({
  id: z.string(),
  accommodationId: z.string(),
  roomId: z.string(),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number(),
  children: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  guestId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    reservations: z.array(ReservationSchema),
    total: z.number(),
  }),
})

// Tipo para la respuesta
export type GetReservationsResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene una lista paginada de reservas con opciones de filtrado
 * @param params Parámetros de consulta para filtrar y paginar las reservas
 * @returns Lista paginada de reservas y total de registros
 */
export async function getReservations(params: GetReservationsParams = {}): Promise<GetReservationsResponse> {
  try {
    // Validar parámetros
    const validatedParams = GetReservationsParamsSchema.parse(params)

    // Obtener token de autenticación
    const token = await requireAuthToken()

    // Construir URL con parámetros
    const queryParams = new URLSearchParams()
    if (validatedParams.page) queryParams.append("page", validatedParams.page.toString())
    if (validatedParams.limit) queryParams.append("limit", validatedParams.limit.toString())
    if (validatedParams.status) queryParams.append("status", validatedParams.status)
    if (validatedParams.startDate) queryParams.append("start_date", validatedParams.startDate)
    if (validatedParams.endDate) queryParams.append("end_date", validatedParams.endDate)
    if (validatedParams.accommodationId) queryParams.append("accommodation_id", validatedParams.accommodationId)
    
    const url = `${getApiUrl()}/reservas?${queryParams.toString()}`

    // Realizar petición a la API
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener las reservas")
    }

    const data = await response.json()

    // Validar respuesta
    return ResponseSchema.parse(data)
  } catch (error) {
    console.error("Error en getReservations:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al obtener las reservas")
  }
}

/**
 * Obtiene las reservas de los hospedajes que administra el usuario
 * Aplica filtros granulares de autorización por hospedaje
 * @returns Lista de reservas de hospedajes que el usuario puede administrar
 */
export async function getReservationsForAdmin(): Promise<GetReservationsResponse> {
  try {
    console.log('🔍 Obteniendo reservas para administrador...')
    
    // Obtener token de autenticación
    const token = await requireAuthToken()

    // Realizar petición al endpoint específico para administradores
    const response = await fetch(`${getApiUrl()}/reservas/administrar`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Error al obtener reservas de administrador:', errorData)
      throw new Error(errorData.error || "Error al obtener las reservas del administrador")
    }

    const data = await response.json()
    console.log('✅ Reservas de administrador obtenidas exitosamente:', data?.length || 0)

    // Transformar la respuesta para que coincida con el esquema esperado
    // El backend devuelve directamente el array de reservas
    return {
      success: true,
      data: {
        reservations: data || [],
        total: data?.length || 0,
      }
    }
  } catch (error) {
    console.error("❌ Error en getReservationsForAdmin:", error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al obtener las reservas del administrador")
  }
}
