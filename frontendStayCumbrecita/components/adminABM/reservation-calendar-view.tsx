"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Eye, CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Reservation {
  id: string
  checkIn: string
  checkOut: string
  guestName: string
  roomType: string
  status: string
  hotelName: string
  totalAmount: number
}

interface ReservationCalendarViewProps {
  reservations: Reservation[]
  onViewDetails: (reservation: Reservation) => void
}

// Helper function to parse date strings in format DD/MM/YYYY
const parseDate = (dateStr: string): Date => {
  const [day, month, year] = dateStr.split("/").map(Number)
  return new Date(year, month - 1, day)
}

// Helper function to format date as DD/MM/YYYY
const formatDate = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${date.getFullYear()}`
}

export default function ReservationCalendarView({ reservations, onViewDetails }: ReservationCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<Date[]>([])
  const [viewType, setViewType] = useState<"month" | "week">("month")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const [showYearSelector, setShowYearSelector] = useState(false)
  const [yearRange, setYearRange] = useState<number[]>([])
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())

  // Generate year range
  useEffect(() => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i)
    }
    setYearRange(years)
  }, [])

  // Get status color class
  const getStatusColorClass = (status: string): string => {
    switch (status) {
      case "Confirmada":
        return "bg-green-100 border-l-green-500 text-green-800"
      case "Pendiente":
        return "bg-yellow-100 border-l-yellow-500 text-yellow-800"
      case "Cancelada":
        return "bg-red-100 border-l-red-500 text-red-800"
      default:
        return "bg-gray-100 border-l-gray-500 text-gray-800"
    }
  }

  // Generate calendar days based on current date and view type
  useEffect(() => {
    const days: Date[] = []
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

    if (viewType === "month") {
      // Get the first day of the month
      const firstDayOfWeek = firstDay.getDay() // 0 = Sunday, 1 = Monday, etc.

      // Add days from previous month to start the calendar on Sunday
      const daysFromPrevMonth = firstDayOfWeek === 0 ? 0 : firstDayOfWeek
      for (let i = daysFromPrevMonth; i > 0; i--) {
        const prevDate = new Date(firstDay)
        prevDate.setDate(prevDate.getDate() - i)
        days.push(prevDate)
      }

      // Add all days of the current month
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      const daysInMonth = lastDay.getDate()

      for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i))
      }

      // Add days from next month to complete the grid (6 rows x 7 columns = 42 cells)
      const remainingDays = 42 - days.length
      for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(lastDay)
        nextDate.setDate(nextDate.getDate() + i)
        days.push(nextDate)
      }
    } else {
      // Week view - show 7 days starting from current date
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()) // Start from Sunday

      for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek)
        day.setDate(startOfWeek.getDate() + i)
        days.push(day)
      }
    }

    setCalendarDays(days)
  }, [currentDate, viewType])

  // Navigate to previous month/week
  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewType === "month") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setDate(newDate.getDate() - 7)
    }
    setCurrentDate(newDate)
    setSelectedMonth(newDate.getMonth())
    setSelectedYear(newDate.getFullYear())
  }

  // Navigate to next month/week
  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewType === "month") {
      newDate.setMonth(newDate.getMonth() + 1)
    } else {
      newDate.setDate(newDate.getDate() + 7)
    }
    setCurrentDate(newDate)
    setSelectedMonth(newDate.getMonth())
    setSelectedYear(newDate.getFullYear())
  }

  // Get reservations for a specific day
  const getReservationsForDay = (day: Date): Reservation[] => {
    const formattedDay = formatDate(day)
    return reservations.filter((reservation) => {
      const checkInDate = parseDate(reservation.checkIn)
      const checkOutDate = parseDate(reservation.checkOut)

      // Check if the day is between check-in and check-out dates (inclusive)
      const currentDay = parseDate(formattedDay)
      return currentDay >= checkInDate && currentDay <= checkOutDate
    })
  }

  // Format month name
  const getMonthName = (date: Date): string => {
    return date.toLocaleString("es-ES", { month: "long", year: "numeric" })
  }

  // Get month name without year
  const getMonthNameOnly = (monthIndex: number): string => {
    const date = new Date()
    date.setMonth(monthIndex)
    return date.toLocaleString("es-ES", { month: "long" })
  }

  // Handle date selection
  const handleDateSelection = () => {
    const newDate = new Date(selectedYear, selectedMonth, 1)
    setCurrentDate(newDate)
    setIsDatePickerOpen(false)
  }

  // Go to today
  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedMonth(today.getMonth())
    setSelectedYear(today.getFullYear())
  }

  // Toggle between month and year selector
  const toggleYearSelector = () => {
    setShowYearSelector(!showYearSelector)
  }

  // Format current selection for display
  const formatCurrentSelection = () => {
    if (viewType === "month") {
      return getMonthName(currentDate)
    } else {
      return `Semana del ${formatDate(calendarDays[0])} al ${formatDate(calendarDays[6])}`
    }
  }

  return (
    <Card className="mb-6 shadow-md">
      <CardContent className="p-0">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPrevious} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              className="font-semibold text-lg hover:bg-gray-100 flex items-center gap-1"
              onClick={() => setIsDatePickerOpen(true)}
            >
              <h2 className="capitalize">{formatCurrentSelection()}</h2>
              <CalendarIcon className="h-4 w-4 ml-1" />
            </Button>

            <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={goToToday} className="ml-2">
              Hoy
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewType === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewType("month")}
              className={viewType === "month" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              Mes
            </Button>
            <Button
              variant={viewType === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewType("week")}
              className={viewType === "week" ? "bg-orange-600 hover:bg-orange-700" : ""}
            >
              Semana
            </Button>
          </div>
        </div>

        {/* Calendar Header - Days of Week */}
        <div className="grid grid-cols-7 bg-white">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day, index) => (
            <div key={index} className="text-center py-2 text-sm font-medium text-gray-500 border-b">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 bg-white">
          {calendarDays.map((day, index) => {
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = formatDate(day) === formatDate(new Date())
            const dayReservations = getReservationsForDay(day)
            const isHovered = hoveredDay === index

            return (
              <div
                key={index}
                className={`min-h-[120px] border-r border-b p-1 relative ${
                  isCurrentMonth ? "bg-white" : "bg-gray-50"
                } ${isHovered ? "bg-gray-50" : ""}`}
                onMouseEnter={() => setHoveredDay(index)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className={`text-right p-1 ${!isCurrentMonth ? "text-gray-400" : ""}`}>
                  <span
                    className={`inline-block rounded-full w-7 h-7 text-center leading-7 ${
                      isToday ? "bg-orange-500 text-white font-medium" : isCurrentMonth ? "hover:bg-gray-200" : ""
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[90px] pr-1">
                  {dayReservations.map((reservation) => {
                    const isCheckIn = formatDate(day) === reservation.checkIn
                    const isCheckOut = formatDate(day) === reservation.checkOut
                    const isMultiDay = reservation.checkIn !== reservation.checkOut

                    // Determine if this is the first, middle, or last day of a multi-day reservation
                    let positionClass = ""
                    if (isMultiDay) {
                      if (isCheckIn) positionClass = "rounded-l-md ml-0"
                      else if (isCheckOut) positionClass = "rounded-r-md"
                      else positionClass = "rounded-none"
                    } else {
                      positionClass = "rounded-md"
                    }

                    return (
                      <div
                        key={reservation.id}
                        className={`text-xs p-1.5 border-l-4 flex justify-between items-center cursor-pointer hover:shadow-md transition-shadow ${positionClass} ${getStatusColorClass(
                          reservation.status,
                        )}`}
                        onClick={() => onViewDetails(reservation)}
                      >
                        <div className="truncate flex-1">
                          <div className="font-medium">{reservation.guestName}</div>
                          <div className="text-[10px] mt-0.5 flex items-center">
                            {isCheckIn && (
                              <Badge variant="outline" className="mr-1 text-[9px] py-0 border-green-500 text-green-700">
                                IN
                              </Badge>
                            )}
                            {isCheckOut && (
                              <Badge variant="outline" className="mr-1 text-[9px] py-0 border-red-500 text-red-700">
                                OUT
                              </Badge>
                            )}
                            <span className="truncate">{reservation.roomType}</span>
                          </div>
                        </div>
                        <Eye className="h-3 w-3 flex-shrink-0 opacity-70" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      {/* Date Picker Dialog */}
      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="sm:max-w-[400px] p-0">
          <DialogHeader className="p-4 border-b bg-orange-600 text-white">
            <DialogTitle className="text-xl font-bold">Seleccionar fecha</DialogTitle>
          </DialogHeader>

          <div className="p-4">
            {/* Current Selection Display */}
            <div className="text-2xl font-bold mb-6">
              {showYearSelector ? (
                <span>Seleccionar año</span>
              ) : (
                <span>
                  {getMonthNameOnly(selectedMonth)} {selectedYear}
                </span>
              )}
            </div>

            {/* Month/Year Toggle */}
            <Button
              variant="outline"
              className="w-full mb-4 flex justify-between items-center"
              onClick={toggleYearSelector}
            >
              {showYearSelector ? "Seleccionar mes" : "Seleccionar año"}
              <ChevronRight className="h-4 w-4" />
            </Button>

            {showYearSelector ? (
              // Year Selector Grid
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-3 gap-2">
                  {yearRange.map((year) => (
                    <Button
                      key={year}
                      variant={year === selectedYear ? "default" : "outline"}
                      className={year === selectedYear ? "bg-orange-600 hover:bg-orange-700" : ""}
                      onClick={() => {
                        setSelectedYear(year)
                        setShowYearSelector(false)
                      }}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              // Month Selector Grid
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => (
                  <Button
                    key={i}
                    variant={i === selectedMonth ? "default" : "outline"}
                    className={`capitalize ${i === selectedMonth ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                    onClick={() => setSelectedMonth(i)}
                  >
                    {getMonthNameOnly(i).substring(0, 3)}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t">
            <Button variant="outline" onClick={() => setIsDatePickerOpen(false)}>
              Cancelar
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={handleDateSelection}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
