"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { uploadDocument } from "@/app/actions/hospedajes/uploadDocument"
import { TempDocument } from "@/lib/types/hospedaje"

interface DocumentUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onAddDocument: (document: Omit<TempDocument, 'id'>) => void
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onAddDocument,
}: DocumentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [dragActive, setDragActive] = useState(false)

  const acceptedFileTypes = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    "application/vnd.ms-excel": [".xls"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
  }

  const maxFileSize = 10 * 1024 * 1024 // 10MB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (file: File) => {
    // Validar tipo de archivo
    if (!Object.keys(acceptedFileTypes).includes(file.type)) {
      toast({
        title: "Tipo de archivo no permitido",
        description: "Solo se permiten PDF, Word, Excel e imágenes.",
        variant: "destructive",
      })
      return
    }

    // Validar tamaño
    if (file.size > maxFileSize) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo es 10MB.",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    
    // Auto-completar el nombre si está vacío
    if (!nombre) {
      const fileName = file.name.split('.').slice(0, -1).join('.')
      setNombre(fileName)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  const handleAddDocument = () => {
    if (!selectedFile || !nombre.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor selecciona un archivo y proporciona un nombre.",
        variant: "destructive",
      })
      return
    }

    const document: Omit<TempDocument, 'id'> = {
      file: selectedFile,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
    }

    onAddDocument(document)
    handleClose()
  }

  const handleClose = () => {
    setSelectedFile(null)
    setNombre("")
    setDescripcion("")
    setDragActive(false)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Documento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de subida de archivos */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? "border-orange-500 bg-orange-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={handleFileInputChange}
              accept={Object.values(acceptedFileTypes).flat().join(",")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="mx-auto h-12 w-12 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Quitar archivo
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Arrastra un archivo aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, Word, Excel, imágenes (máx. 10MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Campos del formulario */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="nombre">Nombre del documento *</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Certificado de habilitación"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Descripción adicional del documento"
                className="mt-1"
                rows={3}
              />
            </div>


          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddDocument}
              disabled={!selectedFile || !nombre.trim()}
            >
              Agregar Documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 