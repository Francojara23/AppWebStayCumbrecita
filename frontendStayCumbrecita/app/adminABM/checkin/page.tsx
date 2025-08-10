"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { QrCode, Scan, Clock, CheckCircle, User, CreditCard, Search, Eye, Calendar, Users, Home } from 'lucide-react'
import { CheckinWizard } from '@/components/adminABM/checkin-wizard'
import { CheckoutModal } from '@/components/adminABM/checkout-modal'
import { getCheckinsRealizados, type CheckinRecord } from '@/app/actions/reservations/getCheckins'
import { useToast } from '@/hooks/use-toast'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1
        const isActive = stepNumber === currentStep
        const isCompleted = stepNumber < currentStep
        
        return (
          <React.Fragment key={stepNumber}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  isCompleted
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  stepNumber
                )}
              </div>
              <span className={`text-sm mt-2 ${isActive ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                {stepNumber === 1 && 'Escanear QR'}
                {stepNumber === 2 && 'Datos Huéspedes'}
                {stepNumber === 3 && 'Datos Pago'}
              </span>
            </div>
            {stepNumber < totalSteps && (
              <div
                className={`w-12 h-1 transition-colors ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function CheckinPage() {
  const [showWizard, setShowWizard] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [checkins, setCheckins] = useState<CheckinRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [selectedReservaId, setSelectedReservaId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleStartCheckin = () => {
    setShowWizard(true)
    setCurrentStep(1)
  }

  const handleWizardClose = () => {
    setShowWizard(false)
    setCurrentStep(1)
  }

  const handleStepChange = (step: number) => {
    setCurrentStep(step)
  }

  const handleOpenCheckout = (reservaId: string) => {
    setSelectedReservaId(reservaId)
    setShowCheckoutModal(true)
  }

  const handleCloseCheckout = () => {
    setShowCheckoutModal(false)
    setSelectedReservaId(null)
  }

  const handleCheckoutComplete = () => {
    // Refrescar la lista de check-ins
    fetchCheckins()
  }

  const fetchCheckins = async () => {
    try {
      setIsLoading(true)
      const response = await getCheckinsRealizados()
      
      if (response.success) {
        setCheckins(response.data)
      } else {
        toast({
          title: "❌ Error",
          description: response.message || "Error al cargar check-ins",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading checkins:', error)
      toast({
        title: "❌ Error",
        description: "Error al conectar con el servidor",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCheckins()
  }, [])

  const filteredCheckins = checkins.filter((checkin) =>
    checkin.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkin.titular.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkin.hospedaje.toLowerCase().includes(searchQuery.toLowerCase()) ||
    checkin.realizadoPor.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHECK_IN':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'CHECK_OUT':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  if (showWizard) {
    return (
      <div className="container mx-auto p-6">
        <StepIndicator currentStep={currentStep} totalSteps={3} />
        <CheckinWizard 
          onClose={handleWizardClose}
          onStepChange={handleStepChange}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Check-in de Huéspedes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gestiona el proceso de check-in escaneando códigos QR de reservas
          </p>
        </div>
        <Button
          onClick={handleStartCheckin}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <QrCode className="mr-2 h-4 w-4" />
          Iniciar Check-in
        </Button>
      </div>

      {/* Cards informativos del proceso */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <QrCode className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Código QR Válido</p>
                <p className="text-sm text-muted-foreground">
                  Solo reservas confirmadas o pagadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Registro por Habitación</p>
                <p className="text-sm text-muted-foreground">
                  Asigna huéspedes a habitaciones específicas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium">Seguridad de Pago</p>
                <p className="text-sm text-muted-foreground">
                  Datos encriptados y temporales
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Check-ins Realizados */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
              Check-ins Realizados
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código, titular, hospedaje..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-80"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Hospedaje</TableHead>
                  <TableHead>Fecha Check-in</TableHead>
                  <TableHead className="text-center">Habitaciones</TableHead>
                  <TableHead className="text-center">Huéspedes</TableHead>
                  <TableHead>Realizado por</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center space-x-2">
                        <CheckCircle className="h-4 w-4 animate-spin" />
                        <span>Cargando check-ins...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCheckins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex flex-col items-center space-y-2">
                        <QrCode className="h-8 w-8 text-gray-400" />
                        <span className="text-gray-500">
                          {searchQuery ? 'No se encontraron check-ins' : 'No hay check-ins realizados'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCheckins.map((checkin) => (
                    <TableRow key={checkin.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <QrCode className="h-4 w-4 text-orange-600" />
                          <span>{checkin.codigo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span>{checkin.titular}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Home className="h-4 w-4 text-gray-500" />
                          <span>{checkin.hospedaje}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{formatDate(checkin.fechaCheckin)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {checkin.habitaciones}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span>{checkin.totalHuespedes}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {checkin.realizadoPor}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(checkin.estado)}>
                          {checkin.estado === 'CHECK_IN' ? 'Check-in' : checkin.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenCheckout(checkin.id)}
                          className="hover:bg-orange-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Checkout */}
      <CheckoutModal
        reservaId={selectedReservaId}
        isOpen={showCheckoutModal}
        onClose={handleCloseCheckout}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </div>
  )
}