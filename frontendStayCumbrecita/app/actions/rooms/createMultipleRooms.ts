"use server"

import { getApiUrl } from '@/lib/utils/api-urls'
import { cookies } from 'next/headers'

export interface CreateMultipleRoomsData {
  cantidad: number;
  datosHabitacion: {
    nombre: string;
    descripcionCorta: string;
    descripcionLarga: string;
    tipoHabitacionId: string;
    capacidad: number;
    precioBase: number;
    servicios?: string[];
    tempImages?: any[];
    ajustesPrecio?: any[];
  };
}

// Función para subir imágenes a múltiples habitaciones (optimizado)
async function uploadImagesToMultipleHabitaciones(
  hospedajeId: string,
  habitacionIds: string[],
  tempImages: any[]
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token");
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const apiUrl = getApiUrl();
  const habitacionIdsStr = habitacionIds.join(',');
  const url = `${apiUrl}/hospedajes/${hospedajeId}/habitaciones/multiple/${habitacionIdsStr}/imagenes`;

  // Crear FormData para las imágenes (siguiendo patrón de hospedajes)
  const formData = new FormData();
  
  // Agregar todos los archivos
  tempImages.forEach((image, index) => {
    formData.append("files", image.file);
  });

  // Agregar descripciones como JSON string (patrón de hospedajes)
  const descripciones = tempImages.map(img => img.descripcion || "");
  formData.append("descripciones", JSON.stringify(descripciones));

  // Agregar órdenes como JSON string (patrón de hospedajes)
  const ordenes = tempImages.map(img => img.orden || undefined);
  formData.append("ordenes", JSON.stringify(ordenes));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.value}`,
      // No Content-Type para FormData
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || 
      `Error HTTP ${response.status}: ${response.statusText}`
    );
  }

  return await response.json();
}

export async function createMultipleHabitacionesWithFiles(
  hospedajeId: string, 
  data: CreateMultipleRoomsData
) {
  try {
    console.log('🏠 [createMultipleRooms] Iniciando creación con patrón de hospedajes:', {
      hospedajeId,
      cantidad: data.cantidad,
      nombre: data.datosHabitacion.nombre,
      tieneImagenes: !!(data.datosHabitacion.tempImages?.length)
    });

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token");
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const apiUrl = getApiUrl();
    const url = `${apiUrl}/hospedajes/${hospedajeId}/habitaciones/multiple`;

    // 🎯 PASO 1: Crear habitaciones múltiples (solo JSON, sin archivos)
    console.log('🏠 [createMultipleRooms] PASO 1: Creando habitaciones...');
    
    const habitacionesData = {
      cantidad: data.cantidad,
      datosHabitacion: {
        ...data.datosHabitacion,
        tempImages: undefined // Remover tempImages del JSON
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.value}`,
      },
      body: JSON.stringify(habitacionesData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || 
        `Error HTTP ${response.status}: ${response.statusText}`
      );
    }

    const habitacionesResult = await response.json();
    console.log('✅ [createMultipleRooms] PASO 1 completado:', {
      habitaciones: habitacionesResult.length
    });

    // 🎯 PASO 2: Subir imágenes si existen (optimizado)
    let imageUploadResult = null;
    if (data.datosHabitacion.tempImages && data.datosHabitacion.tempImages.length > 0) {
      console.log('📸 [createMultipleRooms] PASO 2: Subiendo imágenes optimizadas...');
      
      const habitacionIds = habitacionesResult.map((h: any) => h.id);
      imageUploadResult = await uploadImagesToMultipleHabitaciones(
        hospedajeId,
        habitacionIds,
        data.datosHabitacion.tempImages
      );
      
      console.log('✅ [createMultipleRooms] PASO 2 completado:', {
        imagenesSubidas: imageUploadResult.estadisticas?.imagenesSubidas,
        relacionesCreadas: imageUploadResult.estadisticas?.relacionesCreadas,
        optimizacion: imageUploadResult.estadisticas?.optimizacion?.ahorro
      });
    }

    const finalMessage = imageUploadResult 
      ? `${data.cantidad} habitaciones creadas con ${imageUploadResult.estadisticas?.imagenesSubidas} imágenes (${imageUploadResult.estadisticas?.optimizacion?.ahorro})`
      : `${data.cantidad} habitaciones creadas exitosamente`;

    return {
      success: true,
      data: {
        habitaciones: habitacionesResult,
        imagenes: imageUploadResult
      },
      message: finalMessage
    };
  } catch (error: any) {
    console.error('❌ [createMultipleRooms] Error en patrón de hospedajes:', error);
    
    return {
      success: false,
      error: error.message || 'Error desconocido al crear habitaciones múltiples'
    };
  }
} 