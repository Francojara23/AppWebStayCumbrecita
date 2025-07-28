"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => {
  // Usar un estado local para manejar los cambios de valor
  const [value, setValue] = React.useState(props.defaultValue || props.value)

  // Actualizar el estado local cuando cambian las props
  React.useEffect(() => {
    if (props.value !== undefined) {
      setValue(props.value)
    }
  }, [props.value])

  // Manejar cambios en el slider
  const handleValueChange = (newValue: number[]) => {
    setValue(newValue)
    if (props.onValueChange) {
      props.onValueChange(newValue)
    }
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
      value={value}
      onValueChange={handleValueChange}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-gray-700">
        <SliderPrimitive.Range className="absolute h-full bg-[#C84A31]" />
      </SliderPrimitive.Track>
      {value && value.length > 0 && (
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#C84A31] bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      )}
      {value && value.length > 1 && (
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-[#C84A31] bg-white ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
      )}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
