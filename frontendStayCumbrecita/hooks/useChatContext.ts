import { useState, useEffect, useCallback } from 'react';

export interface ChatContextQuery {
  dates?: { 
    checkIn?: string; 
    checkOut?: string; 
    singleDate?: string;
  };
  habitacion?: string;
  lastAvailability?: boolean;
  lastPrices?: Record<string, unknown>;
}

export interface ChatContextMessage {
  id: string;
  message: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export interface ChatContext {
  sessionId: string;
  conversationHistory: ChatContextMessage[];
  currentQuery: ChatContextQuery;
  timestamp: number;
  hospedajeId: string;
}

const STORAGE_KEY = 'stayatcumbrecita_chatbot_context';
const MAX_HISTORY_LENGTH = 10;

export function useChatContext(hospedajeId: string, token: string | null, isAuthenticated: boolean) {
  const [context, setContext] = useState<ChatContext | null>(null);

  // Inicializar contexto desde sessionStorage o crear nuevo
  useEffect(() => {
    const initializeContext = () => {
      try {
        // Solo usar sessionStorage para usuarios NO autenticados
        if (!isAuthenticated) {
          const stored = sessionStorage.getItem(`${STORAGE_KEY}_${hospedajeId}`);
          if (stored) {
            const parsedContext = JSON.parse(stored);
            // Verificar que el contexto sea válido y reciente (< 24 horas)
            const isRecent = Date.now() - parsedContext.timestamp < 24 * 60 * 60 * 1000;
            if (isRecent && parsedContext.hospedajeId === hospedajeId) {
              // Convertir timestamps de vuelta a Date objects
              parsedContext.conversationHistory = parsedContext.conversationHistory.map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }));
              setContext(parsedContext);
              console.log('🔄 Contexto restaurado desde sessionStorage:', parsedContext);
              return;
            }
          }
        }
      } catch (error) {
        console.warn('Error restaurando contexto:', error);
      }

      // Crear nuevo contexto
      const newContext: ChatContext = {
        sessionId: token || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationHistory: [],
        currentQuery: {},
        timestamp: Date.now(),
        hospedajeId
      };
      setContext(newContext);
      console.log('🆕 Nuevo contexto creado:', newContext);
    };

