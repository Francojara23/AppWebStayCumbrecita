"use client";

import { X, FileText, Image, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TempDocument, TempImage } from "@/lib/types/hospedaje";

interface TempFilesListProps {
  documents: TempDocument[];
  images: TempImage[];
  onRemoveDocument: (id: string) => void;
  onRemoveImage: (id: string) => void;
}

export default function TempFilesList({
  documents,
  images,
  onRemoveDocument,
  onRemoveImage,
}: TempFilesListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (documents.length === 0 && images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Documentos */}
      {documents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Documentos ({documents.length})
          </h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.nombre}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {doc.file.type || "Documento"}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(doc.file.size)}
                      </span>
                    </div>
                    {doc.descripcion && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {doc.descripcion}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDocument(doc.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Imágenes */}
      {images.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Imágenes ({images.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group bg-gray-50 rounded-lg border overflow-hidden"
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <Image className="h-12 w-12 text-gray-400" />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {img.file.type || "Imagen"}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {formatFileSize(img.file.size)}
                        </span>
                      </div>
                      {img.descripcion && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {img.descripcion}
                        </p>
                      )}
                      {img.orden !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          Orden: {img.orden}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveImage(img.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 