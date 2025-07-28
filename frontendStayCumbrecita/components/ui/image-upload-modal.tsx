"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { TempImage } from "@/lib/types/hospedaje";
import { compressImage, calculateTotalSize, formatFileSize as formatSize } from "@/lib/utils/imageCompression";

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddImage: (image: Omit<TempImage, 'id'>) => void;
}

interface SelectedImageFile {
  file: File;
  previewUrl: string;
  descripcion: string;
  orden?: number;
}

export default function ImageUploadModal({
  isOpen,
  onClose,
  onAddImage,
}: ImageUploadModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<SelectedImageFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  const acceptedFileTypes = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "image/gif": [".gif"],
    "image/webp": [".webp"],
  };

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFilesSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelect = async (files: File[]) => {
    setIsCompressing(true);
    setCompressionProgress(0);

    try {
      const validFiles: SelectedImageFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validar tipo de archivo
        if (!Object.keys(acceptedFileTypes).includes(file.type)) {
          alert(`${file.name}: Tipo de archivo no permitido. Solo se permiten imágenes JPG, PNG, GIF y WebP.`);
          continue;
        }

        // Comprimir imagen si es necesaria
        let processedFile = file;
        if (file.size > 2 * 1024 * 1024) { // Si es mayor a 2MB, comprimir
          try {
            processedFile = await compressImage(file, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
              maxSizeKB: 2048
            });
          } catch (error) {
            console.error(`Error comprimiendo ${file.name}:`, error);
            alert(`Error al procesar ${file.name}. Se usará el archivo original.`);
          }
        }

        // Validar tamaño final
        if (processedFile.size > maxFileSize) {
          alert(`${file.name}: El archivo es demasiado grande incluso después de la compresión. El tamaño máximo es 10MB.`);
          continue;
        }

        // Crear preview de la imagen
        const previewUrl = URL.createObjectURL(processedFile);
        const newFile: SelectedImageFile = {
          file: processedFile,
          previewUrl,
          descripcion: "",
          orden: undefined,
        };
        
        validFiles.push(newFile);
        
        // Actualizar progreso
        setCompressionProgress(Math.round(((i + 1) / files.length) * 100));
      }

      // Verificar tamaño total
      const totalSize = calculateTotalSize(validFiles.map(f => f.file));
      if (totalSize > 40 * 1024 * 1024) { // 40MB máximo total
        alert(`El tamaño total de las imágenes (${formatSize(totalSize)}) excede el límite de 40MB. Por favor, selecciona menos imágenes o imágenes más pequeñas.`);
        return;
      }

      setSelectedFiles(prev => [...prev, ...validFiles]);
      
    } finally {
      setIsCompressing(false);
      setCompressionProgress(0);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelect(Array.from(e.target.files));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateFileData = (index: number, field: 'descripcion' | 'orden', value: string | number | undefined) => {
    setSelectedFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, [field]: value } : file
    ));
  };

  const handleAddImages = () => {
    if (selectedFiles.length === 0) {
      alert("Por favor selecciona al menos una imagen.");
      return;
    }

    // Agregar cada imagen al formulario principal
    selectedFiles.forEach((selectedFile) => {
      // Validación de seguridad adicional
      if (!selectedFile.file) {
        console.error('Archivo nulo detectado en selectedFile:', selectedFile);
        return;
      }

      const image: Omit<TempImage, 'id'> = {
        file: selectedFile.file,
        descripcion: selectedFile.descripcion.trim() || undefined,
        orden: selectedFile.orden,
      };
      onAddImage(image);
    });

    handleClose();
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setDragActive(false);
    onClose();
  };

  // Usar la función importada para formatear tamaños
  const formatFileSize = formatSize;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Imágenes</DialogTitle>
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
              multiple
              onChange={handleFileInputChange}
              accept={Object.values(acceptedFileTypes).flat().join(",")}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {isCompressing ? (
              <div className="space-y-3">
                <Loader2 className="mx-auto h-12 w-12 text-orange-500 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Procesando imágenes...
                  </p>
                  <p className="text-xs text-gray-500">
                    Progreso: {compressionProgress}%
                  </p>
                </div>
              </div>
            ) : selectedFiles.length > 0 ? (
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFiles.length} imagen{selectedFiles.length > 1 ? 'es' : ''} seleccionada{selectedFiles.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-500">
                    Tamaño total: {formatSize(calculateTotalSize(selectedFiles.map(f => f.file)))}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Arrastra imágenes aquí o haz clic para seleccionar
                  </p>
                  <p className="text-xs text-gray-500">
                    JPG, PNG, GIF, WebP (se comprimirán automáticamente si es necesario)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lista de imágenes seleccionadas */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">
                Imágenes seleccionadas ({selectedFiles.length})
              </h3>
              <div className="max-h-96 overflow-y-auto">
                {selectedFiles.length === 1 ? (
                  // Vista individual para una sola imagen
                  <div className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img
                        src={selectedFiles[0].previewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {selectedFiles[0].file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(selectedFiles[0].file.size)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Descripción (opcional)"
                          value={selectedFiles[0].descripcion}
                          onChange={(e) => handleUpdateFileData(0, 'descripcion', e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Orden de visualización"
                          value={selectedFiles[0].orden || ""}
                          onChange={(e) => handleUpdateFileData(0, 'orden', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(0)}
                      className="text-red-500 hover:text-red-700 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  // Vista en cuadrícula para múltiples imágenes
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedFiles.map((selectedFile, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <img
                              src={selectedFile.previewUrl}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {selectedFile.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(selectedFile.file.size)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            className="text-red-500 hover:text-red-700 flex-shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Descripción (opcional)"
                            value={selectedFile.descripcion}
                            onChange={(e) => handleUpdateFileData(index, 'descripcion', e.target.value)}
                            rows={2}
                            className="text-xs resize-none"
                          />
                          <Input
                            type="number"
                            min="1"
                            placeholder="Orden"
                            value={selectedFile.orden || ""}
                            onChange={(e) => handleUpdateFileData(index, 'orden', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddImages}
              disabled={selectedFiles.length === 0 || isCompressing}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
            >
              {isCompressing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  Agregar {selectedFiles.length} Imagen{selectedFiles.length !== 1 ? 'es' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 