    if (hospedajeId) {
      initializeContext();
    }
  }, [hospedajeId, token, isAuthenticated]);

  // Guardar contexto en sessionStorage cuando cambie (solo usuarios NO autenticados)
  useEffect(() => {
    if (context && !isAuthenticated) {
      try {
        sessionStorage.setItem(`${STORAGE_KEY}_${hospedajeId}`, JSON.stringify(context));
        console.log('💾 Contexto guardado en sessionStorage');
      } catch (error) {
        console.warn('Error guardando contexto:', error);
      }
    }
  }, [context, hospedajeId, isAuthenticated]);

  // Agregar mensaje al contexto
  const addMessage = useCallback((message: ChatContextMessage) => {
    setContext(prev => {
      if (!prev) return prev;

      const updatedHistory = [...prev.conversationHistory, message];
      
      // Mantener solo los últimos MAX_HISTORY_LENGTH mensajes
      if (updatedHistory.length > MAX_HISTORY_LENGTH) {
        updatedHistory.splice(0, updatedHistory.length - MAX_HISTORY_LENGTH);
      }

      const updatedContext = {
        ...prev,
        conversationHistory: updatedHistory,
        timestamp: Date.now()
      };

      console.log('📝 Mensaje agregado al contexto:', message.role, message.message.substring(0, 50));
      return updatedContext;
    });
  }, []);

  // Actualizar información de consulta (fechas, habitación, etc.)
  const updateCurrentQuery = useCallback((queryUpdate: Partial<ChatContextQuery>) => {
    setContext(prev => {
      if (!prev) return prev;

      const updatedContext = {
        ...prev,
        currentQuery: {
          ...prev.currentQuery,
          ...queryUpdate
        },
        timestamp: Date.now()
      };

      console.log('🔍 Query actualizada:', queryUpdate);
      return updatedContext;
    });
  }, []);

  // Extraer fechas del mensaje y actualizar contexto
  const extractAndUpdateDates = useCallback((message: string, response?: string) => {
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
    const dates = [...message.matchAll(dateRegex), ...(response ? [...response.matchAll(dateRegex)] : [])];
    
    if (dates.length > 0) {
      const firstDate = dates[0];
      const dateStr = `${firstDate[3]}-${firstDate[2].padStart(2, '0')}-${firstDate[1].padStart(2, '0')}`;
      
      if (dates.length >= 2) {
        const secondDate = dates[1];
        const checkOutStr = `${secondDate[3]}-${secondDate[2].padStart(2, '0')}-${secondDate[1].padStart(2, '0')}`;
        updateCurrentQuery({
          dates: {
            checkIn: dateStr,
            checkOut: checkOutStr
          }
        });
      } else {
        updateCurrentQuery({
          dates: {
            singleDate: dateStr
          }
        });
      }
    }

    // Detectar disponibilidad confirmada
    if (response && (/disponible|tenemos|excelente/i.test(response))) {
      updateCurrentQuery({ lastAvailability: true });
    }

    // 🔧 SOLO extraer habitación cuando el usuario ESPECÍFICAMENTE la elije
    const userMessage = message.toLowerCase();
    
    // Patrones que indican selección explícita de habitación
    const selectionPatterns = [
      /quiero\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /me\s+interesa\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /elijo\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /reservo\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /prefiero\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /tomo\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /me\s+quedo\s+con\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /(suite\s+\w+|habitación\s+\w+)\s+por\s+favor/i,
      /cuanto\s+(cuesta|vale|sale)\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /información\s+(de|sobre)\s+la\s+(suite\s+\w+|habitación\s+\w+)/i,
      /servicios\s+(de|tiene)\s+la\s+(suite\s+\w+|habitación\s+\w+)/i
    ];

    // Solo guardar habitación si hay selección explícita
    for (const pattern of selectionPatterns) {
      const match = message.match(pattern);
      if (match) {
        const habitacionElegida = match[1] || match[2];
        if (habitacionElegida) {
          updateCurrentQuery({ habitacion: habitacionElegida.trim() });
          console.log('🎯 Habitación seleccionada explícitamente:', habitacionElegida.trim());
          break; // Solo tomar la primera coincidencia
        }
      }
    }

    // 🔧 NO extraer habitación automáticamente de respuestas de disponibilidad
    // La habitación solo se guarda cuando el usuario la elije específicamente
    
  }, [updateCurrentQuery]);

  // Limpiar contexto
  const clearContext = useCallback(() => {
    try {
      if (!isAuthenticated) {
        sessionStorage.removeItem(`${STORAGE_KEY}_${hospedajeId}`);
      }
      setContext(prev => prev ? {
        ...prev,
        conversationHistory: [],
        currentQuery: {},
        timestamp: Date.now()
      } : null);
      console.log('🗑️ Contexto limpiado');
    } catch (error) {
      console.warn('Error limpiando contexto:', error);
    }
  }, [hospedajeId, isAuthenticated]);

  // Inicializar contexto con fechas del URL params
  const initializeWithURLParams = useCallback((urlParams: {
    fechaInicio?: string;
    fechaFin?: string;
    huespedes?: number;
    habitaciones?: number;
  }) => {
    if (urlParams.fechaInicio || urlParams.fechaFin) {
      const contextDates: ChatContextQuery['dates'] = {};
      
      if (urlParams.fechaInicio && urlParams.fechaFin) {
        contextDates.checkIn = urlParams.fechaInicio;
        contextDates.checkOut = urlParams.fechaFin;
      } else if (urlParams.fechaInicio) {
        contextDates.singleDate = urlParams.fechaInicio;
      }

      updateCurrentQuery({ dates: contextDates });
      console.log('🔗 Contexto inicializado con URL params:', contextDates);
    }
  }, [updateCurrentQuery]);

  // 🆕 Detectar y limpiar habitación en consultas generales del hospedaje
  const handleGeneralHospedajeQuery = useCallback((message: string) => {
    const generalHospedajePatterns = [
      /servicios\s+(del\s+)?hospedaje/i,
      /servicios\s+(del\s+)?hotel/i,
      /servicios\s+(del\s+)?lugar/i,
      /que\s+(servicios\s+)?tiene\s+(el\s+)?(hospedaje|hotel|lugar)/i,
      /con\s+que\s+servicios\s+cuenta\s+(el\s+)?(hospedaje|hotel|lugar)/i,
      /servicios\s+(que\s+)?(ofrece|incluye)\s+(el\s+)?(hospedaje|hotel|lugar)/i,
      /instalaciones\s+(del\s+)?(hospedaje|hotel|lugar)/i,
      /comodidades\s+(del\s+)?(hospedaje|hotel|lugar)/i,
      /amenities\s+(del\s+)?(hospedaje|hotel|lugar)/i
    ];

    const isGeneralQuery = generalHospedajePatterns.some(pattern => pattern.test(message));
    
    if (isGeneralQuery) {
      // Limpiar habitación del contexto para consultas generales
      updateCurrentQuery({ habitacion: undefined });
      console.log('🏨 Consulta general del hospedaje detectada - habitación limpiada del contexto');
      return true;
    }
    
    return false;
  }, [updateCurrentQuery]);

  return {
    context,
    addMessage,
    updateCurrentQuery,
    extractAndUpdateDates,
    clearContext,
    initializeWithURLParams,
    handleGeneralHospedajeQuery
  };
} 