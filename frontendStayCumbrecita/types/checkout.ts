// Tipos para el proceso de checkout

export enum ConceptoCargo {
  FRIGOBAR = 'FRIGOBAR',
  DANOS_HABITACION = 'DAÑOS_HABITACION',
  SERVICIO_HABITACION = 'SERVICIO_HABITACION',
  LAVANDERIA = 'LAVANDERIA',
  OTROS = 'OTROS'
}

export interface CargoAdicional {
  concepto: ConceptoCargo
  monto: number
  descripcion?: string
}

export interface HuespedCheckout {
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string
}

export interface HabitacionCheckout {
  id: string
  nombre: string
  capacidad: number
  personasRegistradas: number
  huespedes: HuespedCheckout[]
}

export interface PagoExistenteCheckout {
  id: string
  concepto: string
  monto: number
  estado: string
  fechaPago: Date
  titularMasked?: string
  numeroMasked?: string
}

export interface ReservaCheckout {
  id: string
  codigo: string
  hospedaje: string
  fechaInicio: Date
  fechaFin: Date
  fechaCheckin: Date
  estado: string
  observaciones?: string
}

export interface TitularCheckout {
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string
}

export interface DatosCheckout {
  reserva: ReservaCheckout
  titular: TitularCheckout
  habitaciones: HabitacionCheckout[]
  pagos: PagoExistenteCheckout[]
  totalNoches: number
  totalHuespedes: number
}

export interface CheckoutCompletoData {
  cargosAdicionales?: CargoAdicional[]
  observaciones?: string
}

export interface CheckoutResult {
  success: boolean
  message: string
  reservaId: string
  codigo: string
  cargosAdicionales: number
  montoTotal: number
}

// Constantes para los conceptos predefinidos
export const CONCEPTOS_PREDEFINIDOS = [
  { value: ConceptoCargo.FRIGOBAR, label: 'Frigobar', icon: '🧊' },
  { value: ConceptoCargo.DANOS_HABITACION, label: 'Daños habitación', icon: '🔧' },
  { value: ConceptoCargo.SERVICIO_HABITACION, label: 'Servicio a la habitación', icon: '🛎️' },
  { value: ConceptoCargo.LAVANDERIA, label: 'Lavandería', icon: '👕' },
  { value: ConceptoCargo.OTROS, label: 'Otros', icon: '📋' }
] as const