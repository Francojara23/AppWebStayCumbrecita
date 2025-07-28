"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Esquema para validar los parámetros de consulta
 */
export const GetPaymentsParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  reservationId: z.string().optional(),
  status: z.enum(["pending", "completed", "failed", "refunded"]).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
})

// Tipo para los parámetros de consulta (entrada)
export type GetPaymentsParams = {
  page?: number
  limit?: number
  reservationId?: string
  status?: "pending" | "completed" | "failed" | "refunded"
  fromDate?: string
  toDate?: string
}

/**
 * Esquema para la respuesta de un pago
 */
export const PaymentSchema = z.object({
  id: z.string(),
  reservationId: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  paymentMethod: z.string(),
  transactionId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Payment = z.infer<typeof PaymentSchema>

/**
 * Esquema para la respuesta paginada de pagos
 */
export const PaymentsResponseSchema = z.object({
  data: z.array(PaymentSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
})

export type PaymentsResponse = z.infer<typeof PaymentsResponseSchema>

/**
 * Obtiene una lista paginada de pagos
 * @param params Parámetros de consulta
 * @returns Lista paginada de pagos o un error
 */
export async function getPayments(params: GetPaymentsParams = {}): Promise<{
  data: PaymentsResponse | null
  error: string | null
}> {
  try {
    // Validar los parámetros de consulta
    const validatedParams = GetPaymentsParamsSchema.parse(params)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        data: null,
        error: "No estás autenticado",
      }
    }

    // Construir la URL con los parámetros de consulta
    const apiUrl = getApiUrl()
    const queryParams = new URLSearchParams()

    queryParams.append("page", validatedParams.page.toString())
    queryParams.append("limit", validatedParams.limit.toString())

    if (validatedParams.reservationId) {
      queryParams.append("reservationId", validatedParams.reservationId)
    }

    if (validatedParams.status) {
      queryParams.append("status", validatedParams.status)
    }

    if (validatedParams.fromDate) {
      queryParams.append("fromDate", validatedParams.fromDate)
    }

    if (validatedParams.toDate) {
      queryParams.append("toDate", validatedParams.toDate)
    }

    const response = await fetch(`${apiUrl}/api/payments?${queryParams.toString()}`, {
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
        data: null,
        error: errorData.message || "Error al obtener los pagos",
      }
    }

    const paymentsData = await response.json()
    const validatedData = PaymentsResponseSchema.parse(paymentsData)

    return {
      data: validatedData,
      error: null,
    }
  } catch (error) {
    console.error("Error al obtener los pagos:", error)

    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido al obtener los pagos",
    }
  }
}
