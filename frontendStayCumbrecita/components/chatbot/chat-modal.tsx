"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { X, MessageCircle } from "lucide-react"
import ChatArea from "./chat-area"
import ChatInput from "./chat-input"
import { useChatbot } from "@/hooks/useChatbot"
import { renderChatMessage } from "./message-renderer"

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  hospedajeId: string
  hospedajeName: string
  context?: {
    fechaInicio?: string
    fechaFin?: string
    huespedes?: number
    habitaciones?: number
  }
}

export default function ChatModal({
  isOpen,
  onClose,
  hospedajeId,
  hospedajeName,
  context
}: ChatModalProps) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    initializeChat,
    clearConversation,
    isAuthenticated,
    context: chatContext,
    hasStoredContext,
    currentQuery
  } = useChatbot({
    config: {
      hospedajeId,
      hospedajeName,
      context
    },
    isOpen
  })



  // Referencias para auto-scroll y auto-focus
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Inicializar chat cuando se abre
  useEffect(() => {
    if (isOpen) {
      initializeChat()
    }
  }, [isOpen, initializeChat])

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Auto-focus en el input después de que termine el loading
  useEffect(() => {
    if (!isLoading && inputRef.current && isOpen) {
      inputRef.current.focus()
    }
  }, [isLoading, isOpen])

  // Manejar cierre del modal
  const handleClose = () => {
    // Si usuario NO está logueado, limpiar conversación
    if (!isAuthenticated) {
      clearConversation()
    }
    onClose()
  }

  // Si no está abierto, no renderizar nada
  if (!isOpen) return null

  return (
    <div className="fixed bottom-20 right-6 w-[420px] bg-white rounded-lg shadow-xl border overflow-hidden z-50">
      {/* Header */}
      <div className="bg-[#CD6C22] text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <h3 className="font-bold text-sm">Asistente Virtual</h3>
        </div>
        <button 
          onClick={handleClose} 
          className="text-white hover:text-gray-200 text-xl font-bold leading-none"
        >
          ×
        </button>
      </div>

      {/* Contexto de fechas si existe */}
      {((context && (context.fechaInicio || context.fechaFin)) || (currentQuery?.dates)) && (
        <div className="bg-[#A83921] text-white px-4 py-2 text-xs">
          {/* Mostrar fechas del URL params o del contexto híbrido */}
          {context?.fechaInicio && context?.fechaFin && (
            <span>
              {new Date(context.fechaInicio).toLocaleDateString()} 
              {" "}al {new Date(context.fechaFin).toLocaleDateString()}
              {context.huespedes && ` • ${context.huespedes} huéspedes`}
              {context.habitaciones && ` • ${context.habitaciones} habitaciones`}
            </span>
          )}
          {/* Mostrar fechas del contexto híbrido si no hay URL params */}
          {!context?.fechaInicio && currentQuery?.dates && (
            <span>
              {currentQuery.dates.checkIn && currentQuery.dates.checkOut && (
                <>
                  {new Date(currentQuery.dates.checkIn).toLocaleDateString()} 
                  {" "}al {new Date(currentQuery.dates.checkOut).toLocaleDateString()}
                </>
              )}
              {currentQuery.dates.singleDate && (
                <>Para {new Date(currentQuery.dates.singleDate).toLocaleDateString()}</>
              )}
              {currentQuery.habitacion && ` • ${currentQuery.habitacion}`}
              {hasStoredContext && ` • Contexto: ${chatContext?.conversationHistory.length ?? 0} msgs`}
            </span>
          )}
        </div>
      )}

      {/* Área de mensajes con altura fija */}
      <div className="h-80 overflow-y-auto">
        {messages.length === 0 && (
          <div className="p-4 text-center text-gray-600">
            <div className="text-2xl mb-2">💬</div>
            <p className="text-sm font-medium mb-1">
              ¡Hola! Soy el asistente virtual de {hospedajeName}.
            </p>
            <p className="text-xs">¿En qué puedo ayudarte?</p>
          </div>
        )}

        <div className="p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.role === "assistant" 
                  ? "bg-gray-100 mr-auto" 
                  : "bg-[#CD6C22]/10 ml-auto"
              } p-3 rounded-lg max-w-[85%]`}
            >
              <div className="text-sm">
                {renderChatMessage(message.message)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="bg-gray-100 mr-auto p-3 rounded-lg max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                <span className="text-sm text-gray-800">Escribiendo...</span>
              </div>
            </div>
          )}
          
          {/* Elemento invisible para auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Mostrar error si existe */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-l-4 border-red-400">
          <p className="text-xs text-red-700">
            Error: {error}
          </p>
        </div>
      )}

      {/* Input para enviar mensajes */}
      <div className="border-t p-3 flex">
        <input
          ref={inputRef}
          type="text"
          placeholder={`Pregúntame sobre ${hospedajeName}...`}
          className="flex-1 border rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#CD6C22]"
          disabled={isLoading}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              const target = e.target as HTMLInputElement
              if (target.value.trim()) {
                sendMessage(target.value.trim())
                target.value = ""
                // Focus se mantiene automáticamente al presionar Enter
              }
            }
          }}
        />
        <button
          className="bg-[#CD6C22] text-white px-4 rounded-r-md hover:bg-[#A83921] text-sm disabled:opacity-50"
          disabled={isLoading}
          onClick={() => {
            if (inputRef.current && inputRef.current.value.trim()) {
              sendMessage(inputRef.current.value.trim())
              inputRef.current.value = ""
              inputRef.current.focus() // Mantener focus después de enviar
            }
          }}
        >
          Enviar
        </button>
      </div>

      {/* Indicador de estado de autenticación */}
      <div className="px-3 py-2 bg-gray-50 border-t">
        <p className="text-xs text-gray-600 text-center">
          {isAuthenticated ? (
            <span className="text-green-600">
              💾 Conversación guardada
            </span>
          ) : (
            <span className="text-orange-600">
              ⚠️ Temporal - se borrará al cerrar
            </span>
          )}
        </p>
      </div>
    </div>
  )
} 