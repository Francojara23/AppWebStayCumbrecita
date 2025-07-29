"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, Plus, Settings, FileText, Bot, CheckCircle, Clock, AlertCircle, Upload, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { useUserPermissions } from "@/hooks/use-user-permissions"
import { apiClient } from "@/lib/api/client"
import { uploadPdf } from "@/app/actions/chatbot/uploadPdf"

interface Hospedaje {
  id: string
  nombre: string
  direccion: string
  ciudad: string
  provincia: string
  tipoHotel?: {
    nombre: string
  }
  imagenes?: Array<{
    url: string
  }>
}

interface ChatbotConfig {
  id: string
  hospedajeId: string
  pdfUrl: string
  pdfFilename: string
  tono: 'formal' | 'cordial' | 'juvenil' | 'amigable' | 'corporativo'
  isActive: boolean
  isTrained: boolean
  createdAt: string
  updatedAt: string
}

interface HospedajeWithConfig extends Hospedaje {
  chatbotConfig?: ChatbotConfig | null
  configStatus: 'sin-configurar' | 'configurando' | 'configurado'
}

export default function ChatbotPage() {
  const router = useRouter()
  const [hospedajes, setHospedajes] = useState<HospedajeWithConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Estados para el diálogo de reemplazo de PDF
  const [replacePdfDialog, setReplacePdfDialog] = useState<{
    isOpen: boolean
    hospedajeId: string
    hospedajeNombre: string
    currentPdfName: string
  }>({
    isOpen: false,
    hospedajeId: '',
    hospedajeNombre: '',
    currentPdfName: ''
  })
  const [replacingPdf, setReplacingPdf] = useState(false)

  // Hook para verificar permisos del usuario
  const userPermissions = useUserPermissions()

  // Función para obtener hospedajes del usuario
  const loadHospedajes = async () => {
    try {
      setLoading(true)
      
      console.log('🔑 Haciendo petición a /hospedajes/mis-propiedades')
      
      // Obtener hospedajes del propietario usando el cliente API configurado
      const hospedajesResponse = await apiClient.get('/hospedajes/mis-propiedades')
      const hospedajesData = hospedajesResponse.data
      
      console.log('🏨 Hospedajes cargados:', hospedajesData)

              // Para cada hospedaje, obtener su configuración de chatbot
        const hospedajesWithConfig = await Promise.all(
          hospedajesData.data.map(async (hospedaje: Hospedaje) => {
            try {
              console.log(`🤖 Obteniendo config de chatbot para hospedaje: ${hospedaje.nombre} (${hospedaje.id})`)
              
              const configResponse = await apiClient.get(`/chatbot/${hospedaje.id}/configuration`)
              const chatbotConfig = configResponse.data
              
              console.log(`✅ Config encontrada para ${hospedaje.nombre}:`, chatbotConfig)
              
              // Determinar el estado basado en la configuración
              let configStatus: 'sin-configurar' | 'configurando' | 'configurado' = 'sin-configurar'
              if (chatbotConfig.isTrained) {
                configStatus = 'configurado'
              } else if (chatbotConfig.pdfUrl) {
                configStatus = 'configurando'
              }

              return {
                ...hospedaje,
                chatbotConfig,
                configStatus
              }
            } catch (error: any) {
              if (error.response?.status === 404) {
                console.log(`📝 Sin configuración para ${hospedaje.nombre}`)
              } else {
                console.error(`❌ Error obteniendo config para hospedaje ${hospedaje.id}:`, error)
              }
              
              return {
                ...hospedaje,
                chatbotConfig: null,
                configStatus: 'sin-configurar' as const
              }
            }
          })
        )

      setHospedajes(hospedajesWithConfig)
    } catch (error) {
      console.error('Error cargando hospedajes:', error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los hospedajes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Cargar hospedajes cuando el componente se monta
  useEffect(() => {
    console.log('🔍 useEffect - Estado de permisos:', {
      isLoading: userPermissions.isLoading,
      hasAdminAccess: userPermissions.hasAdminAccess,
      userPermissions: userPermissions
    })
    
    if (!userPermissions.isLoading && userPermissions.hasAdminAccess) {
      console.log('✅ Usuario tiene permisos de admin, cargando hospedajes...')
      loadHospedajes()
    } else if (!userPermissions.isLoading && !userPermissions.hasAdminAccess) {
      console.log('❌ Usuario no tiene permisos de admin')
      setLoading(false)
    } else if (!userPermissions.isLoading) {
      console.log('⚠️ Permisos cargados pero estado indefinido')
      setLoading(false)
    }
  }, [userPermissions.isLoading, userPermissions.hasAdminAccess])

  // Filtrar hospedajes por búsqueda y estado
  const filteredHospedajes = hospedajes.filter(hospedaje => {
    const matchesSearch = hospedaje.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hospedaje.ciudad?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hospedaje.tipoHotel?.nombre?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === "todos" || hospedaje.configStatus === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredHospedajes.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredHospedajes.length / itemsPerPage)

  // Función para obtener el badge del estado
  const getStatusBadge = (configStatus: string) => {
    switch (configStatus) {
      case 'configurado':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Configurado
          </Badge>
        )
      case 'configurando':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            En configuración
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Sin configurar
          </Badge>
        )
    }
  }

  // Función para obtener el texto del botón
  const getButtonText = (configStatus: string) => {
    switch (configStatus) {
      case 'configurado':
        return "Gestionar"
      case 'configurando':
        return "Continuar"
      default:
        return "Configurar"
    }
  }

  // Función para cambiar de página
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Función para abrir el diálogo de reemplazo de PDF
  const openReplacePdfDialog = (hospedajeId: string, hospedajeNombre: string, currentPdfName: string) => {
    setReplacePdfDialog({
      isOpen: true,
      hospedajeId,
      hospedajeNombre,
      currentPdfName
    })
  }

  // Función para cerrar el diálogo de reemplazo de PDF
  const closeReplacePdfDialog = () => {
    setReplacePdfDialog({
      isOpen: false,
      hospedajeId: '',
      hospedajeNombre: '',
      currentPdfName: ''
    })
  }

  // Función para reemplazar PDF
  const handleReplacePdf = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReplacingPdf(true)

    try {
      const formData = new FormData(event.currentTarget)
      const file = formData.get('file') as File
      
      if (!file) {
        toast({
          title: "Error",
          description: "Por favor selecciona un archivo PDF",
          variant: "destructive",
        })
        return
      }

      // Verificar que sea un PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: "Error",
          description: "El archivo debe ser un PDF",
          variant: "destructive",
        })
        return
      }

      // Agregar el hospedajeId al FormData
      formData.append('hospedajeId', replacePdfDialog.hospedajeId)

      console.log('🔄 Reemplazando PDF para hospedaje:', replacePdfDialog.hospedajeId)
      
      const result = await uploadPdf(formData)
      
      if (result.success) {
        toast({
          title: "Éxito",
          description: "PDF reemplazado correctamente",
        })
        
        // Recargar la lista de hospedajes
        await loadHospedajes()
        
        // Cerrar el diálogo
        closeReplacePdfDialog()
      } else {
        toast({
          title: "Error",
          description: result.error || "Error al reemplazar el PDF",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error reemplazando PDF:', error)
      toast({
        title: "Error",
        description: "Error inesperado al reemplazar el PDF",
        variant: "destructive",
      })
    } finally {
      setReplacingPdf(false)
    }
  }

  // Verificar permisos
  if (userPermissions.isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Bot className="h-8 w-8 animate-spin text-orange-600" />
        <span className="ml-2">Cargando información...</span>
      </div>
    )
  }

  if (!userPermissions.hasAdminAccess) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-medium text-red-600">Sin permisos</h2>
        <p className="mt-2">No tienes permisos para gestionar chatbots. Debes ser propietario de al menos un hospedaje.</p>
      </div>
    )
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">Chatbots / Gestión</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="border-orange-600 text-orange-600">
              <FileText className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="configurado">Configurado</SelectItem>
                <SelectItem value="configurando">En configuración</SelectItem>
                <SelectItem value="sin-configurar">Sin configurar</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Input
                placeholder="Buscar por nombre, ciudad, tipo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hospedaje</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado del Chatbot</TableHead>
                <TableHead>PDF Configurado</TableHead>
                <TableHead>Tono</TableHead>
                <TableHead>Última Actualización</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full">
                      <Bot className="h-8 w-8 animate-spin text-orange-600" />
                      <span className="ml-2">Cargando chatbots...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">
                        {searchQuery || statusFilter !== "todos" 
                          ? 'No se encontraron hospedajes con los filtros aplicados' 
                          : 'No tienes hospedajes registrados'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((hospedaje) => (
                  <TableRow key={hospedaje.id}>
                    <TableCell className="font-medium">{hospedaje.nombre}</TableCell>
                    <TableCell>{hospedaje.tipoHotel?.nombre || "Sin tipo"}</TableCell>
                    <TableCell>{hospedaje.ciudad}, {hospedaje.provincia}</TableCell>
                    <TableCell>{getStatusBadge(hospedaje.configStatus)}</TableCell>
                    <TableCell>
                      {hospedaje.chatbotConfig?.pdfFilename ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-green-600">
                            ✓ {hospedaje.chatbotConfig.pdfFilename}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => openReplacePdfDialog(
                              hospedaje.id, 
                              hospedaje.nombre, 
                              hospedaje.chatbotConfig?.pdfFilename || ''
                            )}
                            title="Reemplazar PDF"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Sin PDF</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hospedaje.chatbotConfig?.tono ? (
                        <Badge variant="secondary" className="capitalize">
                          {hospedaje.chatbotConfig.tono}
                        </Badge>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hospedaje.chatbotConfig?.updatedAt ? (
                        <span className="text-sm text-gray-600">
                          {new Date(hospedaje.chatbotConfig.updatedAt).toLocaleDateString('es-ES')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={hospedaje.configStatus === 'configurado' ? 'outline' : 'default'}
                        size="sm"
                        className={hospedaje.configStatus === 'configurado' ? 'border-orange-600 text-orange-600' : 'bg-orange-600 hover:bg-orange-700'}
                        onClick={() => router.push(`/adminABM/chatbot/${hospedaje.id}`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {getButtonText(hospedaje.configStatus)}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredHospedajes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-gray-500">
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredHospedajes.length)} de{" "}
              {filteredHospedajes.length} resultados
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <span className="text-sm mr-2">Elementos por página:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  ←
                </Button>

                <div className="flex items-center mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageToShow
                    if (totalPages <= 5) {
                      pageToShow = i + 1
                    } else if (currentPage <= 3) {
                      pageToShow = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageToShow = totalPages - 4 + i
                    } else {
                      pageToShow = currentPage - 2 + i
                    }

                    return (
                      <Button
                        key={i}
                        variant={currentPage === pageToShow ? "default" : "outline"}
                        size="sm"
                        className={`h-8 w-8 p-0 mx-1 ${currentPage === pageToShow ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                        onClick={() => paginate(pageToShow)}
                      >
                        {pageToShow}
                      </Button>
                    )
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  →
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Diálogo para reemplazar PDF */}
      <Dialog open={replacePdfDialog.isOpen} onOpenChange={closeReplacePdfDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reemplazar PDF</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReplacePdf} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Hospedaje:</Label>
              <p className="text-sm text-gray-600">{replacePdfDialog.hospedajeNombre}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">PDF actual:</Label>
              <p className="text-sm text-gray-600">{replacePdfDialog.currentPdfName}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm font-medium">
                Nuevo archivo PDF:
              </Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".pdf"
                required
                disabled={replacingPdf}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeReplacePdfDialog}
                disabled={replacingPdf}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={replacingPdf}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {replacingPdf ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Reemplazando...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Reemplazar PDF
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
