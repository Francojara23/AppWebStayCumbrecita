"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowUp, ArrowDown, FileUp, Calendar, Users, Hotel, DollarSign, Bed, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"

// Datos simulados para los gráficos
const monthlyReservationsData = [
  { name: "Ene", reservas: 65 },
  { name: "Feb", reservas: 59 },
  { name: "Mar", reservas: 80 },
  { name: "Abr", reservas: 81 },
  { name: "May", reservas: 56 },
  { name: "Jun", reservas: 55 },
  { name: "Jul", reservas: 40 },
  { name: "Ago", reservas: 45 },
  { name: "Sep", reservas: 60 },
  { name: "Oct", reservas: 70 },
  { name: "Nov", reservas: 85 },
  { name: "Dic", reservas: 90 },
]

const yearlyReservationsData = [
  { name: "2020", reservas: 400 },
  { name: "2021", reservas: 300 },
  { name: "2022", reservas: 500 },
  { name: "2023", reservas: 700 },
  { name: "2024", reservas: 786 },
]

const monthlyRevenueData = [
  { name: "Ene", ingresos: 4000 },
  { name: "Feb", ingresos: 3000 },
  { name: "Mar", ingresos: 5000 },
  { name: "Abr", ingresos: 5100 },
  { name: "May", ingresos: 4200 },
  { name: "Jun", ingresos: 3800 },
  { name: "Jul", ingresos: 3500 },
  { name: "Ago", ingresos: 3900 },
  { name: "Sep", ingresos: 4500 },
  { name: "Oct", ingresos: 5200 },
  { name: "Nov", ingresos: 6000 },
  { name: "Dic", ingresos: 7000 },
]

const roomRevenueData = [
  { name: "Estándar", ingresos: 4000 },
  { name: "Superior", ingresos: 6000 },
  { name: "Deluxe", ingresos: 8000 },
  { name: "Suite", ingresos: 12000 },
]

const hotelRevenueData = [
  { name: "Las Cascadas", ingresos: 15000 },
  { name: "El Viajero", ingresos: 8000 },
  { name: "Cabañas del Bosque", ingresos: 12000 },
]

