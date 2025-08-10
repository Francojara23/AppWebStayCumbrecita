// Tipos para el sistema de check-in

export interface HuespedCheckin {
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string
}

export interface HabitacionCheckin {
  id: string
  nombre: string
  capacidad: number
  personasReservadas: number
  huespedes: HuespedCheckin[]
}

export interface ReservaCheckin {
  id: string
  codigo: string
  hospedaje: string
  fechaInicio: Date
  fechaFin: Date
}

export interface TitularCheckin {
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string
}

export interface PagoExistente {
  id: string
  titular: string
  numeroMasked: string
  entidad: string
}

export interface DatosCheckinResponse {
  reserva: ReservaCheckin
  titular: TitularCheckin
  habitaciones: HabitacionCheckin[]
  pagoExistente?: PagoExistente
}

export interface TarjetaNueva {
  titular: string
  numero: string
  entidad: string
  vencimiento: string
  cve: string
  tipo: 'CREDITO' | 'DEBITO'
}

export interface DatosPagoCheckin {
  usarPagoExistente: boolean
  pagoExistenteId?: string
  nuevaTarjeta?: TarjetaNueva
}

export interface CheckinCompletoData {
  reservaId: string
  qrData: string
  huespedesPorHabitacion: HabitacionCheckin[]
  datosPago: DatosPagoCheckin
}

export interface CheckinResult {
  success: boolean
  message: string
  reservaId: string
  codigo: string
}

// Tipos para el QR Scanner
export interface QrScanResult {
  qrValido: boolean
  reserva?: {
    id: string
    codigo: string
    hospedaje: string
    fechaInicio: Date
    fechaFin: Date
    turista: {
      nombre: string
      apellido: string
      email: string
      telefono?: string
      dni?: string
    }
    habitaciones: Array<{
      nombre: string
      personas: number
    }>
    totalHuespedes: number
    huespedesAdicionales: number
  }
}