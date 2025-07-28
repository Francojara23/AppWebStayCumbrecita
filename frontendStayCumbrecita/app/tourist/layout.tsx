import type React from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import Header from "@/components/shared/header"
import Footer from "@/components/shared/footer"

export default function TouristLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </ThemeProvider>
  )
}
