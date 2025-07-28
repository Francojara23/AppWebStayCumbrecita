import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import Header from "@/components/shared/header"
import Footer from "@/components/shared/footer"

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="flex flex-col min-h-screen">
        {/* Header */}
        <Header />

        {/* Main content */}
        <main className="flex-1">
          {/* Hero banner */}
          <div
            className="bg-cover bg-center py-8 md:py-12 px-4 text-white text-center"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('/locations/cumbrecita-18.jpg')",
              backgroundSize: "cover",
            }}
          >
            <div className="container mx-auto">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Estás a punto de completar tu reserva</h1>
              <p className="text-sm md:text-base">En pocos pasos, podrás reservar tu estadía en el hospedaje</p>
            </div>
          </div>

          {/* Page content */}
          <div className="container mx-auto py-6 px-4 md:px-6">{children}</div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
      <Toaster position="top-right" />
    </ThemeProvider>
  )
}
