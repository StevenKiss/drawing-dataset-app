import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

interface BrushSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  brushSize?: number;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  BrushSliderProps
>(({ className, brushSize = 10, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center h-8",
      className
    )}
    {...props}
  >
    {/* Track */}
    <SliderPrimitive.Track className="relative h-3 w-full rounded-full bg-gray-200 overflow-hidden">
      <SliderPrimitive.Range className="absolute h-3 rounded-full bg-green-500" />
    </SliderPrimitive.Track>
    {/* Thumb */}
    <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-gray-300 bg-white shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
