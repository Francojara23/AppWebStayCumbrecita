import { useState } from 'react'
import { getApiUrl } from '@/lib/utils/api-urls'

interface CreateReservaData {
  hospedajeId: string
  fechaInicio: string
  fechaFin: string
  lineas: Array<{
    habitacionId: string
    personas: number
  }>
  observacion?: string
  acompaniantes?: Array<{
    nombre: string
    apellido: string
    dni: string
    telefono?: string
  }>
}

interface CreatePagoData {
  reservaId?: string // Opcional para permitir crear pago sin reserva
  metodo: 'TARJETA' | 'TRANSFERENCIA'
  montoReserva?: number
  montoImpuestos?: number
  montoTotal?: number
  tarjeta?: {
    numero: string
    titular: string
    vencimiento: string
    cve: string
    tipo: 'CREDITO' | 'DEBITO'
    entidad: string
  }
}

export function useReservasPago() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const procesarPagoYCrearReserva = async (
    reservaData: CreateReservaData,
    pagoData: Omit<CreatePagoData, 'reservaId'>,
    montos: { montoReserva: number, montoImpuestos: number, montoTotal: number }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1]

      // 1. PRIMERO: Validar el pago sin crear reserva
      const pagoSinReserva: CreatePagoData = {
        ...pagoData,
        ...montos,
        // No incluir reservaId para validar pago independientemente
      }

      const pagoResponse = await fetch(`${getApiUrl()}/pagos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        credentials: 'include',
        body: JSON.stringify(pagoSinReserva),
      })

      if (!pagoResponse.ok) {
        const errorData = await pagoResponse.json()
        throw new Error(errorData.message || 'Pago rechazado: ' + (errorData.message || 'Datos de tarjeta inválidos'))
      }

      const pago = await pagoResponse.json()

      // 2. SOLO SI EL PAGO ES EXITOSO: Crear la reserva CON DATOS REALES DEL PAGO
      if (pago.estado === 'APROBADO' || pago.estado === 'PROCESANDO') {
        const reservaConDatosPago = {
          ...reservaData,
          pagoId: pago.id,
          // Convertir explícitamente a números para evitar errores de validación
          montoRealPago: Number(pago.montoReserva),
          impuestosRealPago: Number(pago.montoImpuestos),
          totalRealPago: Number(pago.montoTotal),
          estadoPago: pago.estado
        };

        console.log('💳 Datos del pago obtenido:', {
          id: pago.id,
          estado: pago.estado,
          montoReserva: pago.montoReserva,
          montoImpuestos: pago.montoImpuestos,
          montoTotal: pago.montoTotal
        });

        console.log('🏨 Datos que se enviarán para crear la reserva:', reservaConDatosPago);

        const reservaResponse = await fetch(`${getApiUrl()}/reservas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          credentials: 'include',
          body: JSON.stringify(reservaConDatosPago),
        })

        if (!reservaResponse.ok) {
          const errorData = await reservaResponse.json()
          // Si falla la reserva después de pago exitoso, necesitamos manejar esto
          console.error('Error creando reserva después de pago exitoso:', errorData)
          throw new Error('Error al crear la reserva: ' + (errorData.message || 'Error del servidor'))
        }

        const reserva = await reservaResponse.json()

        // 3. Actualizar el pago para asociarlo con la reserva recién creada
        const updatePagoResponse = await fetch(
          `${getApiUrl()}/pagos/${pago.id}/reserva/${reserva.id}`, 
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            credentials: 'include',
          }
        )

        if (!updatePagoResponse.ok) {
          console.warn('Advertencia: No se pudo asociar el pago con la reserva, pero ambos fueron creados exitosamente')
        } else {
          const pagoActualizado = await updatePagoResponse.json()
          console.log('✅ Pago asociado exitosamente con la reserva')
        }

        return {
          reserva,
          pago,
          success: true
        }
      } else {
        throw new Error('El pago no fue aprobado')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return {
    procesarPagoYCrearReserva,
    isLoading,
    error
  }
} 