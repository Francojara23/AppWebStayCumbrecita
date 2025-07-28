"use client"

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, Users, Calendar, MapPin, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Esquema de validación
const huespedSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  dni: z.string().min(1, 'DNI es requerido'),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
})

const checkinSchema = z.object({
  huespedes: z.array(huespedSchema),
})

type CheckinFormData = z.infer<typeof checkinSchema>

interface ReservaData {
  id: string
  codigo: string
  hospedaje: string
  fechaInicio: string
  fechaFin: string
  turista: {
    nombre: string
    apellido: string
    email: string
    telefono?: string
    dni: string
  }
  habitaciones: Array<{
    nombre: string
    personas: number
  }>
  totalHuespedes: number
  huespedesAdicionales: number
}

interface CheckinModalProps {
  isOpen: boolean
  onClose: () => void
  reservaData: ReservaData | null
  qrData: string
  onSubmit: (data: { reservaId: string; qrData: string; huespedes: any[] }) => Promise<void>
  isLoading?: boolean
}

export function CheckinModal({
  isOpen,
  onClose,
  reservaData,
  qrData,
  onSubmit,
  isLoading = false
}: CheckinModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CheckinFormData>({
    resolver: zodResolver(checkinSchema),
    defaultValues: {
      huespedes: Array.from({ length: reservaData?.huespedesAdicionales || 0 }, () => ({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        email: '',
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'huespedes',
  })

  const handleSubmit = async (data: CheckinFormData) => {
    if (!reservaData) return

    setIsSubmitting(true)
    try {
      await onSubmit({
        reservaId: reservaData.id,
        qrData,
        huespedes: data.huespedes,
      })
      form.reset()
      onClose()
    } catch (error) {
      console.error('Error en check-in:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!reservaData) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Check-in - {reservaData.hospedaje}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la reserva */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de la Reserva</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Código de Reserva</Label>
                <p className="font-mono text-lg">{reservaData.codigo}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Hospedaje</Label>
                <p className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {reservaData.hospedaje}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Fechas</Label>
                <p className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {format(new Date(reservaData.fechaInicio), 'dd/MM/yyyy', { locale: es })} -{' '}
                  {format(new Date(reservaData.fechaFin), 'dd/MM/yyyy', { locale: es })}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Habitaciones</Label>
                <div className="flex flex-wrap gap-1">
                  {reservaData.habitaciones.map((habitacion, index) => (
                    <Badge key={index} variant="secondary">
                      {habitacion.nombre} ({habitacion.personas} pax)
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Total Huéspedes</Label>
                <p className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {reservaData.totalHuespedes} personas
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Huésped principal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                Huésped Principal (quien hizo la reserva)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Nombre</Label>
                <p>{reservaData.turista.nombre}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Apellido</Label>
                <p>{reservaData.turista.apellido}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">DNI</Label>
                <p>{reservaData.turista.dni}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <p>{reservaData.turista.email}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-500">Teléfono</Label>
                <p>{reservaData.turista.telefono || 'No especificado'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Huéspedes adicionales */}
          {reservaData.huespedesAdicionales > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Huéspedes Adicionales ({reservaData.huespedesAdicionales})
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    nombre: '',
                    apellido: '',
                    dni: '',
                    telefono: '',
                    email: '',
                  })}
                >
                  Agregar Huésped
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  {fields.map((field, index) => (
                    <div key={field.id}>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Huésped {index + 1}</h4>
                        {fields.length > reservaData.huespedesAdicionales && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`huespedes.${index}.nombre`}>
                            Nombre *
                          </Label>
                          <Input
                            {...form.register(`huespedes.${index}.nombre`)}
                            placeholder="Nombre"
                          />
                          {form.formState.errors.huespedes?.[index]?.nombre && (
                            <p className="text-red-500 text-sm mt-1">
                              {form.formState.errors.huespedes[index].nombre?.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`huespedes.${index}.apellido`}>
                            Apellido *
                          </Label>
                          <Input
                            {...form.register(`huespedes.${index}.apellido`)}
                            placeholder="Apellido"
                          />
                          {form.formState.errors.huespedes?.[index]?.apellido && (
                            <p className="text-red-500 text-sm mt-1">
                              {form.formState.errors.huespedes[index].apellido?.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`huespedes.${index}.dni`}>
                            DNI *
                          </Label>
                          <Input
                            {...form.register(`huespedes.${index}.dni`)}
                            placeholder="DNI"
                          />
                          {form.formState.errors.huespedes?.[index]?.dni && (
                            <p className="text-red-500 text-sm mt-1">
                              {form.formState.errors.huespedes[index].dni?.message}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`huespedes.${index}.telefono`}>
                            Teléfono
                          </Label>
                          <Input
                            {...form.register(`huespedes.${index}.telefono`)}
                            placeholder="Teléfono (opcional)"
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <Label htmlFor={`huespedes.${index}.email`}>
                            Email
                          </Label>
                          <Input
                            {...form.register(`huespedes.${index}.email`)}
                            type="email"
                            placeholder="Email (opcional)"
                          />
                          {form.formState.errors.huespedes?.[index]?.email && (
                            <p className="text-red-500 text-sm mt-1">
                              {form.formState.errors.huespedes[index].email?.message}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {index < fields.length - 1 && <Separator className="my-6" />}
                    </div>
                  ))}
                </form>
              </CardContent>
            </Card>
          )}

          {reservaData.huespedesAdicionales === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">
                  Esta reserva es para 1 persona únicamente. 
                  No hay huéspedes adicionales que registrar.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Realizando check-in...
              </>
            ) : (
              'Completar Check-in'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 