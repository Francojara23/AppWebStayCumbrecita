"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { Upload, FileText, MessageSquare, CheckCircle, ArrowLeft, ArrowRight, Bot } from "lucide-react"
import { useUserPermissions, useCanManageHospedaje } from "@/hooks/use-user-permissions"
import { uploadPdf } from "@/app/actions/chatbot/uploadPdf"
import { updateTono } from "@/app/actions/chatbot/updateTono"
import { getConfiguration } from "@/app/actions/chatbot/getConfiguration"
import { markTrained } from "@/app/actions/chatbot/markTrained"

// Tipos
interface ChatbotConfig {
  id: string
  hospedajeId: string
  pdfUrl: string
  pdfFilename: string
  tono: 'formal' | 'cordial' | 'juvenil' | 'amigable' | 'corporativo'
  isActive: boolean
  isTrained: boolean
  createdAt: string
  updatedAt: string
}

type TonoChatbot = 'formal' | 'cordial' | 'juvenil' | 'amigable' | 'corporativo'

const TONOS: { value: TonoChatbot; label: string; description: string }[] = [
  { value: 'formal', label: 'Formal', description: 'Profesional y respetuoso' },
  { value: 'cordial', label: 'Cordial', description: 'Amable y cálido' },
  { value: 'juvenil', label: 'Juvenil', description: 'Dinámico y moderno' },
  { value: 'amigable', label: 'Amigable', description: 'Cercano y accesible' },
  { value: 'corporativo', label: 'Corporativo', description: 'Serio y ejecutivo' }
]

export default function ChatbotConfigPage() {
  const params = useParams()
  const router = useRouter()
  const hospedajeId = params.hospedajeId as string
  
  const userPermissions = useUserPermissions()
  const canManageHospedaje = useCanManageHospedaje(hospedajeId)
  
  // Estados del wizard
  const [currentStep, setCurrentStep] = useState(1)
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados del formulario
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedTono, setSelectedTono] = useState<TonoChatbot>('cordial')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Cargar configuración existente
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const result = await getConfiguration(hospedajeId)
        if (result.success && result.data) {
          setConfig(result.data)
          setSelectedTono(result.data.tono)
          setCurrentStep(result.data.isTrained ? 3 : 2)
        }
      } catch (error) {
        console.error('Error loading config:', error)
      } finally {
        setLoading(false)
      }
    }

    if (hospedajeId) {
      loadConfig()
    }
  }, [hospedajeId])

  // Verificar permisos
  if (userPermissions.isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Bot className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p>Cargando configuración del chatbot...</p>
        </div>
      </div>
    )
  }

  if (!canManageHospedaje) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Sin permisos</CardTitle>
            <CardDescription className="text-center">
              No tienes permisos para gestionar la configuración del chatbot
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Manejar subida de archivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Error",
          description: "Solo se permiten archivos PDF",
          variant: "destructive",
        })
        return
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "Error",
          description: "El archivo no puede superar los 10MB",
          variant: "destructive",
        })
        return
      }
      
      setSelectedFile(file)
    }
  }

  // Subir PDF
  const handleUploadPdf = async () => {
    if (!selectedFile) return
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('hospedajeId', hospedajeId)
      formData.append('tono', selectedTono)
      
      const result = await uploadPdf(formData)
      
      if (result.success) {
        setConfig(result.data)
        setCurrentStep(2)
        toast({
          title: "PDF subido exitosamente",
          description: "Ahora puedes configurar el tono del chatbot",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al subir el PDF. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al subir el PDF. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  // Actualizar tono
  const handleUpdateTono = async () => {
    if (!config) return
    
    setSaving(true)
    try {
      const result = await updateTono(hospedajeId, selectedTono)
      
      if (result.success) {
        setConfig(result.data)
        setCurrentStep(3)
        toast({
          title: "Tono actualizado",
          description: "La configuración ha sido guardada exitosamente",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al actualizar el tono. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el tono. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Marcar como entrenado
  const handleMarkTrained = async () => {
    if (!config) return
    
    setSaving(true)
    try {
      const result = await markTrained(hospedajeId)
      
      if (result.success) {
        setConfig({ ...config, isTrained: true })
        toast({
          title: "Configuración completada",
          description: "El chatbot está listo para usar",
        })
        
        // Redirigir a la página principal de chatbots después de un breve delay
        setTimeout(() => {
          router.push('/adminABM/chatbot')
        }, 1500)
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al finalizar la configuración. Intenta nuevamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al finalizar la configuración. Intenta nuevamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Renderizar paso 1: Subir PDF
  const renderStep1 = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Paso 1: Subir documento PDF
        </CardTitle>
        <CardDescription>
          Sube un documento PDF con información sobre tu hospedaje que el chatbot usará para responder consultas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <Label htmlFor="pdf-upload" className="cursor-pointer">
            <span className="text-sm font-medium">Seleccionar archivo PDF</span>
            <Input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </Label>
          <p className="text-sm text-gray-500 mt-2">
            Máximo 10MB. Solo archivos PDF.
          </p>
        </div>
        
        {selectedFile && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <Button
            onClick={handleUploadPdf}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Subiendo..." : "Continuar"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Renderizar paso 2: Elegir tono
  const renderStep2 = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Paso 2: Elegir tono de conversación
        </CardTitle>
        <CardDescription>
          Selecciona el tono que quieres que use el chatbot al interactuar con los huéspedes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {TONOS.map((tono) => (
            <div
              key={tono.value}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedTono === tono.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTono(tono.value)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedTono === tono.value
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300'
                }`} />
                <div>
                  <h3 className="font-medium">{tono.label}</h3>
                  <p className="text-sm text-gray-600">{tono.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <Button
            onClick={handleUpdateTono}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Continuar"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  // Renderizar paso 3: Confirmar
  const renderStep3 = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Paso 3: Confirmar configuración
        </CardTitle>
        <CardDescription>
          Revisa la configuración del chatbot antes de finalizar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">Documento PDF</h3>
            <p className="text-sm text-gray-600">
              {config?.pdfFilename || 'No especificado'}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">Tono seleccionado</h3>
            <p className="text-sm text-gray-600">
              {TONOS.find(t => t.value === selectedTono)?.label} - {TONOS.find(t => t.value === selectedTono)?.description}
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Configuración lista</p>
                <p className="text-sm text-green-600">
                  El chatbot está configurado y listo para usar
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(2)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <div className="flex gap-2">
            {config?.isTrained && (
              <Button
                variant="outline"
                onClick={() => router.push('/adminABM/chatbot')}
              >
                Volver a la lista
              </Button>
            )}
            <Button
              onClick={config?.isTrained ? () => router.push('/adminABM/chatbot') : handleMarkTrained}
              disabled={saving}
            >
              {saving ? "Finalizando..." : config?.isTrained ? "Completado" : "Finalizar"}
              <CheckCircle className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuración del Chatbot</h1>
        <p className="text-gray-600">
          Configura el chatbot para tu hospedaje en 3 sencillos pasos
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso</span>
          <span className="text-sm text-gray-600">{currentStep}/3</span>
        </div>
        <Progress value={(currentStep / 3) * 100} className="h-2" />
      </div>

      {/* Wizard steps */}
      <div className="mb-8">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </div>
  )
} 