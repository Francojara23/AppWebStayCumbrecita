"use server";

import { cookies } from "next/headers";
import { HabitacionFormData, HabitacionCreationResult, FileUploadResult } from "@/lib/types/habitacion";
import { getApiUrl } from "@/lib/utils/api-urls";

const API_BASE_URL = getApiUrl();

// Función para crear la habitación básica
async function createBasicHabitacion(hospedajeId: string, formData: Omit<HabitacionFormData, 'tempImages'>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");

  if (!token) {
    throw new Error("Token de autenticación no encontrado");
  }

  const response = await fetch(`${API_BASE_URL}/hospedajes/${hospedajeId}/habitaciones`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.value}`,
    },
    body: JSON.stringify({
      nombre: formData.nombre,
      descripcionCorta: formData.descripcionCorta,
      descripcionLarga: formData.descripcionLarga,
      tipoHabitacionId: formData.tipoHabitacionId,
      capacidad: formData.capacidad,
      precioBase: formData.precioBase,
      ajustesPrecio: formData.ajustesPrecio || [],
      imagenes: [], // Se agregan después
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Función para asignar un servicio a la habitación
async function assignServiceToHabitacion(habitacionId: string, servicioId: string): Promise<FileUploadResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");

    if (!token) {
      return { success: false, error: "Token de autenticación no encontrado" };
    }

    const response = await fetch(`${API_BASE_URL}/servicios/habitaciones/${habitacionId}/servicios`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify({
        servicioId: servicioId,
        precioExtra: 0, // Por defecto sin precio extra
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        error: errorData.message || `Error ${response.status}: ${response.statusText}` 
      };
    }

    return { success: true, message: "Servicio asignado exitosamente" };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Error desconocido al asignar servicio" 
    };
  }
}

// Función para subir una imagen
async function uploadSingleImage(habitacionId: string, image: any): Promise<FileUploadResult> {
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

    const response = await fetch(`${API_BASE_URL}/habitaciones/${habitacionId}/imagenes`, {
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

// Función principal para crear habitación con archivos
export async function createHabitacionWithFiles(
  hospedajeId: string, 
  formData: HabitacionFormData
): Promise<HabitacionCreationResult> {
  try {
    // 1. Crear habitación básica
    const habitacion = await createBasicHabitacion(hospedajeId, formData);
    const habitacionId = habitacion.id;

    // 2. Asignar servicios si existen
    let serviceResults: FileUploadResult[] = [];
    if (formData.servicios.length > 0) {
      const servicePromises = formData.servicios.map(servicioId => 
        assignServiceToHabitacion(habitacionId, servicioId)
      );
      serviceResults = await Promise.all(servicePromises);
    }

    // 3. Subir imágenes si existen
    let imageResults: FileUploadResult[] = [];
    if (formData.tempImages.length > 0) {
      const imagePromises = formData.tempImages.map(image => 
        uploadSingleImage(habitacionId, image)
      );
      imageResults = await Promise.all(imagePromises);
    }

    // 4. Verificar resultados
    const failedServices = serviceResults.filter(result => !result.success);
    const failedImages = imageResults.filter(result => !result.success);
    const hasFailures = failedServices.length > 0 || failedImages.length > 0;

    let message = "Habitación creada exitosamente";
    if (hasFailures) {
      const errors = [];
      if (failedServices.length > 0) errors.push(`${failedServices.length} servicios fallaron`);
      if (failedImages.length > 0) errors.push(`${failedImages.length} imágenes fallaron`);
      message = `Habitación creada pero ${errors.join(" y ")}`;
    } else if (serviceResults.length > 0 || imageResults.length > 0) {
      const added = [];
      if (serviceResults.length > 0) added.push(`${serviceResults.length} servicios`);
      if (imageResults.length > 0) added.push(`${imageResults.length} imágenes`);
      message = `Habitación creada exitosamente con ${added.join(" y ")}`;
    }

    return {
      success: !hasFailures,
      habitacionId,
      message,
      fileUploadResults: {
        images: imageResults
      }
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido al crear habitación"
    };
  }
} 