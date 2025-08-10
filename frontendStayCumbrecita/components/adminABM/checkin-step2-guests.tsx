"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  User, 
  Users, 
  Home, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { type DatosCheckinResponse, type HabitacionCheckin, type HuespedCheckin } from '@/types/checkin'

interface CheckinStep2GuestsProps {
  reservaData: DatosCheckinResponse
  onComplete: (huespedesPorHabitacion: HabitacionCheckin[]) => void
}

export function CheckinStep2Guests({ reservaData, onComplete }: CheckinStep2GuestsProps) {
  const [habitaciones, setHabitaciones] = useState<HabitacionCheckin[]>([])
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isValidating, setIsValidating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Inicializar habitaciones con el titular pre-llenado en la primera habitación
    const habitacionesIniciales = reservaData.habitaciones.map((hab, index) => {
      const huespedesVacios: HuespedCheckin[] = []
      
      // Llenar con huéspedes vacíos según la cantidad de personas reservadas
      for (let i = 0; i < hab.personasReservadas; i++) {
        if (index === 0 && i === 0) {
          // Primer huésped de primera habitación = titular (pre-llenado)
          huespedesVacios.push({
            nombre: reservaData.titular.nombre,
            apellido: reservaData.titular.apellido,
            dni: reservaData.titular.dni,
            telefono: reservaData.titular.telefono || '',
            email: reservaData.titular.email || ''
          })
        } else {
          // Huéspedes vacíos para completar
          huespedesVacios.push({
            nombre: '',
            apellido: '',
            dni: '',
            telefono: '',
            email: ''
          })
        }
      }

      return {
        ...hab,
        huespedes: huespedesVacios
      }
    })
    
    setHabitaciones(habitacionesIniciales)
  }, [reservaData])

  const handleHuespedChange = (
    habitacionIndex: number, 
    huespedIndex: number, 
    field: keyof HuespedCheckin, 
    value: string
  ) => {
    setHabitaciones(prev => {
      const updated = [...prev]
      updated[habitacionIndex].huespedes[huespedIndex] = {
        ...updated[habitacionIndex].huespedes[huespedIndex],
        [field]: value
      }
      return updated
    })

    // Limpiar error si existe
    const errorKey = `${habitacionIndex}-${huespedIndex}-${field}`
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[errorKey]
        return newErrors
      })
    }
  }

  const validateHuespedes = (): boolean => {
    const newErrors: { [key: string]: string } = {}
    let isValid = true

    habitaciones.forEach((habitacion, habIndex) => {
      habitacion.huespedes.forEach((huesped, huespedIndex) => {
        // Validar campos obligatorios
        if (!huesped.nombre.trim()) {
          newErrors[`${habIndex}-${huespedIndex}-nombre`] = 'Nombre es obligatorio'
          isValid = false
        }
        
        if (!huesped.apellido.trim()) {
          newErrors[`${habIndex}-${huespedIndex}-apellido`] = 'Apellido es obligatorio'
          isValid = false
        }
        
        if (!huesped.dni.trim()) {
          newErrors[`${habIndex}-${huespedIndex}-dni`] = 'DNI es obligatorio'
          isValid = false
        } else if (!/^\d{7,8}$/.test(huesped.dni.trim())) {
          newErrors[`${habIndex}-${huespedIndex}-dni`] = 'DNI debe tener 7 u 8 dígitos'
          isValid = false
        }

        // Validar email si se proporciona
        if (huesped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(huesped.email)) {
          newErrors[`${habIndex}-${huespedIndex}-email`] = 'Email inválido'
          isValid = false
        }
      })
    })

    setErrors(newErrors)
    return isValid
  }

  const handleContinue = async () => {
    setIsValidating(true)

    if (!validateHuespedes()) {
      toast({
        title: "❌ Datos incompletos",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      })
      setIsValidating(false)
      return
    }

    // Simular validación
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast({
      title: "✅ Huéspedes registrados",
      description: "Continuando al paso de pago...",
    })

    onComplete(habitaciones)
    setIsValidating(false)
  }

  const getTotalHuespedes = () => {
    return habitaciones.reduce((total, hab) => total + hab.huespedes.length, 0)
  }

  const getHuespedesCompletados = () => {
    return habitaciones.reduce((total, hab) => {
      return total + hab.huespedes.filter(h => h.nombre && h.apellido && h.dni).length
    }, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header con progreso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-600" />
              Registro de Huéspedes
            </div>
            <Badge variant="outline">
              {getHuespedesCompletados()} / {getTotalHuespedes()} completados
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-gray-500" />
              <span>Titular: {reservaData.titular.nombre} {reservaData.titular.apellido}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4 text-gray-500" />
              <span>{habitaciones.length} habitaciones</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario por habitación */}
      {habitaciones.map((habitacion, habIndex) => (
        <Card key={habitacion.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center">
                <Home className="mr-2 h-5 w-5 text-orange-600" />
                {habitacion.nombre}
              </div>
              <Badge variant="secondary">
                {habitacion.huespedes.length} / {habitacion.capacidad} personas
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {habitacion.huespedes.map((huesped, huespedIndex) => {
              const esTitular = habIndex === 0 && huespedIndex === 0
              
              return (
                <div key={huespedIndex} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      {esTitular ? (
                        <span className="text-green-700">
                          Huésped #{huespedIndex + 1} (Titular)
                        </span>
                      ) : (
                        `Huésped #${huespedIndex + 1}`
                      )}
                    </h4>
                    {esTitular && (
                      <Badge className="bg-green-100 text-green-800">
                        Pre-llenado
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Nombre */}
                    <div>
                      <Label htmlFor={`nombre-${habIndex}-${huespedIndex}`}>
                        Nombre *
                      </Label>
                      <Input
                        id={`nombre-${habIndex}-${huespedIndex}`}
                        value={huesped.nombre}
                        onChange={(e) => handleHuespedChange(habIndex, huespedIndex, 'nombre', e.target.value)}
                        disabled={esTitular}
                        className={errors[`${habIndex}-${huespedIndex}-nombre`] ? 'border-red-500' : ''}
                      />
                      {errors[`${habIndex}-${huespedIndex}-nombre`] && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[`${habIndex}-${huespedIndex}-nombre`]}
                        </p>
                      )}
                    </div>

                    {/* Apellido */}
                    <div>
                      <Label htmlFor={`apellido-${habIndex}-${huespedIndex}`}>
                        Apellido *
                      </Label>
                      <Input
                        id={`apellido-${habIndex}-${huespedIndex}`}
                        value={huesped.apellido}
                        onChange={(e) => handleHuespedChange(habIndex, huespedIndex, 'apellido', e.target.value)}
                        disabled={esTitular}
                        className={errors[`${habIndex}-${huespedIndex}-apellido`] ? 'border-red-500' : ''}
                      />
                      {errors[`${habIndex}-${huespedIndex}-apellido`] && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[`${habIndex}-${huespedIndex}-apellido`]}
                        </p>
                      )}
                    </div>

                    {/* DNI */}
                    <div>
                      <Label htmlFor={`dni-${habIndex}-${huespedIndex}`}>
                        DNI *
                      </Label>
                      <Input
                        id={`dni-${habIndex}-${huespedIndex}`}
                        value={huesped.dni}
                        onChange={(e) => handleHuespedChange(habIndex, huespedIndex, 'dni', e.target.value.replace(/\D/g, ''))}
                        disabled={esTitular}
                        maxLength={8}
                        placeholder="12345678"
                        className={errors[`${habIndex}-${huespedIndex}-dni`] ? 'border-red-500' : ''}
                      />
                      {errors[`${habIndex}-${huespedIndex}-dni`] && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[`${habIndex}-${huespedIndex}-dni`]}
                        </p>
                      )}
                    </div>

                    {/* Teléfono */}
                    <div>
                      <Label htmlFor={`telefono-${habIndex}-${huespedIndex}`}>
                        Teléfono
                      </Label>
                      <Input
                        id={`telefono-${habIndex}-${huespedIndex}`}
                        value={huesped.telefono}
                        onChange={(e) => handleHuespedChange(habIndex, huespedIndex, 'telefono', e.target.value)}
                        placeholder="+54 9 11 1234-5678"
                      />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                      <Label htmlFor={`email-${habIndex}-${huespedIndex}`}>
                        Email
                      </Label>
                      <Input
                        id={`email-${habIndex}-${huespedIndex}`}
                        type="email"
                        value={huesped.email}
                        onChange={(e) => handleHuespedChange(habIndex, huespedIndex, 'email', e.target.value)}
                        placeholder="ejemplo@email.com"
                        className={errors[`${habIndex}-${huespedIndex}-email`] ? 'border-red-500' : ''}
                      />
                      {errors[`${habIndex}-${huespedIndex}-email`] && (
                        <p className="text-sm text-red-500 mt-1">
                          {errors[`${habIndex}-${huespedIndex}-email`]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {/* Botón continuar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>Total de huéspedes: {getTotalHuespedes()}</p>
              <p>Completados: {getHuespedesCompletados()}</p>
            </div>
            
            <Button
              onClick={handleContinue}
              disabled={isValidating || getHuespedesCompletados() < getTotalHuespedes()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isValidating ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  Continuar al Pago
                  <CheckCircle className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor corrige los errores marcados en rojo
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}