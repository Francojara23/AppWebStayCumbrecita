"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { getClientApiUrl } from '@/lib/utils/api-urls'
import { QrScannerComponent } from '@/components/adminABM/qr-scanner'
import { CheckinModal } from '@/components/adminABM/checkin-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, QrCode, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/hooks/use-user'

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

export default function CheckinScanPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  
  const [isVerifying, setIsVerifying] = useState(false)
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false)
  const [reservaData, setReservaData] = useState<ReservaData | null>(null)
  const [qrData, setQrData] = useState('')
  const [scannerError, setScannerError] = useState('')

  // Verificar permisos
  if (!userLoading && (!user || user.role !== 'ADMIN')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Acceso Denegado</h2>
              <p className="text-gray-600 mb-4">
                No tienes permisos para acceder a esta funcionalidad.
              </p>
              <Button onClick={() => router.back()}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleQrScan = async (data: string) => {
    console.log('QR escaneado:', data)
    setIsVerifying(true)
    setScannerError('')

    try {
      // Verificar QR con el backend
      const response = await fetch(`${getClientApiUrl()}/reservas/verificar-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ qrData: data }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error verificando QR')
      }

      const result = await response.json()
      console.log('QR verificado:', result)

      if (result.qrValido && result.reserva) {
        setReservaData(result.reserva)
        setQrData(data)
        setIsCheckinModalOpen(true)
        toast.success('QR válido - Preparando check-in')
      } else {
        throw new Error('QR inválido')
      }

    } catch (error) {
      console.error('Error verificando QR:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error verificando QR'
      setScannerError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCheckinSubmit = async (data: {
    reservaId: string
    qrData: string
    huespedes: any[]
  }) => {
    try {
      const response = await fetch(`${getClientApiUrl()}/reservas/realizar-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Error realizando check-in')
      }

      const result = await response.json()
      console.log('Check-in realizado:', result)

      toast.success(
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          <div>
            <p className="font-medium">Check-in completado</p>
            <p className="text-sm">Reserva {reservaData?.codigo}</p>
          </div>
        </div>
      )

      // Limpiar estado y cerrar modal
      setReservaData(null)
      setQrData('')
      setIsCheckinModalOpen(false)

    } catch (error) {
      console.error('Error en check-in:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error realizando check-in'
      toast.error(errorMessage)
      throw error // Re-throw para que el modal maneje el error
    }
  }

  const handleScannerError = (error: string) => {
    setScannerError(error)
    toast.error(error)
  }

  if (userLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Check-in con QR</h1>
          <p className="text-gray-600">
            Escanee el código QR de la reserva para realizar el check-in
          </p>
        </div>
      </div>

      {/* Scanner */}
      <div className="max-w-2xl mx-auto">
        <QrScannerComponent
          onScan={handleQrScan}
          onError={handleScannerError}
          isLoading={isVerifying}
        />

        {/* Error del scanner */}
        {scannerError && (
          <Card className="mt-4 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                <p>{scannerError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instrucciones */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <QrCode className="h-5 w-5 mr-2" />
              Instrucciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                1
              </div>
              <p className="text-sm">
                <strong>Permite el acceso a la cámara</strong> cuando el navegador lo solicite
              </p>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                2
              </div>
              <p className="text-sm">
                <strong>Presiona "Iniciar escaneo"</strong> para activar la cámara
              </p>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                3
              </div>
              <p className="text-sm">
                <strong>Apunta la cámara hacia el QR</strong> de la reserva del huésped
              </p>
            </div>
            <div className="flex items-start">
              <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                4
              </div>
              <p className="text-sm">
                <strong>Completa los datos</strong> de los huéspedes adicionales en el formulario
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Check-in */}
      <CheckinModal
        isOpen={isCheckinModalOpen}
        onClose={() => setIsCheckinModalOpen(false)}
        reservaData={reservaData}
        qrData={qrData}
        onSubmit={handleCheckinSubmit}
      />
    </div>
  )
} 