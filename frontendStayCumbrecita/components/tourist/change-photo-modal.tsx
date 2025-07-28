"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, X, Camera } from "lucide-react"
import { toast } from "sonner"
import { updateProfileImage } from "@/app/actions/auth/updateProfileImage"
import Image from "next/image"

interface ChangePhotoModalProps {
  isOpen: boolean
  onClose: () => void
  onImageUpdated: (imageUrl: string) => void
  currentImageUrl?: string
}

export function ChangePhotoModal({ isOpen, onClose, onImageUpdated, currentImageUrl }: ChangePhotoModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido")
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede ser mayor a 5MB")
      return
    }

    setSelectedFile(file)
    
    // Crear preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Por favor selecciona una imagen")
      return
    }

    try {
      setIsUploading(true)
      
      const formData = new FormData()
      formData.append("image", selectedFile)
      
      const response = await updateProfileImage(formData)
      
      if (response.success && response.imageUrl) {
        toast.success("Foto de perfil actualizada correctamente")
        onImageUpdated(response.imageUrl)
        handleClose()
      } else {
        toast.error(response.error || "No se pudo actualizar la foto")
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Error al subir la imagen")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onClose()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.type.startsWith("image/")) {
        // Simular el evento de selección de archivo
        const mockEvent = {
          target: { files: [file] }
        } as unknown as React.ChangeEvent<HTMLInputElement>
        handleFileSelect(mockEvent)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Cambiar foto de perfil
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Área de preview */}
          <div className="flex justify-center">
            <div className="relative">
              {previewUrl ? (
                <div className="relative">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    width={150}
                    height={150}
                    className="rounded-full object-cover border-4 border-gray-200"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ""
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : currentImageUrl ? (
                <Image
                  src={currentImageUrl}
                  alt="Foto actual"
                  width={150}
                  height={150}
                  className="rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-[150px] h-[150px] rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                  <Camera className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Área de drag and drop */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Arrastra una imagen aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, GIF hasta 5MB
            </p>
          </div>

          {/* Input oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Información del archivo seleccionado */}
          {selectedFile && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isUploading ? "Subiendo..." : "Actualizar foto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 