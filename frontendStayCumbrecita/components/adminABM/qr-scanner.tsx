"use client"

import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, QrCode, Camera, CameraOff } from 'lucide-react'

interface QrScannerProps {
  onScan: (data: string) => void
  onError?: (error: string) => void
  isLoading?: boolean
}

export function QrScannerComponent({ onScan, onError, isLoading = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')

  useEffect(() => {
    const initScanner = async () => {
      if (!videoRef.current) return

      try {
        // Verificar si hay cámaras disponibles
        const availableCameras = await QrScanner.listCameras(true)
        setCameras(availableCameras)
        
        if (availableCameras.length === 0) {
          onError?.('No se encontraron cámaras disponibles')
          return
        }

        // Usar la cámara trasera por defecto si está disponible
        const backCamera = availableCameras.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear') ||
          camera.label.toLowerCase().includes('environment')
        )
        const defaultCamera = backCamera || availableCameras[0]
        setSelectedCamera(defaultCamera.id)

        // Crear el scanner
        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            console.log('QR detectado:', result.data)
            onScan(result.data)
            stopScanning()
          },
          {
            onDecodeError: (error) => {
              // Ignorar errores de decodificación (normal cuando no hay QR visible)
              console.debug('Esperando QR...', error)
            },
            preferredCamera: defaultCamera.id,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            maxScansPerSecond: 5,
          }
        )

        qrScannerRef.current = scanner
        setHasPermission(true)

      } catch (error) {
        console.error('Error inicializando scanner:', error)
        setHasPermission(false)
        onError?.('Error accediendo a la cámara. Verifique los permisos.')
      }
    }

    initScanner()

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy()
      }
    }
  }, [onScan, onError])

  const startScanning = async () => {
    if (!qrScannerRef.current) return

    try {
      setIsScanning(true)
      await qrScannerRef.current.start()
    } catch (error) {
      console.error('Error iniciando scanner:', error)
      setIsScanning(false)
      onError?.('Error iniciando la cámara')
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      setIsScanning(false)
    }
  }

  const switchCamera = async (cameraId: string) => {
    if (!qrScannerRef.current) return

    try {
      await qrScannerRef.current.setCamera(cameraId)
      setSelectedCamera(cameraId)
    } catch (error) {
      console.error('Error cambiando cámara:', error)
      onError?.('Error cambiando de cámara')
    }
  }

  if (hasPermission === null) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Inicializando cámara...</span>
        </CardContent>
      </Card>
    )
  }

  if (hasPermission === false) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <CameraOff className="h-5 w-5 mr-2" />
            Sin acceso a la cámara
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Para escanear códigos QR necesitamos acceso a su cámara. 
            Por favor, permita el acceso cuando su navegador lo solicite.
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full"
          >
            Recargar página
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="h-5 w-5 mr-2" />
          Escanear QR de Reserva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video para mostrar la cámara */}
        <div className="relative">
          <video
            ref={videoRef}
            className="w-full h-64 bg-black rounded-lg"
            playsInline
            muted
          />
          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Selector de cámara */}
        {cameras.length > 1 && (
          <div>
            <label className="text-sm font-medium mb-2 block">Cámara:</label>
            <select
              value={selectedCamera}
              onChange={(e) => switchCamera(e.target.value)}
              className="w-full p-2 border rounded-md"
              disabled={isScanning}
            >
              {cameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Cámara ${camera.id}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Controles */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button 
              onClick={startScanning} 
              className="flex-1"
              disabled={isLoading}
            >
              <Camera className="h-4 w-4 mr-2" />
              Iniciar escaneo
            </Button>
          ) : (
            <Button 
              onClick={stopScanning} 
              variant="destructive" 
              className="flex-1"
            >
              <CameraOff className="h-4 w-4 mr-2" />
              Detener escaneo
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center">
          Apunte la cámara hacia el código QR de la reserva
        </p>
      </CardContent>
    </Card>
  )
} 