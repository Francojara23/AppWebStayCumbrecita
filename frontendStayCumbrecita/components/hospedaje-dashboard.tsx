"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Search, Plus, Eye, Edit, Trash } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

// Datos de ejemplo para hoteles
const mockHotels = [
  {
    id: "HTL-001",
    name: "Hotel Las Cascadas",
    location: "Bariloche, Río Negro",
    rooms: 24,
    rating: 4.7,
    status: "Activo",
    imageUrl: "/mountain-cabin-retreat.png",
  },
  {
    id: "HTL-002",
    name: "Hostel El Viajero",
    location: "Córdoba Capital, Córdoba",
    rooms: 12,
    rating: 4.2,
    status: "Activo",
    imageUrl: "/cozy-mountain-retreat.png",
  },
  {
    id: "HTL-003",
    name: "Cabaña El Bosque",
    location: "Villa General Belgrano, Córdoba",
    rooms: 8,
    rating: 4.5,
    status: "Inactivo",
    imageUrl: "/forest-cabin-retreat.png",
  },
  {
    id: "HTL-004",
    name: "Hotel Montaña",
    location: "San Martín de los Andes, Neuquén",
    rooms: 32,
    rating: 4.8,
    status: "Activo",
    imageUrl: "/alpine-vista-retreat.png",
  },
  {
    id: "HTL-005",
    name: "Apartamentos Centro",
    location: "Mendoza Capital, Mendoza",
    rooms: 16,
    rating: 4.3,
    status: "Activo",
    imageUrl: "/modern-mountain-retreat.png",
  },
  {
    id: "HTL-006",
    name: "Posada del Valle",
    location: "Merlo, San Luis",
    rooms: 10,
    rating: 4.4,
    status: "Inactivo",
    imageUrl: "/secluded-mountain-retreat.png",
  },
  {
    id: "HTL-007",
    name: "Hotel Sierra Nevada",
    location: "La Cumbrecita, Córdoba",
    rooms: 18,
    rating: 4.6,
    status: "Activo",
    imageUrl: "/mountain-pool-retreat.png",
  },
  {
    id: "HTL-008",
    name: "Cabañas del Lago",
    location: "Villa La Angostura, Neuquén",
    rooms: 14,
    rating: 4.9,
    status: "Activo",
    imageUrl: "/snow-capped-chalets.png",
  },
]

export default function HotelDashboard() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Filtrar hoteles basado en búsqueda y estado
  const filteredHotels = mockHotels.filter((hotel) => {
    // Filtrar por término de búsqueda
    const matchesSearch =
      hotel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      hotel.id.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtrar por estado
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "activo" && hotel.status === "Activo") ||
      (statusFilter === "inactivo" && hotel.status === "Inactivo")

    return matchesSearch && matchesStatus
  })

  // Calcular paginación
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentHotels = filteredHotels.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage)

  // Función para cambiar de página
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  // Función para ver detalles de un hotel
  const viewHotelDetails = (hotelId: string) => {
    router.push(`/adminABM/habitaciones/${hotelId}`)
  }

  // Función para editar un hotel
  const editHotel = (hotelId: string) => {
    // Implementar lógica para editar hotel
    console.log(`Editar hotel ${hotelId}`)
  }

  // Función para eliminar un hotel
  const deleteHotel = (hotelId: string) => {
    // Implementar lógica para eliminar hotel
    console.log(`Eliminar hotel ${hotelId}`)
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <h1 className="text-xl font-medium text-orange-700">Hoteles Registrados</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px] bg-orange-600 text-white">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Input
                placeholder="Buscar hotel por nombre, ubicación o ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => router.push("/adminABM/alta-hospedaje")}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Hotel
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hotel</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Habitaciones</TableHead>
                <TableHead>Calificación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentHotels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">No se encontraron hoteles con los filtros aplicados</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentHotels.map((hotel) => (
                  <TableRow key={hotel.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-md overflow-hidden mr-3">
                          <Image
                            src={hotel.imageUrl || "/placeholder.svg"}
                            alt={hotel.name}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{hotel.name}</div>
                          <div className="text-xs text-gray-500">{hotel.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{hotel.location}</TableCell>
                    <TableCell>{hotel.rooms}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="text-yellow-500">★</span>
                        <span className="ml-1">{hotel.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          hotel.status === "Activo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {hotel.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => viewHotelDetails(hotel.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => editHotel(hotel.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => deleteHotel(hotel.id)}>
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredHotels.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-gray-500">
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredHotels.length)} de{" "}
              {filteredHotels.length} resultados
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
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center mx-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Mostrar páginas alrededor de la página actual
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
                        onClick={() => paginate(pageToShow)}
                        className={`h-8 w-8 p-0 mx-1 ${currentPage === pageToShow ? "bg-orange-600" : ""}`}
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
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
