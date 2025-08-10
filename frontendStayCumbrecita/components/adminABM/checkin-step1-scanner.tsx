"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Home, 
  Calendar,
  Users,
  X,
  StopCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { type DatosCheckinResponse, type QrScanResult } from '@/types/checkin'
import { getClientApiUrl } from '@/lib/utils/api-urls'
import QrScanner from 'qr-scanner'

interface CheckinStep1ScannerProps {
  onComplete: (qrData: string, datos: DatosCheckinResponse) => void
}

export function CheckinStep1Scanner({ onComplete }: CheckinStep1ScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [qrData, setQrData] = useState('')
  const [scanResult, setScanResult] = useState<QrScanResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string, label: string }>>([])
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const { toast } = useToast()

  // Configuración optimizada para MacBook con enfoque y alta resolución
  const DEFAULT_CONSTRAINTS: MediaTrackConstraints = {
    facingMode: { ideal: 'user' }, // Preferir cámara frontal para laptop/desktop
    width: { ideal: 1920, min: 1280 }, // Mayor resolución para mejor detección
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30, min: 15 } // Mayor frame rate
  }

  const [videoConstraints, setVideoConstraints] = useState<MediaTrackConstraints>(
    DEFAULT_CONSTRAINTS
  )

  // Refs para video y scanner
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const scannerRef = useRef<QrScanner | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const manualScanIntervalRef = useRef<number | null>(null)

  // Detectar cámaras disponibles al montar
  useEffect(() => {
    (async () => {
      try {
        const hasCam = await QrScanner.hasCamera()
        if (!hasCam) {
          setError('No se detectó ninguna cámara en el dispositivo.')
          return
        }
        const cams = await QrScanner.listCameras(true)
        const mapped = cams.map(c => ({ id: c.id, label: c.label || 'Cámara' }))
        setAvailableCameras(mapped)
        console.log('📷 Cámaras disponibles:', mapped)
        
        // Para MacBook: preferir cámara frontal, para móvil: cámara trasera
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const preferredCamera = isMobile 
          ? mapped.find(c => /back|trasera|environment/i.test(c.label))
          : mapped.find(c => /front|frontal|user|facetime/i.test(c.label))
        
        const selectedCamera = preferredCamera || mapped[0]
        console.log('🎯 Cámara seleccionada:', selectedCamera)
        setSelectedCameraId(selectedCamera?.id || null)
      } catch (e) {
        console.error('Error listando cámaras:', e)
      }
    })()
  }, [])

  // Iniciar / detener el scanner cuando cambia isScanning
  useEffect(() => {
    if (isScanning && videoRef.current) {
      // Establecer worker (usar CDN); si falla, el scanner lanzará error
      QrScanner.WORKER_PATH = 'https://unpkg.com/qr-scanner@1.4.2/qr-scanner-worker.min.js'

      console.log('🎥 Inicializando QrScanner con cámara:', selectedCameraId)
      
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('🎯 Scanner callback ejecutado:', result)
          if (result?.data) {
            console.log('✅ Scanner callback detectó QR:', result.data.substring(0, 50) + '...')
            handleScan(result.data)
          } else {
            console.log('⚠️ Scanner callback: result.data es vacío')
          }
        },
        {
          preferredCamera: selectedCameraId || 'user',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 10, // Máxima frecuencia posible
          returnDetailedScanResult: true,
          calculateScanRegion: (video: HTMLVideoElement) => {
            // Escanear solo el centro del video para mejor performance
            const smaller = Math.min(video.videoWidth, video.videoHeight)
            const regionSize = Math.round(0.7 * smaller)
            return {
              x: Math.round((video.videoWidth - regionSize) / 2),
              y: Math.round((video.videoHeight - regionSize) / 2),
              width: regionSize,
              height: regionSize,
            }
          }
        } as any
      )

      const startScanner = async () => {
        try {
          await scanner.start()
          if (selectedCameraId) {
            try { await scanner.setCamera(selectedCameraId) } catch {}
          }
          
          // Debug: mostrar información del video
          setTimeout(() => {
            if (videoRef.current) {
              console.log('🎥 Info del video:', {
                videoWidth: videoRef.current.videoWidth,
                videoHeight: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState,
                srcObject: !!videoRef.current.srcObject
              })
            }
          }, 1000)
          // Iniciar fallback de escaneo manual si no llegan resultados del worker
          if (manualScanIntervalRef.current) {
            window.clearInterval(manualScanIntervalRef.current)
            manualScanIntervalRef.current = null
          }
          manualScanIntervalRef.current = window.setInterval(async () => {
            if (!videoRef.current) {
              console.log('⚠️ Manual scan: videoRef.current es null')
              return
            }
            try {
              // Escaneo más agresivo con múltiples regiones
              const scanRegions = [
                null, // Escaneo completo
                { x: 0.2, y: 0.2, width: 0.6, height: 0.6 }, // Centro
                { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, // Área grande
              ]
              
              for (const scanRegion of scanRegions) {
                try {
                  const result = await QrScanner.scanImage(videoRef.current, scanRegion, undefined, undefined, undefined, true)
                  const data = (result as any)?.data || (result as any)
                  if (data) {
                    console.log('✅ Manual scan detectó QR:', data.substring(0, 50) + '...')
                    handleScan(data)
                    return // Salir del loop si encontramos algo
                  }
                } catch (innerE) {
                  // Continuar con el siguiente intento
                }
              }
              
              // Solo loguear cada 20 intentos para no spamear
              if (Math.random() < 0.05) console.log('🔍 Manual scan: No QR encontrado tras múltiples intentos')
              
            } catch (e: any) {
              const msg = e?.message || String(e)
              if (!msg || /No QR code found|No MultiFormat Readers|NotFound/i.test(msg)) return
              console.error('❌ Error en manual scan:', e)
            }
          }, 300)
        } catch (e) {
          handleError(e)
        }
      }

      scannerRef.current = scanner
      startScanner()
    }

    return () => {
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
      if (manualScanIntervalRef.current) {
        window.clearInterval(manualScanIntervalRef.current)
        manualScanIntervalRef.current = null
      }
    }
  }, [isScanning, selectedCameraId])

  const handleScan = (data: string | null) => {
    console.log('🔍 handleScan called with:', data)
    
    if (data) {
      console.log('✅ QR escaneado con éxito:', data.substring(0, 100) + '...')
      
      toast({
        title: "✅ QR Detectado",
        description: "Procesando código...",
      })
      
      setQrData(data)
      setIsScanning(false)
      handleValidateQr(data)
    } else {
      console.log('⚠️ handleScan: data es null o vacío')
    }
  }

  const handleError = (err: any) => {
    // Filtrar errores comunes que no son realmente problemas
    const commonErrors = [
      'No MultiFormat Readers',
      'selectBestPatterns',
      'NotFoundException',
      'Dimensions'
    ]
    
    const isCommonError = commonErrors.some(errorType => 
      err?.message?.includes(errorType) || err?.toString()?.includes(errorType)
    )
    
    if (isCommonError) {
      // No logear errores comunes de "no se encontró QR"
      return
    }
    
    console.error('Error del scanner:', err)
    if (err?.name === 'NotAllowedError') {
      setError('Permisos de cámara denegados. Por favor, permite el acceso en tu navegador.')
    } else if (err?.name === 'NotFoundError') {
      setError('No se encontró ninguna cámara en tu dispositivo.')
    } else if (!isCommonError) {
      setError(`Error de cámara: ${err?.message || 'Error desconocido'}`)
    }
  }

  const handleStartCamera = async () => {
    // Reiniciar constraints por si hubo fallback previo
    setVideoConstraints(DEFAULT_CONSTRAINTS)
    setError(null)
    try {
      // Solicitar permiso explícitamente para desbloquear la cámara en Safari/Chrome
      const stream = await navigator.mediaDevices.getUserMedia({ video: DEFAULT_CONSTRAINTS })
      stream.getTracks().forEach(t => t.stop())
    } catch (e) {
      handleError(e)
      return
    }
    setIsScanning(true)
    toast({
      title: "📷 Cámara activada",
      description: "Enfoca el código QR de la reserva",
    })
  }

  const handleStopCamera = () => {
    scannerRef.current?.stop()
    setIsScanning(false)
    toast({
      title: "📷 Cámara detenida",
      description: "Escaneo cancelado",
      variant: "destructive"
    })
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
      const data = (result as any)?.data || (result as any)
      if (data) {
        setQrData(data)
        handleValidateQr(data)
      } else {
        setError('No se pudo leer un código QR en la imagen seleccionada')
      }
    } catch (e) {
      setError('No se pudo leer un código QR en la imagen seleccionada')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleManualInput = () => {
    // Para testing manual - permite pegar un QR real
    const qrInput = prompt('Pega aquí el contenido del QR escaneado:')
    if (qrInput && qrInput.trim()) {
      setQrData(qrInput.trim())
      handleValidateQr(qrInput.trim())
    }
  }

  // Función para tomar captura del video y ayudar con debug
  const takeVideoSnapshot = () => {
    if (!videoRef.current) return null
    
    const canvas = document.createElement('canvas')
    const video = videoRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      console.log('📸 Captura tomada del video:', {
        width: canvas.width,
        height: canvas.height,
        dataURL: canvas.toDataURL('image/jpeg', 0.8).substring(0, 100) + '...'
      })
      return canvas.toDataURL('image/jpeg', 0.8)
    }
    return null
  }

  const handleValidateQr = async (qrDataToValidate: string) => {
    try {
      setIsValidating(true)
      setError(null)
      
      console.log('🔍 Validando QR:', qrDataToValidate.substring(0, 100) + '...')
      
      // Llamada REAL al backend para verificar el QR
      const response = await fetch(`${getClientApiUrl()}/reservas/verificar-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ qrData: qrDataToValidate }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Respuesta del backend:', result)
      
      if (result.qrValido && result.reservaCompleta) {
        // Usar datos REALES del backend
        const reservaData: DatosCheckinResponse = result.reservaCompleta
        
        // Convertir fechas string a Date objects si es necesario
        if (typeof reservaData.reserva.fechaInicio === 'string') {
          reservaData.reserva.fechaInicio = new Date(reservaData.reserva.fechaInicio)
        }
        if (typeof reservaData.reserva.fechaFin === 'string') {
          reservaData.reserva.fechaFin = new Date(reservaData.reserva.fechaFin)
        }

        setScanResult({
          qrValido: true,
          reserva: {
            id: reservaData.reserva.id,
            codigo: reservaData.reserva.codigo,
            hospedaje: reservaData.reserva.hospedaje,
            fechaInicio: reservaData.reserva.fechaInicio,
            fechaFin: reservaData.reserva.fechaFin,
            turista: {
              nombre: reservaData.titular.nombre,
              apellido: reservaData.titular.apellido,
              email: reservaData.titular.email || '',
              telefono: reservaData.titular.telefono || '',
              dni: reservaData.titular.dni
            },
            habitaciones: reservaData.habitaciones.map(h => ({
              nombre: h.nombre,
              personas: h.personasReservadas
            })),
            totalHuespedes: reservaData.habitaciones.reduce((total, h) => total + h.personasReservadas, 0),
            huespedesAdicionales: Math.max(0, reservaData.habitaciones.reduce((total, h) => total + h.personasReservadas, 0) - 1)
          }
        })

        toast({
          title: "✅ QR Válido",
          description: `Reserva ${reservaData.reserva.codigo} verificada correctamente`,
        })

        // Auto-continuar después de 1.5 segundos
        setTimeout(() => {
          onComplete(qrDataToValidate, reservaData)
        }, 1500)
      } else {
        throw new Error('QR inválido o reserva no encontrada')
      }

    } catch (error) {
      console.error('❌ Error validando QR:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido verificando QR'
      setError(errorMessage)
      setScanResult(null)
      
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsValidating(false)
      setIsScanning(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  }

  return (
    <div className="space-y-6">
      {/* Scanner Controls */}
      {!scanResult && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center">
              <QrCode className="mr-2 h-6 w-6 text-orange-600" />
              Escanear Código QR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Scanner */}
            {isScanning && (
              <div className="relative w-full max-w-md mx-auto">
                <div className="border-2 border-orange-300 rounded-lg overflow-hidden w-full h-64">
                                      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />                      
                </div>
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                  Enfoca el código QR
                </div>
              </div>
            )}

            {/* Controles de escaneo */}
            <div className="grid gap-3 md:grid-cols-3">
              {!isScanning ? (
                <Button
                  onClick={handleStartCamera}
                  disabled={isValidating}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Usar Cámara
                </Button>
              ) : (
                <Button
                  onClick={handleStopCamera}
                  variant="destructive"
                  className="w-full"
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Detener Cámara
                </Button>
              )}

              <Button
                onClick={handleManualInput}
                disabled={isScanning || isValidating}
                variant="outline"
                className="w-full"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Demo QR
              </Button>

              <div className="w-full">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning || isValidating}
                  variant="outline"
                  className="w-full"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Subir Imagen
                </Button>
              </div>
            </div>

            {/* Botón de debug - solo visible cuando está escaneando */}
            {isScanning && (
              <div className="mt-2">
                <Button
                  onClick={() => takeVideoSnapshot()}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  📸 Captura Debug (Ver Console)
                </Button>
              </div>
            )}



            {/* Estado de validación */}
            {isValidating && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Validando código QR...
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selector de cámara si hay múltiples */}
      {isScanning && availableCameras.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Cámara:</span>
          <select
            className="border rounded px-2 py-1"
            value={selectedCameraId || ''}
            onChange={async (e) => {
              const id = e.target.value
              setSelectedCameraId(id)
              try { await scannerRef.current?.setCamera(id) } catch {}
            }}
          >
            {availableCameras.map(cam => (
              <option key={cam.id} value={cam.id}>{cam.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Scan Result */}
      {scanResult?.qrValido && scanResult.reserva && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="mr-2 h-5 w-5" />
              Reserva Encontrada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Información de la reserva */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {scanResult.reserva.codigo}
                  </Badge>
                  <span className="text-sm font-medium">{scanResult.reserva.hospedaje}</span>
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>
                    {formatDate(scanResult.reserva.fechaInicio)} - {formatDate(scanResult.reserva.fechaFin)}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-sm">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span>
                    {scanResult.reserva.totalHuespedes} huéspedes total
                  </span>
                </div>
              </div>

              {/* Información del titular */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">
                    {scanResult.reserva.turista.nombre} {scanResult.reserva.turista.apellido}
                  </span>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Email: {scanResult.reserva.turista.email}</p>
                  {scanResult.reserva.turista.telefono && (
                    <p>Teléfono: {scanResult.reserva.turista.telefono}</p>
                  )}
                  {scanResult.reserva.turista.dni && (
                    <p>DNI: {scanResult.reserva.turista.dni}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Habitaciones */}
            <div>
              <h4 className="font-medium text-sm mb-3 flex items-center">
                <Home className="mr-2 h-4 w-4" />
                Habitaciones Reservadas
              </h4>
              <div className="space-y-2">
                {scanResult.reserva.habitaciones.map((habitacion, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-white rounded border">
                    <span className="text-sm font-medium">{habitacion.nombre}</span>
                    <Badge variant="outline">
                      {habitacion.personas} {habitacion.personas === 1 ? 'persona' : 'personas'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Continuando al siguiente paso automáticamente...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}