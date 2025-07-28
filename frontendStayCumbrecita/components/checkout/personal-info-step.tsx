"use client"

import type React from "react"

import { useState } from "react"
import { useCheckout } from "@/components/checkout-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { format } from "date-fns"

interface PersonalInfoStepProps {
  onNext: () => void
  onPrev: () => void
}

export default function PersonalInfoStep({ onNext, onPrev }: PersonalInfoStepProps) {
  const { personalInfo, updatePersonalInfo, reservation } = useCheckout()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updatePersonalInfo({ [name]: value })

    // Limpiar error cuando el usuario escribe
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!personalInfo.firstName.trim()) {
      newErrors.firstName = "El nombre es obligatorio"
    }

    if (!personalInfo.lastName.trim()) {
      newErrors.lastName = "El apellido es obligatorio"
    }

    if (!personalInfo.email.trim()) {
      newErrors.email = "El email es obligatorio"
    } else if (!/\S+@\S+\.\S+/.test(personalInfo.email)) {
      newErrors.email = "El email no es válido"
    }

    if (!personalInfo.phone.trim()) {
      newErrors.phone = "El teléfono es obligatorio"
    }

    if (!personalInfo.dni.trim()) {
      newErrors.dni = "El DNI es obligatorio"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = () => {
    if (validateForm()) {
      onNext()
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Datos personales</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="firstName" className="mb-1 block">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={personalInfo.firstName}
                onChange={handleChange}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <Label htmlFor="lastName" className="mb-1 block">
                Apellido <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={personalInfo.lastName}
                onChange={handleChange}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>

            <div>
              <Label htmlFor="email" className="mb-1 block">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={personalInfo.email}
                onChange={handleChange}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1 block">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                value={personalInfo.phone}
                onChange={handleChange}
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <Label htmlFor="dni" className="mb-1 block">
                DNI <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dni"
                name="dni"
                value={personalInfo.dni}
                onChange={handleChange}
                className={errors.dni ? "border-red-500" : ""}
              />
              {errors.dni && <p className="text-red-500 text-sm mt-1">{errors.dni}</p>}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onPrev}>
              Atrás
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleContinue}>
              Continuar
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:col-span-1">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resumen de la reserva</h2>

            <div className="mb-4">
              <h3 className="font-medium">{reservation.hotel.name}</h3>
              <p className="text-sm text-gray-600">{reservation.hotel.location}</p>
            </div>

            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span>Check-in</span>
                <span className="font-medium">{format(reservation.dates.checkIn, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-out</span>
                <span className="font-medium">{format(reservation.dates.checkOut, "dd/MM/yyyy")}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span>
                  Precio por {reservation.dates.nights} {reservation.dates.nights === 1 ? 'noche' : 'noches'}
                </span>
                <span>${reservation.price.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuestos y tasas</span>
                <span>${reservation.price.taxes.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-600">${reservation.price.grandTotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
