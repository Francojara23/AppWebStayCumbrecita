"use client"

import Header from "@/components/shared/header"
import Hero from "@/components/home/hero"
import FeaturedPropertiesCarousel from "@/components/home/featured-properties-carousel"
import WhyChooseUs from "@/components/home/why-choose-us"
import InfoSection from "@/components/home/info-section"
import Footer from "@/components/shared/footer"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--light)]">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <Hero />

      {/* Featured Properties Carousel */}
      <FeaturedPropertiesCarousel />

      {/* Why Choose Us Section */}
      <WhyChooseUs />

      {/* About La Cumbrecita */}
      <InfoSection />

      {/* Footer */}
      <Footer />
    </div>
  )
}
