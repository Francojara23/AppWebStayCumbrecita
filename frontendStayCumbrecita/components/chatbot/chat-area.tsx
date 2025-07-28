"use client"

import { useRef, useEffect } from "react"
import ChatMessageComponent from "./chat-message"

export interface ChatMessage {
  id: string
  message: string
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatAreaProps {
  messages: ChatMessage[]
  isLoading?: boolean
  hotelName?: string
}

export default function ChatArea({ messages, isLoading = false, hotelName }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-800 mt-8">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-lg font-medium mb-2">
            ¡Hola! Soy el asistente virtual {hotelName ? `de ${hotelName}` : ''}.
          </p>
          <p className="text-sm">
            ¿En qué puedo ayudarte hoy?
          </p>
          <div className="mt-6 text-xs text-gray-700 space-y-1">
            <p>💡 Puedes preguntarme sobre:</p>
            <p>• Disponibilidad de habitaciones</p>
            <p>• Precios y tarifas</p>
            <p>• Servicios incluidos</p>
            <p>• Métodos de pago</p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <ChatMessageComponent key={message.id} message={message} />
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 px-4 py-2 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span className="text-sm text-gray-800">Escribiendo...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
} 