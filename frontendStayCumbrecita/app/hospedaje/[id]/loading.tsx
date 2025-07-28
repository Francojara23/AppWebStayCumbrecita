import { Skeleton } from "@/components/ui/skeleton"
import Header from "@/components/shared/header"
import Footer from "@/components/shared/footer"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      {/* Image Carousel Skeleton */}
      <div className="relative h-[400px] md:h-[500px] w-full bg-gray-200"></div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Hotel Details */}
          <div className="flex-1">
            {/* Hotel Header Skeleton */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-6">
              <div>
                <Skeleton className="h-10 w-64 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
              <div className="mt-4 md:mt-0">
                <Skeleton className="h-8 w-32" />
              </div>
            </div>

            {/* Services Skeleton */}
            <div className="mb-8">
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>

            {/* Description Skeleton */}
            <div className="mb-8">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-24 w-full mb-3" />
              <Skeleton className="h-24 w-full mb-3" />
              <Skeleton className="h-24 w-full" />
            </div>

            {/* Tabs Skeleton */}
            <div className="mt-8">
              <Skeleton className="h-12 w-full mb-6" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>

          {/* Right Column - Booking Skeleton */}
          <div className="lg:w-80 xl:w-96">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <Skeleton className="h-8 w-48 mb-4" />
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-12 w-full mb-4" />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
              <Skeleton className="h-32 w-full mb-6" />
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
