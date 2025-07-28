"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { requireAuthToken } from "@/lib/utils/auth-token"
import { getApiUrl } from "@/lib/utils/api-urls"

// Esquema de validación para los parámetros de consulta
const GetPagosParamsSchema = z.object({
  usuarioId: z.string().optional(),
  hospedajeId: z.string().optional(),
  estado: z.string().optional(),
  metodo: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
})

// Tipo para los parámetros de consulta (entrada)
export type GetPagosParams = {
  usuarioId?: string
  hospedajeId?: string
  estado?: string
  metodo?: string
  fechaDesde?: string
  fechaHasta?: string
}

// Esquema de validación para la respuesta
const PagoSchema = z.object({
  id: z.string(),
  reserva: z.object({
    id: z.string(),
    hospedaje: z.object({
      nombre: z.string(),
    }).optional(),
    usuario: z.object({
      name: z.string(),
      email: z.string(),
    }).optional(),
    fechaInicio: z.string().optional(),
    fechaFin: z.string().optional(),
    montoTotal: z.number().optional(),
  }).nullable(),
  metodo: z.string(),
  estado: z.string(),
  montoReserva: z.number(),
  montoImpuestos: z.number(),
  montoTotal: z.number(),
  fechaPago: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const ResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(PagoSchema),
})

// Tipo para la respuesta
export type GetPagosResponse = z.infer<typeof ResponseSchema>

/**
 * Obtiene los pagos del sistema con opciones de filtrado
 * @param params Parámetros de consulta para filtrar los pagos
 * @returns Lista de pagos
 */
export async function getPagos(params: GetPagosParams = {}): Promise<GetPagosResponse> {
  try {
    // Validar parámetros
    const validatedParams = GetPagosParamsSchema.parse(params)

    // Construir query string
    const queryParams = new URLSearchParams()

    if (validatedParams.usuarioId) queryParams.append("usuarioId", validatedParams.usuarioId)
    if (validatedParams.hospedajeId) queryParams.append("hospedajeId", validatedParams.hospedajeId)
    if (validatedParams.estado) queryParams.append("estado", validatedParams.estado)
    if (validatedParams.metodo) queryParams.append("metodo", validatedParams.metodo)
    if (validatedParams.fechaDesde) queryParams.append("fechaDesde", validatedParams.fechaDesde)
    if (validatedParams.fechaHasta) queryParams.append("fechaHasta", validatedParams.fechaHasta)

    // Obtener token de autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      throw new Error("No se encontró token de autenticación")
    }

    // Realizar petición a la API
    const response = await fetch(`${getApiUrl()}/api/pagos?${queryParams.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Error al obtener los pagos")
    }

    const data = await response.json()

    // Validar respuesta
    return ResponseSchema.parse({
      success: true,
      data: data,
    })
  } catch (error) {
    console.error("Error en getPagos:", error)

    if (error instanceof z.ZodError) {
      throw new Error(`Error de validación: ${error.message}`)
    }

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al obtener los pagos")
  }
}

/**
 * Obtiene los pagos de los hospedajes que administra el usuario
 * Aplica filtros granulares de autorización por hospedaje
 * @returns Lista de pagos de hospedajes que el usuario puede administrar
 */
export async function getPagosForAdmin(): Promise<GetPagosResponse> {
  try {
    console.log('🔍 Obteniendo pagos para administrador...')
    
    // Obtener token de autenticación
    const token = await requireAuthToken()

    // Realizar petición al endpoint específico para administradores
    const response = await fetch(`${getApiUrl()}/pagos/administrar`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Error al obtener pagos de administrador:', errorData)
      throw new Error(errorData.error || "Error al obtener los pagos del administrador")
    }

    const data = await response.json()
    console.log('✅ Pagos de administrador obtenidos exitosamente:', data?.length || 0)
    
    // Debug: Mostrar estructura de datos del backend
    console.log('🔍 Debug - Datos completos del backend:', data)
    if (data && data.length > 0) {
      console.log('📄 Debug - Primer pago de ejemplo:', data[0])
      console.log('🏨 Debug - Hospedajes en datos del backend:', data.map((p: any) => p.reserva?.hospedaje?.nombre).filter(Boolean))
    }

    // El backend devuelve directamente el array de pagos
    return {
      success: true,
      data: data || [],
    }
  } catch (error) {
    console.error("❌ Error en getPagosForAdmin:", error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error("Error desconocido al obtener los pagos del administrador")
  }
}