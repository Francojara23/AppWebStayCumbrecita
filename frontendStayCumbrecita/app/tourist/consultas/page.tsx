"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MessageCircle, Send, Plus } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { SectionBanner } from "@/components/tourist/section-banner"

// Tipo para las consultas
interface Inquiry {
  id: string
  subject: string
  message: string
  date: Date
  status: "Pendiente" | "Respondida" | "Cerrada"
  responses: {
    message: string
    date: Date
    isAdmin: boolean
  }[]
}

export default function ConsultasPage() {
  // Estado para las consultas - sin datos hardcodeados
  const [inquiries, setInquiries] = useState<Inquiry[]>([])

  // Estado para el diálogo de nueva consulta
  const [isNewInquiryDialogOpen, setIsNewInquiryDialogOpen] = useState(false)
  const [newInquiry, setNewInquiry] = useState({
    subject: "",
    message: "",
  })

  // Estado para el diálogo de detalle de consulta
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [newResponse, setNewResponse] = useState("")

  // Función para abrir el diálogo de detalle
  const openDetailDialog = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry)
    setIsDetailDialogOpen(true)
  }

  // Función para enviar una nueva consulta
  const handleSubmitNewInquiry = () => {
    if (newInquiry.subject.trim() === "" || newInquiry.message.trim() === "") {
      return
    }

    const inquiry: Inquiry = {
      id: `inq-${inquiries.length + 1}`,
      subject: newInquiry.subject,
      message: newInquiry.message,
      date: new Date(),
      status: "Pendiente",
      responses: [],
    }

    setInquiries([inquiry, ...inquiries])
    setNewInquiry({ subject: "", message: "" })
    setIsNewInquiryDialogOpen(false)
  }

  // Función para enviar una respuesta a una consulta
  const handleSubmitResponse = () => {
    if (!selectedInquiry || newResponse.trim() === "") {
      return
    }

    const response = {
      message: newResponse,
      date: new Date(),
      isAdmin: false,
    }

    const updatedInquiries = inquiries.map((inquiry) => {
      if (inquiry.id === selectedInquiry.id) {
        return {
          ...inquiry,
          responses: [...inquiry.responses, response],
        }
      }
      return inquiry
    })

    setInquiries(updatedInquiries)
    setNewResponse("")

    // Actualizar la consulta seleccionada para mostrar la nueva respuesta
    const updatedInquiry = updatedInquiries.find((inquiry) => inquiry.id === selectedInquiry.id)
    if (updatedInquiry) {
      setSelectedInquiry(updatedInquiry)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SectionBanner 
        title="Mis Consultas" 
        description="Aquí puedes revisar tus consultas y enviar nuevas."
        imageSrc="/bannerTuristaImagen.jpg"
        imageAlt="Banner de consultas"
      />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800"></h1>
        <Button 
          className="bg-gray-400 cursor-not-allowed" 
          disabled
          title="Funcionalidad próximamente disponible"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Consulta
        </Button>
      </div>

      {inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 bg-gray-50 rounded-lg">
          <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">No tienes consultas realizadas</p>
          <p className="text-sm text-gray-400 mt-2">El sistema de consultas estará disponible próximamente</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {inquiries.map((inquiry) => (
            <Card
              key={inquiry.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetailDialog(inquiry)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{inquiry.subject}</CardTitle>
                    <CardDescription>{format(inquiry.date, "d 'de' MMMM, yyyy", { locale: es })}</CardDescription>
                  </div>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      inquiry.status === "Pendiente"
                        ? "bg-yellow-100 text-yellow-800"
                        : inquiry.status === "Respondida"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {inquiry.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 line-clamp-2">{inquiry.message}</p>
              </CardContent>
              <CardFooter className="pt-0 text-xs text-gray-500">
                {inquiry.responses.length > 0
                  ? `${inquiry.responses.length} respuesta${inquiry.responses.length > 1 ? "s" : ""}`
                  : "Sin respuestas"}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo para nueva consulta */}
      <Dialog open={isNewInquiryDialogOpen} onOpenChange={setIsNewInquiryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nueva Consulta</DialogTitle>
            <DialogDescription>
              Completa el formulario para enviar tu consulta. Te responderemos a la brevedad.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Asunto
              </label>
              <Input
                id="subject"
                value={newInquiry.subject}
                onChange={(e) => setNewInquiry({ ...newInquiry, subject: e.target.value })}
                placeholder="Ej: Consulta sobre disponibilidad"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="message" className="text-sm font-medium">
                Mensaje
              </label>
              <Textarea
                id="message"
                value={newInquiry.message}
                onChange={(e) => setNewInquiry({ ...newInquiry, message: e.target.value })}
                placeholder="Escribe tu consulta aquí..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewInquiryDialogOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleSubmitNewInquiry}>
              Enviar Consulta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para detalle de consulta */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedInquiry?.subject}</DialogTitle>
            <DialogDescription>
              {selectedInquiry && format(selectedInquiry.date, "d 'de' MMMM, yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4">
            {/* Mensaje original */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <p className="text-sm font-medium">Tú</p>
                <p className="text-xs text-gray-500">
                  {selectedInquiry && format(selectedInquiry.date, "d MMM, yyyy HH:mm", { locale: es })}
                </p>
              </div>
              <p className="text-sm">{selectedInquiry?.message}</p>
            </div>

            {/* Respuestas */}
            {selectedInquiry?.responses.map((response, index) => (
              <div key={index} className={`p-4 rounded-lg ${response.isAdmin ? "bg-gray-100" : "bg-orange-50"}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-medium">{response.isAdmin ? "Administrador" : "Tú"}</p>
                  <p className="text-xs text-gray-500">{format(response.date, "d MMM, yyyy HH:mm", { locale: es })}</p>
                </div>
                <p className="text-sm">{response.message}</p>
              </div>
            ))}
          </div>

          {/* Formulario para responder */}
          <div className="border-t pt-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Textarea
                  placeholder="Escribe tu respuesta..."
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  className="resize-none"
                />
              </div>
              <Button size="icon" className="bg-orange-600 hover:bg-orange-700" onClick={handleSubmitResponse}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
