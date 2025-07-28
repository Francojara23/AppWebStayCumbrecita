"use server"

import { z } from "zod"
import { cookies } from "next/headers"
import { getApiUrl } from "@/lib/utils/api-urls"
import { PaymentSchema } from "./getPayments"

/**
 * Esquema para validar los datos de creación de un pago
 */
export const CreatePaymentSchema = z.object({
  reservationId: z.string(),
  amount: z.number().positive("El monto debe ser positivo"),
  currency: z.string().default("ARS"),
  paymentMethod: z.string(),
})

export type CreatePaymentData = z.infer<typeof CreatePaymentSchema>

/**
 * Crea un nuevo pago
 * @param data Datos del pago a crear
 * @returns El pago creado o un error
 */
export async function createPayment(data: CreatePaymentData): Promise<{
  data: z.infer<typeof PaymentSchema> | null
  error: string | null
}> {
  try {
    // Validar los datos de entrada
    const validatedData = CreatePaymentSchema.parse(data)

    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return {
        data: null,
        error: "No estás autenticado",
      }
    }

    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/api/payments`, {
      method: "POST",
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
        error: errorData.message || "Error al crear el pago",
      }
    }

    const paymentData = await response.json()
    const validatedResponse = PaymentSchema.parse(paymentData)

    return {
      data: validatedResponse,
      error: null,
    }
  } catch (error) {
    console.error("Error al crear el pago:", error)

    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: error.errors.map((e) => `${e.path}: ${e.message}`).join(", "),
      }
    }

    return {
      data: null,
      error: error instanceof Error ? error.message : "Error desconocido al crear el pago",
    }
  }
}
