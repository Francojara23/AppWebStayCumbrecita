"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { PaymentSchema } from "./getPayments"
import { getApiUrl } from "@/lib/utils/api-urls"

/**
 * Esquema para validar los datos de actualización del estado de un pago
 */
export const UpdatePaymentStatusSchema = z.object({
  status: z.enum(["pending", "completed", "failed", "refunded"]),
  transactionId: z.string().optional(),
})

export type UpdatePaymentStatusData = z.infer<typeof UpdatePaymentStatusSchema>

/**
 * Actualiza el estado de un pago
 * @param id ID del pago
 * @param data Datos para actualizar el estado del pago
 * @returns El pago actualizado o un error
 */
export async function updatePaymentStatus(
  id: string,
  data: UpdatePaymentStatusData,
): Promise<{
  data: z.infer<typeof PaymentSchema> | null
  error: string | null
}> {
  try {
    if (!id) {
      return {
        data: null,
        error: "El ID del pago es requerido",
      }
    }

    // Validar los datos de entrada
    const validatedData = UpdatePaymentStatusSchema.parse(data)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        data: null,
        error: "No estás autenticado",
      }
    }

    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/payments/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validatedData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return {
        data: null,
        error: errorData.message || "Error al actualizar el estado del pago",
      }
    }

    const paymentData = await response.json()
    const validatedResponse = PaymentSchema.parse(paymentData)

    return {
      data: validatedResponse,
      error: null,
    }
  } catch (error) {
    console.error("Error al actualizar el estado del pago:", error)

    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido al actualizar el estado del pago",
    }
  }
}
