import { Loader2 } from "lucide-react"

export default function ResetPasswordLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
      <p className="mt-4 text-gray-600">Cargando...</p>
    </div>
  )
}
