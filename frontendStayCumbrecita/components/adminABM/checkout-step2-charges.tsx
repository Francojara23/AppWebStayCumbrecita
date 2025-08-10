"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { CargoAdicional, ConceptoCargo, CONCEPTOS_PREDEFINIDOS } from '@/types/checkout'
import { useToast } from '@/hooks/use-toast'

interface CheckoutStep2ChargesProps {
  onComplete: (cargos: CargoAdicional[]) => void
  onBack: () => void
  initialCargos?: CargoAdicional[]
}

interface NuevoCargo {
  concepto: ConceptoCargo | ''
  monto: string
  descripcion: string
}

export function CheckoutStep2Charges({ onComplete, onBack, initialCargos = [] }: CheckoutStep2ChargesProps) {
  const [cargos, setCargos] = useState<CargoAdicional[]>(initialCargos)
  const [nuevoCargo, setNuevoCargo] = useState<NuevoCargo>({
    concepto: '',
    monto: '',
    descripcion: ''
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const { toast } = useToast()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(amount)
  }

  const validateNuevoCargo = (): boolean => {
    const newErrors: { [key: string]: string } = {}

    if (!nuevoCargo.concepto) {
      newErrors.concepto = 'Selecciona un concepto'
    }

    if (!nuevoCargo.monto.trim()) {
      newErrors.monto = 'Ingresa un monto'
    } else {
      const monto = parseFloat(nuevoCargo.monto)
      if (isNaN(monto) || monto < 0) {
        newErrors.monto = 'El monto debe ser un número mayor o igual a 0'
      }
    }

    if (nuevoCargo.concepto === ConceptoCargo.OTROS && !nuevoCargo.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria para "Otros"'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAgregarCargo = () => {
    if (!validateNuevoCargo()) return

    const monto = parseFloat(nuevoCargo.monto)
    
    if (monto === 0) {
          toast({
      title: "Monto cero",
      description: "Se agregó un cargo con monto $0",
      variant: "default"
    })
    }

    const cargo: CargoAdicional = {
      concepto: nuevoCargo.concepto as ConceptoCargo,
      monto,
      descripcion: nuevoCargo.descripcion.trim() || undefined
    }

    setCargos([...cargos, cargo])
    setNuevoCargo({ concepto: '', monto: '', descripcion: '' })
    setErrors({})

    toast({
      title: "Cargo agregado",
      description: `${CONCEPTOS_PREDEFINIDOS.find(c => c.value === cargo.concepto)?.label} - ${formatCurrency(cargo.monto)}`
    })
  }

  const handleEliminarCargo = (index: number) => {
    const cargoEliminado = cargos[index]
    setCargos(cargos.filter((_, i) => i !== index))
    
    toast({
      title: "Cargo eliminado",
      description: `${CONCEPTOS_PREDEFINIDOS.find(c => c.value === cargoEliminado.concepto)?.label}`
    })
  }

  const handleContinuar = () => {
    onComplete(cargos)
  }

  const handleSinCargos = () => {
    setCargos([])
    onComplete([])
  }

  const totalCargos = cargos.reduce((sum, cargo) => sum + cargo.monto, 0)
  const conceptoSeleccionado = CONCEPTOS_PREDEFINIDOS.find(c => c.value === nuevoCargo.concepto)

  return (
    <div className="space-y-6">
      {/* Información */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Cargos Adicionales</h3>
              <p className="text-sm text-orange-700 mt-1">
                Agrega cargos por consumos, daños o servicios adicionales. 
                Si no hay cargos adicionales, puedes continuar directamente al checkout.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulario para Nuevo Cargo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-green-600" />
            Agregar Nuevo Cargo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Concepto */}
            <div className="space-y-2">
              <Label htmlFor="concepto">Concepto *</Label>
              <Select
                value={nuevoCargo.concepto}
                onValueChange={(value) => setNuevoCargo({ ...nuevoCargo, concepto: value as ConceptoCargo })}
              >
                <SelectTrigger className={errors.concepto ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona un concepto" />
                </SelectTrigger>
                <SelectContent>
                  {CONCEPTOS_PREDEFINIDOS.map((concepto) => (
                    <SelectItem key={concepto.value} value={concepto.value}>
                      <div className="flex items-center gap-2">
                        <span>{concepto.icon}</span>
                        <span>{concepto.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.concepto && (
                <p className="text-sm text-red-500">{errors.concepto}</p>
              )}
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label htmlFor="monto">Monto *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={nuevoCargo.monto}
                  onChange={(e) => setNuevoCargo({ ...nuevoCargo, monto: e.target.value })}
                  className={`pl-10 ${errors.monto ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.monto && (
                <p className="text-sm text-red-500">{errors.monto}</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">
              Descripción {nuevoCargo.concepto === ConceptoCargo.OTROS && '*'}
            </Label>
            <Textarea
              id="descripcion"
              placeholder={
                nuevoCargo.concepto === ConceptoCargo.OTROS 
                  ? "Describe el cargo..." 
                  : "Descripción adicional (opcional)"
              }
              value={nuevoCargo.descripcion}
              onChange={(e) => setNuevoCargo({ ...nuevoCargo, descripcion: e.target.value })}
              className={errors.descripcion ? 'border-red-500' : ''}
              rows={2}
            />
            {errors.descripcion && (
              <p className="text-sm text-red-500">{errors.descripcion}</p>
            )}
          </div>

          {/* Botón Agregar */}
          <div className="flex justify-end">
            <Button 
              onClick={handleAgregarCargo}
              className="bg-green-600 hover:bg-green-700"
              disabled={!nuevoCargo.concepto || !nuevoCargo.monto}
            >
              <Plus className="mr-2 h-4 w-4" />
              Agregar Cargo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Cargos */}
      {cargos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cargos Agregados</span>
              <Badge variant="outline" className="text-lg px-3 py-1">
                {cargos.length} cargo{cargos.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cargos.map((cargo, index) => {
              const concepto = CONCEPTOS_PREDEFINIDOS.find(c => c.value === cargo.concepto)
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{concepto?.icon}</span>
                    <div>
                      <p className="font-medium">{concepto?.label}</p>
                      {cargo.descripcion && (
                        <p className="text-sm text-gray-600">{cargo.descripcion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-600">
                      {formatCurrency(cargo.monto)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarCargo(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}

            <Separator />

            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total Cargos Adicionales:</span>
              <span className="text-green-600">
                {formatCurrency(totalCargos)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones de Navegación */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSinCargos}>
            Sin Cargos - Continuar
          </Button>
          <Button 
            onClick={handleContinuar}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Continuar 
            {cargos.length > 0 && `(${cargos.length} cargo${cargos.length !== 1 ? 's' : ''})`}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}