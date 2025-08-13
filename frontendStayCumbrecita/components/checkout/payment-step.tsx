"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useCheckout } from "@/components/checkout-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { CreditCard, Wallet, Building, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaymentStepProps {
  onNext: () => void
  onPrev: () => void
  isLoading: boolean
}

export default function PaymentStep({ onNext, onPrev, isLoading }: PaymentStepProps) {
  const { paymentInfo, updatePaymentInfo, reservation } = useCheckout()
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentInfo.method || "credit-card")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sincronizar el estado local con el contexto al montar el componente
  useEffect(() => {
    if (paymentInfo.method) {
      setPaymentMethod(paymentInfo.method)
    } else {
      // Solo establecer valor por defecto si no hay método seleccionado
      const defaultMethod = "credit-card"
      updatePaymentInfo({ method: defaultMethod })
      setPaymentMethod(defaultMethod)
    }
  }, []) // Solo ejecutar al montar

  // Generar años para la fecha de expiración
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => (currentYear + i).toString())

  // Generar meses para la fecha de expiración
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value)
    updatePaymentInfo({ method: value })

    // Limpiar errores al cambiar de método de pago
    setErrors({})
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    updatePaymentInfo({ [name]: value })

    // Limpiar error cuando el usuario escribe
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    updatePaymentInfo({ [name]: value })

    // Limpiar error cuando el usuario selecciona
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (paymentMethod === "credit-card" || paymentMethod === "debit-card") {
      if (!paymentInfo.cardType) {
        newErrors.cardType = "Seleccione el tipo de tarjeta"
      }

      if (!paymentInfo.cardNumber) {
        newErrors.cardNumber = "El número de tarjeta es obligatorio"
      } else if (!/^\d{15,16}$/.test(paymentInfo.cardNumber)) {
        newErrors.cardNumber = "El número de tarjeta debe tener entre 15 y 16 dígitos"
      }

      if (!paymentInfo.cardHolder) {
        newErrors.cardHolder = "El nombre del titular es obligatorio"
      }

      if (!paymentInfo.expiryMonth) {
        newErrors.expiryMonth = "Seleccione el mes de expiración"
      }

      if (!paymentInfo.expiryYear) {
        newErrors.expiryYear = "Seleccione el año de expiración"
      }

      if (!paymentInfo.cvv) {
        newErrors.cvv = "El código de seguridad es obligatorio"
      } else if (!/^\d{3,4}$/.test(paymentInfo.cvv)) {
        newErrors.cvv = "El código de seguridad debe tener entre 3 y 4 dígitos"
      }
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
          <h2 className="text-xl font-semibold mb-4">Método de pago</h2>

          <Tabs value={paymentMethod} onValueChange={handlePaymentMethodChange}>
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="credit-card" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Tarjeta de crédito</span>
                <span className="sm:hidden">Crédito</span>
              </TabsTrigger>
              <TabsTrigger value="debit-card" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Tarjeta de débito</span>
                <span className="sm:hidden">Débito</span>
              </TabsTrigger>
              <TabsTrigger value="transfer" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">Transferencia</span>
                <span className="sm:hidden">Transfer.</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="credit-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="cardType" className="mb-1 block">
                    Tipo de tarjeta <span className="text-red-500">*</span>
                  </Label>
                  <Select value={paymentInfo.cardType} onValueChange={(value) => handleSelectChange("cardType", value)}>
                    <SelectTrigger id="cardType" className={errors.cardType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISA">Visa</SelectItem>
                      <SelectItem value="MASTERCARD">Mastercard</SelectItem>
                      <SelectItem value="AMERICAN_EXPRESS">American Express</SelectItem>
                      <SelectItem value="DINERS">Diners Club</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.cardType && <p className="text-red-500 text-sm mt-1">{errors.cardType}</p>}
                </div>

                <div>
                  <Label htmlFor="cardNumber" className="mb-1 block">
                    Número de tarjeta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    value={paymentInfo.cardNumber}
                    onChange={handleInputChange}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className={errors.cardNumber ? "border-red-500" : ""}
                    maxLength={16}
                  />
                  {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                </div>

                <div>
                  <Label htmlFor="cardHolder" className="mb-1 block">
                    Titular de la tarjeta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cardHolder"
                    name="cardHolder"
                    value={paymentInfo.cardHolder}
                    onChange={handleInputChange}
                    placeholder="Nombre como aparece en la tarjeta"
                    className={errors.cardHolder ? "border-red-500" : ""}
                  />
                  {errors.cardHolder && <p className="text-red-500 text-sm mt-1">{errors.cardHolder}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate" className="mb-1 block">
                      Fecha de expiración <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={paymentInfo.expiryMonth}
                        onValueChange={(value) => handleSelectChange("expiryMonth", value)}
                      >
                        <SelectTrigger id="expiryMonth" className={errors.expiryMonth ? "border-red-500" : ""}>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={paymentInfo.expiryYear}
                        onValueChange={(value) => handleSelectChange("expiryYear", value)}
                      >
                        <SelectTrigger id="expiryYear" className={errors.expiryYear ? "border-red-500" : ""}>
                          <SelectValue placeholder="AAAA" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(errors.expiryMonth || errors.expiryYear) && (
                      <p className="text-red-500 text-sm mt-1">{errors.expiryMonth || errors.expiryYear}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cvv" className="mb-1 block">
                      Código de seguridad <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cvv"
                      name="cvv"
                      value={paymentInfo.cvv}
                      onChange={handleInputChange}
                      placeholder="CVV"
                      className={errors.cvv ? "border-red-500" : ""}
                      maxLength={4}
                    />
                    {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="debit-card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <Label htmlFor="cardType" className="mb-1 block">
                    Tipo de tarjeta <span className="text-red-500">*</span>
                  </Label>
                  <Select value={paymentInfo.cardType} onValueChange={(value) => handleSelectChange("cardType", value)}>
                    <SelectTrigger id="cardType" className={errors.cardType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISA">Visa Débito</SelectItem>
                      <SelectItem value="MASTERCARD">Mastercard Débito</SelectItem>
                      <SelectItem value="MAESTRO">Maestro</SelectItem>
                      <SelectItem value="CABAL">Cabal</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.cardType && <p className="text-red-500 text-sm mt-1">{errors.cardType}</p>}
                </div>

                <div>
                  <Label htmlFor="cardNumber" className="mb-1 block">
                    Número de tarjeta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cardNumber"
                    name="cardNumber"
                    value={paymentInfo.cardNumber}
                    onChange={handleInputChange}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className={errors.cardNumber ? "border-red-500" : ""}
                    maxLength={16}
                  />
                  {errors.cardNumber && <p className="text-red-500 text-sm mt-1">{errors.cardNumber}</p>}
                </div>

                <div>
                  <Label htmlFor="cardHolder" className="mb-1 block">
                    Titular de la tarjeta <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cardHolder"
                    name="cardHolder"
                    value={paymentInfo.cardHolder}
                    onChange={handleInputChange}
                    placeholder="Nombre como aparece en la tarjeta"
                    className={errors.cardHolder ? "border-red-500" : ""}
                  />
                  {errors.cardHolder && <p className="text-red-500 text-sm mt-1">{errors.cardHolder}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate" className="mb-1 block">
                      Fecha de expiración <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <Select
                        value={paymentInfo.expiryMonth}
                        onValueChange={(value) => handleSelectChange("expiryMonth", value)}
                      >
                        <SelectTrigger id="expiryMonth" className={errors.expiryMonth ? "border-red-500" : ""}>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={paymentInfo.expiryYear}
                        onValueChange={(value) => handleSelectChange("expiryYear", value)}
                      >
                        <SelectTrigger id="expiryYear" className={errors.expiryYear ? "border-red-500" : ""}>
                          <SelectValue placeholder="AAAA" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(errors.expiryMonth || errors.expiryYear) && (
                      <p className="text-red-500 text-sm mt-1">{errors.expiryMonth || errors.expiryYear}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cvv" className="mb-1 block">
                      Código de seguridad <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cvv"
                      name="cvv"
                      value={paymentInfo.cvv}
                      onChange={handleInputChange}
                      placeholder="CVV"
                      className={errors.cvv ? "border-red-500" : ""}
                      maxLength={4}
                    />
                    {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="transfer">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
                <h3 className="font-medium mb-4">Datos para transferencia bancaria</h3>
                <div className="space-y-2">
                  <p>
                    <strong>Banco:</strong> Banco Nacional
                  </p>
                  <p>
                    <strong>Titular:</strong> Capturecita S.A.
                  </p>
                  <p>
                    <strong>CUIT:</strong> 30-12345678-9
                  </p>
                  <p>
                    <strong>CBU:</strong> 0110012345678901234567
                  </p>
                  <p>
                    <strong>Alias:</strong> CAPTURECITA.HOTEL
                  </p>
                </div>
                <div className="mt-6 bg-orange-50 p-4 rounded-md border border-orange-200">
                  <p className="text-orange-700 text-sm">
                    <strong>Importante:</strong> Una vez realizada la transferencia, envíe el comprobante a
                    <a href="mailto:pagos@capturecita.com" className="text-orange-600 underline ml-1">
                      pagos@capturecita.com
                    </a>
                  </p>
                </div>
              </div>
            </TabsContent>


          </Tabs>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={onPrev}>
              Atrás
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleContinue} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Continuar"
              )}
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
                <span>Impuestos y cargos</span>
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
