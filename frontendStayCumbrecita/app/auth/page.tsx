import { redirect } from "next/navigation"

export default function AuthPage() {
  // Redirigir a la página de login de turistas por defecto
  redirect("/auth/login/tourist")
}
