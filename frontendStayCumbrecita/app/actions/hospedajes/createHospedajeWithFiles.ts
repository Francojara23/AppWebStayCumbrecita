"use server";

import { cookies } from "next/headers";
import { HospedajeFormData, HospedajeCreationResult, FileUploadResult } from "@/lib/types/hospedaje";
import { getApiUrl } from "@/lib/utils/api-urls";

const API_BASE_URL = getApiUrl();

// Función para crear el hospedaje básico
async function createBasicHospedaje(formData: Omit<HospedajeFormData, 'tempDocuments' | 'tempImages'>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) {
    throw new Error("Token de autenticación no encontrado");
  }

  const response = await fetch(`${API_BASE_URL}/hospedajes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.value}`,
    },
    body: JSON.stringify({
      nombre: formData.nombre,
      descripcionCorta: formData.descripcionCorta,
      descripcionLarga: formData.descripcionLarga,
      tipoHotelId: formData.tipoHotelId,
      estado: formData.estado,
      documentoInscripcion: formData.documentoInscripcion || undefined,
      responsable: formData.responsable,
      telefonoContacto: formData.telefonoContacto,
      mailContacto: formData.mailContacto,
      direccion: formData.direccion,
      servicios: formData.servicios,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Función para subir un documento
async function uploadSingleDocument(hospedajeId: string, document: any): Promise<FileUploadResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
      return { success: false, error: "Token de autenticación no encontrado" };
    }

    const formData = new FormData();
    formData.append("file", document.file);
    formData.append("nombre", document.nombre);
    if (document.descripcion) {
      formData.append("descripcion", document.descripcion);
    }

    const response = await fetch(`${API_BASE_URL}/hospedajes/${hospedajeId}/documentos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `Error ${response.status}: ${response.statusText}` 
      };
    }

    return { success: true, message: `Documento ${document.nombre} subido exitosamente` };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido al subir documento" 
    };
  }
}

// Función para subir una imagen
async function uploadSingleImage(hospedajeId: string, image: any): Promise<FileUploadResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
      return { success: false, error: "Token de autenticación no encontrado" };
    }

    const formData = new FormData();
    formData.append("file", image.file);
    if (image.descripcion) {
      formData.append("descripcion", image.descripcion);
    }
    if (image.orden !== undefined) {
      formData.append("orden", image.orden.toString());
    }

    const response = await fetch(`${API_BASE_URL}/hospedajes/${hospedajeId}/imagenes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `Error ${response.status}: ${response.statusText}` 
      };
    }

    return { success: true, message: "Imagen subida exitosamente" };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido al subir imagen" 
    };
  }
}

// Función para subir múltiples imágenes en una sola llamada (más eficiente)
async function uploadMultipleImages(hospedajeId: string, images: any[]): Promise<FileUploadResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
      return { success: false, error: "Token de autenticación no encontrado" };
    }

    const formData = new FormData();
    
    // Agregar todos los archivos
    images.forEach((image, index) => {
      formData.append("files", image.file);
    });

    // Agregar descripciones como JSON string
    const descripciones = images.map(img => img.descripcion || "");
    formData.append("descripciones", JSON.stringify(descripciones));

    // Agregar órdenes como JSON string
    const ordenes = images.map(img => img.orden || undefined);
    formData.append("ordenes", JSON.stringify(ordenes));

    const response = await fetch(`${API_BASE_URL}/hospedajes/${hospedajeId}/imagenes/multiple`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `Error ${response.status}: ${response.statusText}` 
      };
    }

    return { success: true, message: `${images.length} imágenes subidas exitosamente` };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido al subir imágenes" 
    };
  }
}