const roomOccupancyData = [
  { name: "Estándar", value: 45 },
  { name: "Superior", value: 30 },
  { name: "Deluxe", value: 15 },
  { name: "Suite", value: 10 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const touristsByOriginData = [
  { name: "Nacional", value: 65 },
  { name: "Internacional", value: 35 },
]

const touristsByMonthData = [
  { name: "Ene", turistas: 120 },
  { name: "Feb", turistas: 110 },
  { name: "Mar", turistas: 150 },
  { name: "Abr", turistas: 155 },
  { name: "May", turistas: 100 },
  { name: "Jun", turistas: 90 },
  { name: "Jul", turistas: 80 },
  { name: "Ago", turistas: 85 },
  { name: "Sep", turistas: 110 },
  { name: "Oct", turistas: 130 },
  { name: "Nov", turistas: 160 },
  { name: "Dic", turistas: 180 },
]

const dailyRevenueData = Array.from({ length: 30 }, (_, i) => ({
  name: `${i + 1}`,
  ingresos: Math.floor(Math.random() * 1000) + 500,
}))

export default function ReporteriaPage() {
  const [timeFilter, setTimeFilter] = useState("year")
  const [hotelFilter, setHotelFilter] = useState("all")

  // Calcular KPIs
  const totalReservations = yearlyReservationsData.reduce((sum, item) => sum + item.reservas, 0)
  const totalRevenue = monthlyRevenueData.reduce((sum, item) => sum + item.ingresos, 0)
  const totalTourists = touristsByMonthData.reduce((sum, item) => sum + item.turistas, 0)
  const averageOccupancy = Math.floor(
    roomOccupancyData.reduce((sum, item) => sum + item.value, 0) / roomOccupancyData.length,
  )

  // Calcular cambios porcentuales (simulados)
  const reservationsChange = 12.5
  const revenueChange = 8.3
  const touristsChange = 15.2
  const occupancyChange = -2.1

  return (
    <>
      <header className="border-b border-gray-200">
        <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-medium text-orange-700">Reportería</h1>
          <div className="flex gap-2">
            <Select value={hotelFilter} onValueChange={setHotelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar hotel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los hoteles</SelectItem>
                <SelectItem value="cascadas">Hotel Las Cascadas</SelectItem>
                <SelectItem value="viajero">Hostel El Viajero</SelectItem>
                <SelectItem value="cabanas">Cabañas del Bosque</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-orange-600 text-orange-600">
              <FileUp className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 overflow-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReservations}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {reservationsChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={reservationsChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(reservationsChange)}%
                </span>
                <span className="ml-1">desde el período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {revenueChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={revenueChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(revenueChange)}%
                </span>
                <span className="ml-1">desde el período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Turistas</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTourists}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {touristsChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={touristsChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(touristsChange)}%
                </span>
                <span className="ml-1">desde el período anterior</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ocupación Promedio</CardTitle>
              <Bed className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageOccupancy}%</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {occupancyChange > 0 ? (
                  <ArrowUp className="mr-1 h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={occupancyChange > 0 ? "text-green-500" : "text-red-500"}>
                  {Math.abs(occupancyChange)}%
                </span>
                <span className="ml-1">desde el período anterior</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different report categories */}
        <Tabs defaultValue="reservations" className="mb-6">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="reservations" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Reservas</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Ingresos</span>
            </TabsTrigger>
            <TabsTrigger value="occupancy" className="flex items-center gap-2">
              <Hotel className="h-4 w-4" />
              <span className="hidden sm:inline">Ocupación</span>
            </TabsTrigger>
            <TabsTrigger value="tourists" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Turistas</span>
            </TabsTrigger>
          </TabsList>

          {/* Reservations Tab */}
          <TabsContent value="reservations">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Reservas por Mes</CardTitle>
                    <Select defaultValue="year" onValueChange={setTimeFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Este Año</SelectItem>
                        <SelectItem value="quarter">Este Trimestre</SelectItem>
                        <SelectItem value="month">Este Mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <CardDescription>Cantidad de reservas realizadas por mes</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyReservationsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="reservas" fill="#f97316" name="Reservas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reservas por Año</CardTitle>
                  <CardDescription>Evolución anual de las reservas</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={yearlyReservationsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="reservas" stroke="#f97316" name="Reservas" activeDot={{ r: 8 }} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Ingresos por Mes</CardTitle>
                    <Select defaultValue="year" onValueChange={setTimeFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Período" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="year">Este Año</SelectItem>
                        <SelectItem value="quarter">Este Trimestre</SelectItem>
                        <SelectItem value="month">Este Mes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <CardDescription>Ingresos totales por mes</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, "Ingresos"]} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#f97316"
                        fill="#fdba74"
                        name="Ingresos"
                        activeDot={{ r: 8 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Tipo de Habitación</CardTitle>
                  <CardDescription>Distribución de ingresos por tipo de habitación</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={roomRevenueData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip formatter={(value) => [`$${value}`, "Ingresos"]} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#f97316" name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Ingresos Diarios</CardTitle>
                  <CardDescription>Ingresos por día del mes actual</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={dailyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, "Ingresos"]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        stroke="#f97316"
                        name="Ingresos"
                        dot={false}
                        activeDot={{ r: 8 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Occupancy Tab */}
          <TabsContent value="occupancy">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ocupación por Tipo de Habitación</CardTitle>
                  <CardDescription>Distribución porcentual de ocupación</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="w-full max-w-xs">
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={roomOccupancyData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {roomOccupancyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, "Ocupación"]} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Hotel</CardTitle>
                  <CardDescription>Comparación de ingresos entre hoteles</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={hotelRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, "Ingresos"]} />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#f97316" name="Ingresos" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tourists Tab */}
          <TabsContent value="tourists">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Turistas por Mes</CardTitle>
                  <CardDescription>Cantidad de turistas por mes</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={touristsByMonthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="turistas" fill="#f97316" name="Turistas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Origen de Turistas</CardTitle>
                  <CardDescription>Distribución de turistas por origen</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <div className="w-full max-w-xs">
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={touristsByOriginData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {touristsByOriginData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Additional Reports Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Habitación Más Reservada</CardTitle>
              <Bed className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Suite Deluxe</div>
              <div className="text-xs text-muted-foreground">45 reservas en el último mes</div>
              <div className="mt-4">
                <div className="text-xs font-medium">Tasa de ocupación</div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: "85%" }}></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">85% ocupación</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mejor Mes</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Diciembre</div>
              <div className="text-xs text-muted-foreground">90 reservas | $7,000 ingresos</div>
              <div className="mt-4">
                <div className="text-xs font-medium">Comparación con promedio anual</div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-green-500" style={{ width: "130%" }}></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">+30% sobre el promedio</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hotel Más Rentable</CardTitle>
              <Hotel className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Hotel Las Cascadas</div>
              <div className="text-xs text-muted-foreground">$15,000 ingresos en el último mes</div>
              <div className="mt-4">
                <div className="text-xs font-medium">Participación en ingresos totales</div>
                <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                  <div className="h-2 rounded-full bg-orange-500" style={{ width: "42%" }}></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">42% del total</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  )
}
