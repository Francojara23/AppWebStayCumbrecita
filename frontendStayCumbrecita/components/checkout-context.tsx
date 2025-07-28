"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

// Tipos para la información de la reserva
interface Hotel {
  id: string
  name: string
  location: string
  image: string
}

interface Room {
  id: string
  name: string
  capacity: number
  amenities: string[]
}

interface Dates {
  checkIn: Date
  checkOut: Date
  nights: number
}

interface Guests {
  adults: number
  children: number
}

interface Price {
  perNight: number
  total: number
  taxes: number
  grandTotal: number
}

interface Reservation {
  hotel: Hotel
  room: Room
  dates: Dates
  guests: Guests
  price: Price
  specialRequests: string
}

// Tipo para la información personal
interface PersonalInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  dni: string
}

// Tipo para la información de pago
interface PaymentInfo {
  method: string
  cardType: string
  cardNumber: string
  cardHolder: string
  expiryMonth: string
  expiryYear: string
  cvv: string
}

// Tipo para el contexto
interface CheckoutContextType {
  reservation: Reservation
  personalInfo: PersonalInfo
  paymentInfo: PaymentInfo
  updateReservation: (data: Partial<Reservation>) => void
  updatePersonalInfo: (data: Partial<PersonalInfo>) => void
  updatePaymentInfo: (data: Partial<PaymentInfo>) => void
  confirmationCode: string | null
  setConfirmationCode: (code: string) => void
  createdReservation: any | null
  setCreatedReservation: (reserva: any) => void
}

// Crear el contexto
const CheckoutContext = createContext<CheckoutContextType | undefined>(undefined)

// Hook personalizado para usar el contexto
export function useCheckout() {
  const context = useContext(CheckoutContext)
  if (context === undefined) {
    throw new Error("useCheckout must be used within a CheckoutProvider")
  }
  return context
}

// Proveedor del contexto
export function CheckoutProvider({
  children,
  initialReservation,
  initialPersonalInfo,
  initialPaymentInfo,
}: {
  children: React.ReactNode
  initialReservation: Reservation
  initialPersonalInfo: PersonalInfo
  initialPaymentInfo: PaymentInfo
}) {
  const [reservation, setReservation] = useState<Reservation>(initialReservation)
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>(initialPersonalInfo)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>(initialPaymentInfo)
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null)
  const [createdReservation, setCreatedReservation] = useState<any | null>(null)

  // Inicializar solo una vez, no resetear cuando cambian los props iniciales
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      setReservation(initialReservation)
      setPersonalInfo(initialPersonalInfo)
      setPaymentInfo(initialPaymentInfo)
      setIsInitialized(true)
    }
  }, [initialReservation, initialPersonalInfo, initialPaymentInfo, isInitialized])

  // Solo actualizar reservation y personalInfo si hay cambios significativos
  useEffect(() => {
    if (isInitialized && initialReservation.hotel.id !== "hotel-1") {
      setReservation(initialReservation)
    }
  }, [initialReservation, isInitialized])

  useEffect(() => {
    if (isInitialized && initialPersonalInfo.email) {
      setPersonalInfo(initialPersonalInfo)
    }
  }, [initialPersonalInfo, isInitialized])

  const updateReservation = (data: Partial<Reservation>) => {
    setReservation((prev) => ({ ...prev, ...data }))
  }

  const updatePersonalInfo = (data: Partial<PersonalInfo>) => {
    setPersonalInfo((prev) => ({ ...prev, ...data }))
  }

  const updatePaymentInfo = (data: Partial<PaymentInfo>) => {
    setPaymentInfo((prev) => ({ ...prev, ...data }))
  }

  return (
    <CheckoutContext.Provider
      value={{
        reservation,
        personalInfo,
        paymentInfo,
        updateReservation,
        updatePersonalInfo,
        updatePaymentInfo,
        confirmationCode,
        setConfirmationCode,
        createdReservation,
        setCreatedReservation,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  )
}