// Función principal para crear hospedaje con archivos
export async function createHospedajeWithFiles(formData: HospedajeFormData): Promise<HospedajeCreationResult> {
  try {
    // 1. Crear hospedaje básico
    const hospedaje = await createBasicHospedaje(formData);
    const hospedajeId = hospedaje.id;

    // 2. Subir documentos y imágenes en paralelo
    const documentPromises = formData.tempDocuments.map(doc => 
      uploadSingleDocument(hospedajeId, doc)
    );
    
    // Para imágenes, usar endpoint múltiple si hay más de una, sino individual
    let imageResults: FileUploadResult[];
    if (formData.tempImages.length > 1) {
      // Usar endpoint de múltiples imágenes (más eficiente)
      imageResults = [await uploadMultipleImages(hospedajeId, formData.tempImages)];
    } else if (formData.tempImages.length === 1) {
      // Usar endpoint individual
      imageResults = [await uploadSingleImage(hospedajeId, formData.tempImages[0])];
    } else {
      // Sin imágenes
      imageResults = [];
    }

    // 3. Esperar todas las subidas de documentos
    const documentResults = await Promise.all(documentPromises);

    // 4. Verificar resultados
    const failedDocuments = documentResults.filter(result => !result.success);
    const failedImages = imageResults.filter(result => !result.success);

    const hasFailures = failedDocuments.length > 0 || failedImages.length > 0;

    // 5. 🔄 Actualizar hospedaje con el documento de inscripción si existe
    if (formData.tempDocuments.length > 0 && documentResults.some(result => result.success)) {
      // Buscar si hay un documento que sea la constancia de inscripción
      const constanciaDocIndex = formData.tempDocuments.findIndex(doc => 
        doc.nombre.toLowerCase().includes('constancia') || 
        doc.nombre.toLowerCase().includes('inscripcion')
      );
      
      if (constanciaDocIndex !== -1 && documentResults[constanciaDocIndex]?.success) {
        console.log('🔄 Obteniendo ID del documento de inscripción subido...');
        try {
          // Obtener el ID del documento subido desde el backend
          const documentoId = await getDocumentoIdFromBackend(hospedajeId, formData.tempDocuments[constanciaDocIndex].nombre);
          if (documentoId) {
            await updateHospedajeDocumentoInscripcion(hospedajeId, documentoId);
          }
        } catch (updateError) {
          console.warn('⚠️ No se pudo actualizar el documento de inscripción:', updateError);
          // No fallar todo el proceso por esto
        }
      }
    }

    return {
      success: !hasFailures,
      hospedajeId,
      message: hasFailures 
        ? `Hospedaje creado pero algunos archivos fallaron. Documentos fallidos: ${failedDocuments.length}, Imágenes fallidas: ${failedImages.length}`
        : "Hospedaje creado exitosamente con todos los archivos",
      fileUploadResults: {
        documents: documentResults,
        images: imageResults
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear hospedaje"
    };
  }
}

/**
 * Obtiene el ID del documento subido desde el backend
 */
async function getDocumentoIdFromBackend(hospedajeId: string, nombreDocumento: string): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) {
    throw new Error("Token de autenticación no encontrado");
  }

  const response = await fetch(`${API_BASE_URL}/hospedajes/${hospedajeId}/documentos`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token.value}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Error al obtener documentos: ${response.statusText}`);
  }

  const documentos = await response.json();
  
  // Buscar el documento por nombre
  const documento = documentos.find((doc: any) => doc.nombre === nombreDocumento);
  
  return documento ? documento.id : null;
}

/**
 * Actualiza el campo documentoInscripcion del hospedaje con el ID del documento
 */
async function updateHospedajeDocumentoInscripcion(hospedajeId: string, documentoId: string): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) {
    throw new Error("Token de autenticación no encontrado");
  }

  const response = await fetch(`${API_BASE_URL}/hospedajes/${hospedajeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token.value}`,
    },
    body: JSON.stringify({
      documentoInscripcion: documentoId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Error al actualizar documento de inscripción: ${errorData.message || response.statusText}`);
  }

  console.log('✅ Documento de inscripción actualizado correctamente con ID:', documentoId);
} 