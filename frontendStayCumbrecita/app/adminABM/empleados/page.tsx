"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileUp, Edit, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
// Update import to use default export
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog"
import { useBuscarEmpleadoPorDni, useRoles, useMisHospedajes, useCrearEmpleado } from '@/hooks/use-api'
import { useEmpleadosHospedaje } from '@/hooks/use-empleados-hospedaje'

// Tipo para los empleados
interface Employee {
  id: string
  lastName: string
  firstName: string
  dni: string
  role: string
  accommodation: string
}

// Tipo para los hospedajes
interface Accommodation {
  id: string
  name: string
}

export default function EmpleadosPage() {
  // Estado para los empleados locales (nuevos)
  const [employees, setEmployees] = useState<Employee[]>([])

  // Estado para el diálogo de alta de empleados
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Estado para el hospedaje seleccionado
  const [selectedHospedajeId, setSelectedHospedajeId] = useState<string | null>(null)

  // Estado para el diálogo de confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null)

  // Estado para la búsqueda de DNI
  const [searchDni, setSearchDni] = useState("")
  const { buscar, isLoading: isSearching, empleado, error } = useBuscarEmpleadoPorDni()

  // Estado para el empleado encontrado (adaptado a la UI local)
  const [foundEmployee, setFoundEmployee] = useState<{
    id: string
    lastName: string
    firstName: string
    dni: string
    email: string
  } | null>(null)

  // Estado para el rol y hospedaje seleccionados
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedAccommodation, setSelectedAccommodation] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchQuery, setSearchQuery] = useState("")

  const { data: rolesData, isLoading: isLoadingRoles } = useRoles()
  const { data: hospedajesData, isLoading: isLoadingHospedajes } = useMisHospedajes()
  const { mutate: crearEmpleado, isPending: isCreating } = useCrearEmpleado()
  
  // Hook para cargar empleados del hospedaje seleccionado
  const { empleados: empleadosBackend, isLoading: isLoadingEmpleados, refetch: refetchEmpleados } = useEmpleadosHospedaje(selectedHospedajeId)

  // Seleccionar automáticamente el primer hospedaje disponible
  useEffect(() => {
    if (hospedajesData?.data && hospedajesData.data.length > 0 && !selectedHospedajeId) {
      setSelectedHospedajeId(hospedajesData.data[0].id)
    }
  }, [hospedajesData?.data, selectedHospedajeId])

  // Filtrar roles para mostrar solo los de empleados (ajusta los nombres según tu modelo)
  const employeeRoles = (rolesData || []).filter((rol: any) =>
    [
      'ADMIN',
      'CONSERGE'
    ].includes(rol.nombre)
  )

  // Combinar empleados del backend con empleados locales
  const allEmployees = [
    // Convertir empleados del backend al formato local
    ...empleadosBackend.map(emp => ({
      id: emp.id,
      lastName: emp.usuario.apellido,
      firstName: emp.usuario.nombre,
      dni: emp.usuario.dni,
      role: emp.rol.nombre,
      accommodation: selectedHospedajeId || '',
      isFromBackend: true
    })),
    // Empleados locales (recién creados)
    ...employees.map(emp => ({ ...emp, isFromBackend: false }))
  ]

  // Nueva función para buscar empleado real
  const searchEmployeeByDni = async () => {
    if (!searchDni || searchDni.length < 7) {
      toast({
        title: "Error",
        description: "Por favor ingrese un DNI válido",
        variant: "destructive",
      })
      return
    }
    await buscar(searchDni)
  }

  // Sincronizar el resultado del hook con el estado local para la UI
  useEffect(() => {
    if (empleado) {
      setFoundEmployee({
        id: empleado.id,
        lastName: empleado.apellido,
        firstName: empleado.nombre,
        dni: empleado.dni,
        email: empleado.email,
      })
    } else if (error) {
      setFoundEmployee(null)
      toast({
        title: "No encontrado",
        description: error,
        variant: "destructive",
      })
    }
  }, [empleado, error])

  // Nueva función para agregar un empleado real
  const handleAddEmployee = () => {
    if (!foundEmployee) {
      toast({
        title: "Error",
        description: "Debe buscar y encontrar un empleado primero",
        variant: "destructive",
      })
      return
    }

    if (!selectedRole) {
      toast({
        title: "Error",
        description: "Debe seleccionar un rol para el empleado",
        variant: "destructive",
      })
      return
    }

    if (!selectedAccommodation) {
      toast({
        title: "Error",
        description: "Debe seleccionar un hospedaje para el empleado",
        variant: "destructive",
      })
      return
    }

    // Verificar si el empleado ya existe en el mismo hospedaje
    const employeeExists = allEmployees.some(
      (emp) => emp.dni === foundEmployee.dni && emp.accommodation === selectedAccommodation,
    )

    if (employeeExists) {
      toast({
        title: "Error",
        description: "Este empleado ya está asignado a este hospedaje",
        variant: "destructive",
      })
      return
    }

    // Buscar el rol por nombre para obtener su ID
    const rolSeleccionado = employeeRoles.find((rol: any) => rol.nombre === selectedRole)
    if (!rolSeleccionado) {
      toast({
        title: "Error",
        description: "Rol no encontrado",
        variant: "destructive",
      })
      return
    }

    // Crear el empleado usando el hook real
    crearEmpleado({
      usuarioId: foundEmployee.id,
      rolId: rolSeleccionado.id,
      hospedajeId: selectedAccommodation,
    }, {
      onSuccess: () => {
        // Limpiar el formulario
        setFoundEmployee(null)
        setSearchDni("")
        setSelectedRole("")
        setSelectedAccommodation("")
        
        // Cerrar el diálogo
        setIsAddDialogOpen(false)
        
        // Refrescar la lista de empleados del backend
        refetchEmpleados()
        
        // Limpiar empleados locales ya que ahora están en el backend
        setEmployees([])
      }
    })
  }

  // Función para eliminar un empleado
  const handleDeleteEmployee = (employeeId: string) => {
    setEmployeeToDelete(employeeId)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    // Here you would implement the actual delete logic
    console.log(`Deleting employee: ${employeeToDelete}`)
    setIsDeleteDialogOpen(false)
    setEmployeeToDelete(null)
    // In a real app, you would remove the item from the database
    // and then refresh the list
  }

  // Función para editar un empleado (en una implementación real, esto abriría un formulario de edición)
  const handleEditEmployee = (id: string) => {
    toast({
      title: "Editar empleado",
      description: `Editando empleado con ID: ${id}`,
    })
  }

  // Obtener el nombre del hospedaje por ID
  const getAccommodationName = (id: string) => {
    const accommodation = hospedajesData?.data.find((acc: any) => acc.id === id)
    return accommodation ? accommodation.nombre : id
  }

  // Filter employees based on search query
  const filteredEmployees = allEmployees.filter(
    (emp) =>
      emp.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.dni.includes(searchQuery),
  )

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)

  // Function to change page
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber)
    }
  }

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6">
          <h1 className="text-xl font-medium text-orange-700">Hospedajes / Empleados</h1>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex justify-between mb-6">
          <div className="flex gap-2 w-1/2">
            <Select 
              value={selectedHospedajeId || ""} 
              onValueChange={setSelectedHospedajeId}
              disabled={isLoadingHospedajes}
            >
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder={isLoadingHospedajes ? "Cargando..." : "Seleccionar hospedaje"} />
              </SelectTrigger>
              <SelectContent>
                {(hospedajesData?.data || []).map((hospedaje: any) => (
                  <SelectItem key={hospedaje.id} value={hospedaje.id}>
                    {hospedaje.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Buscar por nombre o DNI..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1) // Reset to first page on search
              }}
              className="max-w-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Alta empleados
            </Button>
            <Button variant="outline" className="text-orange-600 border-orange-600">
              <FileUp className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apellido</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Hospedaje</TableHead>
                <TableHead>Editar</TableHead>
                <TableHead>Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingEmpleados ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                        <p className="text-gray-500">Cargando empleados...</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-60 text-center">
                    <div className="flex items-center justify-center h-full bg-gray-50 rounded-md">
                      <p className="text-gray-500">
                        {selectedHospedajeId ? "No hay empleados registrados en este hospedaje" : "Selecciona un hospedaje para ver empleados"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.lastName}</TableCell>
                    <TableCell>{employee.firstName}</TableCell>
                    <TableCell>{employee.dni}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>{getAccommodationName(employee.accommodation)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditEmployee(employee.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500"
                        onClick={() => handleDeleteEmployee(employee.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {filteredEmployees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-4">
            <div className="text-sm text-gray-500">
              Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredEmployees.length)} de{" "}
              {filteredEmployees.length} resultados
            </div>

            <div className="flex items-center gap-2">
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

      {/* Diálogo para agregar empleado */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alta a empleados</DialogTitle>
            <DialogDescription>Busque un empleado por DNI para asignarle un rol y hospedaje</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Buscador de DNI */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="search-dni" className="text-right">
                DNI
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="search-dni"
                  value={searchDni}
                  onChange={(e) => setSearchDni(e.target.value)}
                  placeholder="Ingrese el DNI del empleado"
                  className="flex-1"
                />
                <Button variant="secondary" onClick={searchEmployeeByDni} disabled={isSearching}>
                  {isSearching ? "Buscando..." : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Datos del empleado encontrado */}
            {foundEmployee && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Apellido</Label>
                  <div className="col-span-3 font-medium">{foundEmployee.lastName}</div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Nombre</Label>
                  <div className="col-span-3 font-medium">{foundEmployee.firstName}</div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Email</Label>
                  <div className="col-span-3 font-medium">{foundEmployee.email}</div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Rol
                  </Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeRoles.map((rol: any) => (
                        <SelectItem key={rol.id} value={rol.nombre}>
                          {rol.descripcion || rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="accommodation" className="text-right">
                    Hospedaje
                  </Label>
                  <Select value={selectedAccommodation} onValueChange={setSelectedAccommodation}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Seleccionar hospedaje" />
                    </SelectTrigger>
                    <SelectContent>
                      {(hospedajesData?.data || []).map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleAddEmployee}
              disabled={!foundEmployee || !selectedRole || !selectedAccommodation || isCreating}
            >
              {isCreating ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Empleado"
        description="¿Estás seguro de que deseas eliminar este empleado? Esta acción no se puede deshacer."
      />
    </>
  )
}
