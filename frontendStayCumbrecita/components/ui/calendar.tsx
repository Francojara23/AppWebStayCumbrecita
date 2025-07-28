"use client"

import type * as React from "react"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Button } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  enableYearMonthSelection?: boolean
}

function Calendar({ 
  className, 
  classNames, 
  showOutsideDays = true, 
  enableYearMonthSelection = true,
  ...props 
}: CalendarProps) {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()
  
  const [currentView, setCurrentView] = useState<'day' | 'month' | 'year'>('day')
  const [displayMonth, setDisplayMonth] = useState(() => {
    if (props.defaultMonth) return props.defaultMonth
    if (props.month) return props.month
    return new Date()
  })

  // Meses en español
  const mesesEspanol = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]

  // Generar años (10 años atrás y 10 adelante)
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(displayMonth.getFullYear(), monthIndex, 1)
    setDisplayMonth(newDate)
    setCurrentView('day')
    props.onMonthChange?.(newDate)
  }

  const handleYearSelect = (year: number) => {
    const newDate = new Date(year, displayMonth.getMonth(), 1)
    setDisplayMonth(newDate)
    setCurrentView('month')
  }

  const handleViewChange = () => {
    if (!enableYearMonthSelection) return
    
    switch (currentView) {
      case 'day':
        setCurrentView('month')
        break
      case 'month':
        setCurrentView('year')
        break
      case 'year':
        setCurrentView('day')
        break
    }
  }

  const renderCaption = () => {
    const monthName = format(displayMonth, 'MMMM', { locale: es })
    const year = displayMonth.getFullYear()
    
    return (
      <div className="flex items-center justify-between p-4">
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => {
            const newDate = new Date(displayMonth)
            if (currentView === 'day') {
              newDate.setMonth(newDate.getMonth() - 1)
            } else if (currentView === 'month') {
              newDate.setFullYear(newDate.getFullYear() - 1)
            } else {
              newDate.setFullYear(newDate.getFullYear() - 10)
            }
            setDisplayMonth(newDate)
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          className={cn(
            "text-sm font-medium capitalize",
            enableYearMonthSelection && "hover:bg-accent cursor-pointer"
          )}
          onClick={handleViewChange}
        >
          {currentView === 'day' && `${monthName} ${year}`}
          {currentView === 'month' && `${year}`}
          {currentView === 'year' && `${Math.floor(year / 10) * 10} - ${Math.floor(year / 10) * 10 + 9}`}
        </Button>
        
        <Button
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={() => {
            const newDate = new Date(displayMonth)
            if (currentView === 'day') {
              newDate.setMonth(newDate.getMonth() + 1)
            } else if (currentView === 'month') {
              newDate.setFullYear(newDate.getFullYear() + 1)
            } else {
              newDate.setFullYear(newDate.getFullYear() + 10)
            }
            setDisplayMonth(newDate)
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  const renderMonthView = () => (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {mesesEspanol.map((mes, index) => (
          <Button
            key={mes}
            variant={index === displayMonth.getMonth() ? "default" : "ghost"}
            className={cn(
              "h-12 text-sm",
              index === displayMonth.getMonth() && "bg-orange-600 hover:bg-orange-700"
            )}
            onClick={() => handleMonthSelect(index)}
          >
            {mes}
          </Button>
        ))}
      </div>
    </div>
  )

  const renderYearView = () => (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
        {years.map((year) => (
          <Button
            key={year}
            variant={year === displayMonth.getFullYear() ? "default" : "ghost"}
            className={cn(
              "h-10 text-sm",
              year === displayMonth.getFullYear() && "bg-orange-600 hover:bg-orange-700"
            )}
            onClick={() => handleYearSelect(year)}
          >
            {year}
          </Button>
        ))}
      </div>
    </div>
  )

  if (currentView === 'month') {
    return (
      <div className={cn("p-3", className)}>
        {renderCaption()}
        {renderMonthView()}
      </div>
    )
  }

  if (currentView === 'year') {
    return (
      <div className={cn("p-3", className)}>
        {renderCaption()}
        {renderYearView()}
      </div>
    )
  }

  return (
    <div className={cn("p-3", className)}>
      {enableYearMonthSelection && renderCaption()}
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={es}
        month={enableYearMonthSelection ? displayMonth : props.defaultMonth}
        onMonthChange={enableYearMonthSelection ? setDisplayMonth : props.onMonthChange}
        components={{
          Chevron: ({ ...props }) => {
            if (props.orientation === "left") {
              return <ChevronLeft className="h-4 w-4" />
            }
            return <ChevronRight className="h-4 w-4" />
          },
          ...(enableYearMonthSelection && {
            MonthCaption: () => <div />,
            Nav: () => <div />,
          })
        }}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center gap-1",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex w-full",
          head_cell: "text-muted-foreground rounded-md font-normal text-[0.8rem] flex-1 text-center",
          row: "flex w-full",
          cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1 flex items-center justify-center h-9",
          day: cn(
            buttonVariants({ variant: "ghost" }), 
            "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-orange-600 text-white hover:bg-orange-700 hover:text-white focus:bg-orange-700 focus:text-white",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed pointer-events-none bg-transparent hover:bg-transparent",
          day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
