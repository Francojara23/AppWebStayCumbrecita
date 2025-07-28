"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Edit, Trash2, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"

export interface PriceRule {
  id: string
  tipo: "EVENTO" | "FINDE_LARGO" | "FINDE" | "TEMPORADA"
  desde?: string
  hasta?: string
  incrementoPct?: number
  incrementoFijo?: number
  active: boolean
}

interface PriceRulesBuilderProps {
  rules: PriceRule[]
  onRulesChange: (rules: PriceRule[]) => void
  basePrice: number
}

export function PriceRulesBuilder({ rules, onRulesChange, basePrice }: PriceRulesBuilderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)
  const [fromDateOpen, setFromDateOpen] = useState(false)
  const [toDateOpen, setToDateOpen] = useState(false)
  const [formData, setFormData] = useState({
    tipo: "" as PriceRule["tipo"],
    desde: undefined as Date | undefined,
    hasta: undefined as Date | undefined,
    valor: "",
    tipoValor: "fijo" as "fijo" | "porcentaje",
  })

  // Fecha actual sin horas para validaciones
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Variables para determinar qué campos de fecha mostrar
  const needsDateRange = formData.tipo === "TEMPORADA" || formData.tipo === "FINDE_LARGO"
  const needsSingleDate = formData.tipo === "EVENTO"

  const resetForm = () => {
    setFormData({
      tipo: "" as PriceRule["tipo"],
      desde: undefined,
      hasta: undefined,
      valor: "",
      tipoValor: "fijo",
    })
    setEditingRule(null)
    setFromDateOpen(false)
    setToDateOpen(false)
  }

  const openModal = (rule?: PriceRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        tipo: rule.tipo,
        desde: rule.desde ? new Date(rule.desde) : undefined,
        hasta: rule.hasta ? new Date(rule.hasta) : undefined,
        valor: (rule.incrementoFijo || rule.incrementoPct || "").toString(),
        tipoValor: rule.incrementoFijo ? "fijo" : "porcentaje",
      })
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  // Manejar selección de fecha desde con flujo automático
  const handleFromDateSelect = (date: Date | undefined) => {
    setFormData({ ...formData, desde: date })
    if (date && needsDateRange) {
      setFromDateOpen(false)
      // Abrir automáticamente el calendario de fecha hasta
      setTimeout(() => setToDateOpen(true), 100)
    }
  }

  // Manejar selección de fecha hasta
  const handleToDateSelect = (date: Date | undefined) => {
    setFormData({ ...formData, hasta: date })
    if (date) {
      setToDateOpen(false)
    }
  }

  const validateRule = (): string | null => {
    if (!formData.tipo) return "Debe seleccionar un tipo de regla"
    if (!formData.valor || isNaN(Number(formData.valor))) return "Debe ingresar un valor válido"

    const valor = Number(formData.valor)
    if (valor <= 0) return "El valor debe ser mayor a 0"

    // Validar fechas según el tipo
    if (formData.tipo === "EVENTO") {
      if (!formData.desde) return "Debe seleccionar la fecha del evento"
    } else if (formData.tipo === "TEMPORADA" || formData.tipo === "FINDE_LARGO") {
      if (!formData.desde || !formData.hasta) return "Debe seleccionar fecha de inicio y fin"
      if (formData.desde >= formData.hasta) return "La fecha de fin debe ser posterior a la de inicio"

      if (formData.tipo === "FINDE_LARGO") {
        const diffTime = Math.abs(formData.hasta.getTime() - formData.desde.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        if (diffDays < 3) return "Un fin de semana largo debe tener al menos 3 noches"
      }
    }

    // Validar que no haya solapamiento con reglas del mismo tipo
    const existingRules = editingRule ? rules.filter((r) => r.id !== editingRule.id) : rules

    const sameTypeRules = existingRules.filter((r) => r.tipo === formData.tipo)

    if (formData.tipo !== "FINDE" && sameTypeRules.length > 0) {
      // Para tipos con fechas específicas, verificar solapamiento
      for (const rule of sameTypeRules) {
        if (rule.desde && rule.hasta && formData.desde && formData.hasta) {
          const ruleStart = new Date(rule.desde)
          const ruleEnd = new Date(rule.hasta)

          if (
            (formData.desde >= ruleStart && formData.desde <= ruleEnd) ||
            (formData.hasta >= ruleStart && formData.hasta <= ruleEnd) ||
            (formData.desde <= ruleStart && formData.hasta >= ruleEnd)
          ) {
            return "Esta regla se solapa con otra existente del mismo tipo"
          }
        }
      }
    }

    return null
  }

  const handleSave = () => {
    const error = validateRule()
    if (error) {
      toast({
        title: "Error de validación",
        description: error,
        variant: "destructive",
      })
      return
    }

    const newRule: PriceRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      tipo: formData.tipo,
      active: true,
      ...(formData.tipo === "EVENTO" && {
        desde: formData.desde?.toISOString().split("T")[0],
        hasta: formData.desde?.toISOString().split("T")[0],
      }),
      ...((formData.tipo === "TEMPORADA" || formData.tipo === "FINDE_LARGO") && {
        desde: formData.desde?.toISOString().split("T")[0],
        hasta: formData.hasta?.toISOString().split("T")[0],
      }),
      ...(formData.tipoValor === "fijo"
        ? { incrementoFijo: Number(formData.valor) }
        : { incrementoPct: Number(formData.valor) }),
    }

    if (editingRule) {
      onRulesChange(rules.map((r) => (r.id === editingRule.id ? newRule : r)))
    } else {
      onRulesChange([...rules, newRule])
    }

    setIsModalOpen(false)
    resetForm()

    toast({
      title: "Regla guardada",
      description: "La regla de precio ha sido guardada exitosamente",
    })
  }

  const handleDelete = (ruleId: string) => {
    onRulesChange(rules.filter((r) => r.id !== ruleId))
    toast({
      title: "Regla eliminada",
      description: "La regla de precio ha sido eliminada",
    })
  }

  const toggleRuleActive = (ruleId: string) => {
    onRulesChange(rules.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r)))
  }

  const formatRuleRange = (rule: PriceRule) => {
    if (rule.tipo === "FINDE") return "Todos los fines de semana"
    if (rule.tipo === "EVENTO") return rule.desde ? format(new Date(rule.desde), "dd/MM/yyyy", { locale: es }) : ""
    if (rule.desde && rule.hasta) {
      return `${format(new Date(rule.desde), "dd/MM/yyyy", { locale: es })} - ${format(new Date(rule.hasta), "dd/MM/yyyy", { locale: es })}`
    }
    return ""
  }

  const formatRuleValue = (rule: PriceRule) => {
    if (rule.incrementoFijo) return `+$${rule.incrementoFijo}`
    if (rule.incrementoPct) return `+${rule.incrementoPct}%`
    return ""
  }

  const calculatePreviewPrice = () => {
    if (!basePrice) return basePrice

    let finalPrice = basePrice
    const activeRules = rules.filter((r) => r.active)

    for (const rule of activeRules) {
      if (rule.incrementoFijo) {
        finalPrice += rule.incrementoFijo
      } else if (rule.incrementoPct) {
        finalPrice += (basePrice * rule.incrementoPct) / 100
      }
    }

    return finalPrice
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-orange-700">Reglas de precio</h3>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button type="button" onClick={() => openModal()} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="mr-2 h-4 w-4" />
              Añadir regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Editar regla de precio" : "Nueva regla de precio"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo de regla</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: PriceRule["tipo"]) => {
                    setFormData({ ...formData, tipo: value, desde: undefined, hasta: undefined })
                    setFromDateOpen(false)
                    setToDateOpen(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EVENTO">Evento especial</SelectItem>
                    <SelectItem value="FINDE_LARGO">Fin de semana largo</SelectItem>
                    <SelectItem value="FINDE">Fin de semana</SelectItem>
                    <SelectItem value="TEMPORADA">Temporada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {needsSingleDate && (
                <div>
                  <Label>Fecha del evento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" type="button" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.desde ? format(formData.desde, "dd/MM/yyyy", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.desde}
                          onSelect={(date) => setFormData({ ...formData, desde: date })}
                          disabled={(date) => date < today}
                          defaultMonth={formData.desde || new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                  </Popover>
                </div>
              )}

              {needsDateRange && (
                <div className="space-y-4">
                  <div>
                    <Label>Fecha desde</Label>
                    <Popover open={fromDateOpen} onOpenChange={setFromDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" type="button" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.desde ? format(formData.desde, "dd/MM/yyyy", { locale: es }) : "Desde"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.desde}
                          onSelect={handleFromDateSelect}
                          disabled={(date) => date < today}
                          defaultMonth={formData.desde || new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Fecha hasta</Label>
                    <Popover open={toDateOpen} onOpenChange={setToDateOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" type="button" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.hasta ? format(formData.hasta, "dd/MM/yyyy", { locale: es }) : "Hasta"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.hasta}
                          onSelect={handleToDateSelect}
                          disabled={(date) => date < today || (formData.desde ? date <= formData.desde : false)}
                          defaultMonth={formData.desde ? new Date(formData.desde.getTime() + 24 * 60 * 60 * 1000) : new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="valor">Valor del ajuste</Label>
                <div className="flex space-x-2">
                  <Input
                    id="valor"
                    type="number"
                    placeholder="0"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="flex-1"
                  />
                  <Select
                    value={formData.tipoValor}
                    onValueChange={(value: "fijo" | "porcentaje") => setFormData({ ...formData, tipoValor: value })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fijo">$</SelectItem>
                      <SelectItem value="porcentaje">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rules.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Suplemento</TableHead>
                <TableHead>Activa</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">
                    {rule.tipo === "EVENTO" && "Evento"}
                    {rule.tipo === "FINDE_LARGO" && "Fin de semana largo"}
                    {rule.tipo === "FINDE" && "Fin de semana"}
                    {rule.tipo === "TEMPORADA" && "Temporada"}
                  </TableCell>
                  <TableCell>{formatRuleRange(rule)}</TableCell>
                  <TableCell>{formatRuleValue(rule)}</TableCell>
                  <TableCell>
                    <Switch checked={rule.active} onCheckedChange={() => toggleRuleActive(rule.id)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" type="button" onClick={() => openModal(rule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" type="button" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No hay reglas de precio configuradas</div>
      )}

      {basePrice > 0 && (
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Vista previa:</strong> Precio base: ${basePrice} — Con todas las reglas activas:{" "}
            <strong>${calculatePreviewPrice()}</strong>
          </p>
        </div>
      )}
    </div>
  )
}
