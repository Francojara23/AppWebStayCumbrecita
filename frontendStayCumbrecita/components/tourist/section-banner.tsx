import Image from "next/image"

interface SectionBannerProps {
  imageSrc: string
  imageAlt: string
  title: string
  description: string
}

export function SectionBanner({ imageSrc, imageAlt, title, description }: SectionBannerProps) {
  return (
    <div className="relative h-64 rounded-xl overflow-hidden mb-8">
      <Image src={imageSrc || "/placeholder.svg"} alt={imageAlt} fill className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{title}</h1>
        <p className="text-white/90 max-w-lg">{description}</p>
      </div>
    </div>
  )
}
