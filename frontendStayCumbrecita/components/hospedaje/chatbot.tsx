"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"

interface ChatbotProps {
  hotelName?: string
}

export default function Chatbot({ hotelName = "Hotel Alpino" }: ChatbotProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: `¡Hola! Soy el asistente virtual del ${hotelName}. ¿En qué puedo ayudarte?`,
    },
  ])

  const handleSendMessage = () => {
    if (!message.trim()) return

    // Añadir mensaje del usuario
    setMessages([...messages, { sender: "user", text: message }])

    // Simular respuesta del bot (en una aplicación real, esto se conectaría a un backend)
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: `Gracias por tu mensaje. Nuestro equipo de ${hotelName} te responderá a la brevedad.`,
        },
      ])
    }, 1000)

    setMessage("")
  }

  return (
    <>
      {/* Chatbot Button */}
      <div className="fixed bottom-6 right-6">
        <button
          className="bg-[#CD6C22] text-white rounded-full p-4 shadow-lg hover:bg-[#A83921] transition-colors"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>

      {/* Chatbot Dialog */}
      {isChatOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-lg shadow-xl border overflow-hidden z-50">
          <div className="bg-[#CD6C22] text-white p-4 flex justify-between items-center">
            <h3 className="font-bold">Asistente Virtual</h3>
            <button onClick={() => setIsChatOpen(false)} className="text-white hover:text-gray-200 text-xl font-bold">
              ×
            </button>
          </div>
          <div className="h-80 p-4 overflow-y-auto">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.sender === "bot" ? "bg-gray-100 mr-auto" : "bg-[#CD6C22]/10 ml-auto"
                } p-3 rounded-lg mb-2 max-w-[80%]`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="border-t p-3 flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje..."
              className="flex-1 border rounded-l-md px-3 py-2 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage()
                }
              }}
            />
            <button
              className="bg-[#CD6C22] text-white px-4 rounded-r-md hover:bg-[#A83921]"
              onClick={handleSendMessage}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
