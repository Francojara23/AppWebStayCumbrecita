"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, X, Hotel, Calendar, CreditCard, Wifi, Coffee, FishIcon as Swimming, Car, Snowflake } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

// Tipos para el componente
interface HotelChatbotProps {
  isOpen: boolean
  onClose: () => void
  hotel: {
    id: number
    name: string
    image: string
    location: string
    description: string
    price: number
    rating: number
    services: string[]
  } | null
}

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
}

// Componente principal
export default function HotelChatbot({ isOpen, onClose, hotel }: HotelChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Inicializar el chat cuando se abre con un hotel seleccionado
  useEffect(() => {
    if (isOpen && hotel) {
      // Limpiar mensajes anteriores
      setMessages([
        {
          id: "welcome",
          content: `¡Hola! Soy el asistente virtual de ${hotel.name}. ¿En qué puedo ayudarte hoy? Puedes preguntarme sobre habitaciones disponibles, servicios, precios o reservas.`,
          sender: "bot",
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen, hotel])

  // Scroll automático al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Función para enviar un mensaje
  const sendMessage = () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simular respuesta del bot después de un breve retraso
    setTimeout(
      () => {
        const botResponse = generateBotResponse(inputValue, hotel)
        setMessages((prev) => [...prev, botResponse])
        setIsTyping(false)
      },
      1000 + Math.random() * 1000,
    ) // Retraso aleatorio entre 1-2 segundos
  }

  // Manejar envío con Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  // Generar respuesta del bot basada en palabras clave
  const generateBotResponse = (userInput: string, hotel: any): Message => {
    const input = userInput.toLowerCase()
    let response = ""

    // Respuestas basadas en palabras clave
    if (input.includes("habitacion") || input.includes("cuarto") || input.includes("alojamiento")) {
      response = `En ${hotel.name} contamos con diferentes tipos de habitaciones: individuales, dobles, suites y familiares. Todas incluyen baño privado, TV y WiFi. ¿Te interesa alguna en particular?`
    } else if (
      input.includes("precio") ||
      input.includes("costo") ||
      input.includes("tarifa") ||
      input.includes("valor")
    ) {
      response = `Los precios en ${hotel.name} comienzan desde $${hotel.price.toLocaleString()} por noche. El precio varía según el tipo de habitación y temporada. ¿Para qué fechas estás considerando hospedarte?`
    } else if (input.includes("reserva") || input.includes("reservar") || input.includes("disponibilidad")) {
      response = `Para hacer una reserva en ${hotel.name}, necesitamos conocer las fechas de llegada y salida, número de huéspedes y tipo de habitación. ¿Te gustaría que te ayude con una reserva ahora?`
    } else if (input.includes("servicio") || input.includes("incluye") || input.includes("amenidades")) {
      const servicios = hotel.services
        .join(", ")
        .replace("wifi", "WiFi")
        .replace("breakfast", "desayuno")
        .replace("pool", "piscina")
        .replace("parking", "estacionamiento")
        .replace("ac", "aire acondicionado")
      response = `${hotel.name} ofrece los siguientes servicios: ${servicios}. ¿Necesitas información adicional sobre alguno de estos servicios?`
    } else if (input.includes("ubicacion") || input.includes("direccion") || input.includes("donde")) {
      response = `${hotel.name} está ubicado en ${hotel.location}, en una zona privilegiada con fácil acceso a los principales atractivos turísticos. ¿Necesitas indicaciones para llegar?`
    } else if (input.includes("cancelacion") || input.includes("cancelar") || input.includes("politica")) {
      response = `Nuestra política de cancelación permite cancelaciones gratuitas hasta 48 horas antes de la fecha de llegada. Cancelaciones posteriores pueden tener un cargo del 50% de la primera noche.`
    } else if (
      input.includes("check-in") ||
      input.includes("entrada") ||
      input.includes("check-out") ||
      input.includes("salida")
    ) {
      response = `El horario de check-in es a partir de las 14:00 y el check-out hasta las 11:00. Si necesitas un horario especial, podemos evaluarlo según disponibilidad.`
    } else if (input.includes("gracias") || input.includes("adios") || input.includes("chau")) {
      response = `¡Gracias por contactar con ${hotel.name}! Estamos a tu disposición para cualquier otra consulta. ¡Esperamos verte pronto!`
    } else if (
      input.includes("hola") ||
      input.includes("buenos dias") ||
      input.includes("buenas tardes") ||
      input.includes("buenas noches")
    ) {
      response = `¡Hola! Bienvenido al chat de ${hotel.name}. ¿En qué puedo ayudarte hoy?`
    } else {
      response = `Gracias por tu mensaje. En ${hotel.name} estamos para ayudarte. ¿Podrías ser más específico con tu consulta? Puedo informarte sobre habitaciones, precios, servicios o ayudarte con una reserva.`
    }

    return {
      id: `bot-${Date.now()}`,
      content: response,
      sender: "bot",
      timestamp: new Date(),
    }
  }

  // Función para obtener icono según el servicio
  const getServiceIcon = (service: string) => {
    switch (service) {
      case "wifi":
        return <Wifi className="h-4 w-4" />
      case "breakfast":
        return <Coffee className="h-4 w-4" />
      case "pool":
        return <Swimming className="h-4 w-4" />
      case "parking":
        return <Car className="h-4 w-4" />
      case "ac":
        return <Snowflake className="h-4 w-4" />
      default:
        return null
    }
  }

  // Botones de consulta rápida
  const quickQueries = [
    { text: "Habitaciones disponibles", icon: <Hotel className="h-4 w-4" /> },
    { text: "Precios y tarifas", icon: <CreditCard className="h-4 w-4" /> },
    { text: "Hacer una reserva", icon: <Calendar className="h-4 w-4" /> },
    { text: "Servicios incluidos", icon: <Wifi className="h-4 w-4" /> },
  ]

  // Función para usar una consulta rápida
  const handleQuickQuery = (query: string) => {
    setInputValue(query)
    setTimeout(() => sendMessage(), 100)
  }

  // Formatear la hora del mensaje
  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (!hotel) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={hotel.image || "/placeholder.svg"} alt={hotel.name} />
                <AvatarFallback>{hotel.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <DialogTitle>{hotel.name}</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user" ? "bg-primary text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p>{message.content}</p>
                  <p className={`text-xs mt-1 ${message.sender === "user" ? "text-white/70" : "text-gray-500"}`}>
                    {formatMessageTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-100">
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex flex-wrap gap-2 mb-3">
            {quickQueries.map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuery(query.text)}
              >
                {query.icon}
                <span className="ml-1">{query.text}</span>
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!inputValue.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
