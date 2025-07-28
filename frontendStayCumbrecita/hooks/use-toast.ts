// Simplified version of the toast hook
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export const toast = ({ title, description, variant = "default" }: ToastProps) => {
  return sonnerToast[variant === "destructive" ? "error" : "success"](title, {
    description,
  })
}

// Export useToast hook for compatibility
export const useToast = () => {
  return {
    toast,
  }
}
