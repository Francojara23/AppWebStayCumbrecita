'use client';

import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface HotelGalleryProps {
  images: string[];
  hotelName: string;
}

export default function HotelGallery({ images, hotelName }: HotelGalleryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const mainImage = images[0];
  const secondaryImages = images.slice(1, 5); // Máximo 4 imágenes secundarias
  const remainingCount = Math.max(0, images.length - 5);

  const openModal = (index: number = 0) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <>
      {/* Galería Principal */}
      <div className="grid grid-cols-4 gap-2 h-96 rounded-lg overflow-hidden">
        {/* Imagen Principal */}
        <div className="col-span-2 relative group cursor-pointer" onClick={() => openModal(0)}>
          <Image
            src={mainImage}
            alt={`${hotelName} - Imagen principal`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>

        {/* Grid de Imágenes Secundarias */}
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {secondaryImages.map((image, index) => {
            const isLast = index === secondaryImages.length - 1;
            const showOverlay = isLast && remainingCount > 0;

            return (
              <div
                key={index}
                className="relative group cursor-pointer"
                onClick={() => openModal(index + 1)}
              >
                <Image
                  src={image}
                  alt={`${hotelName} - Imagen ${index + 2}`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                
                {/* Overlay para mostrar más fotos */}
                {showOverlay && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-semibold text-lg hover:bg-black/80 transition-colors duration-300">
                    <span>+{remainingCount} fotos</span>
                  </div>
                )}
                
                {/* Hover overlay */}
                {!showOverlay && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón Ver todas las fotos */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => openModal(0)}
          className="px-6 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-gray-700 font-medium flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Ver todas las fotos ({images.length})</span>
        </button>
      </div>

      {/* Modal de Galería Completa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* Overlay para cerrar */}
          <div 
            className="absolute inset-0" 
            onClick={closeModal}
          />

          {/* Contenedor de la imagen */}
          <div className="relative max-w-6xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            {/* Imagen actual */}
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={images[currentImageIndex]}
                alt={`${hotelName} - Imagen ${currentImageIndex + 1}`}
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Botón cerrar */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navegación anterior */}
            {images.length > 1 && (
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors duration-200"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Navegación siguiente */}
            {images.length > 1 && (
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors duration-200"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Contador de imágenes */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
              {currentImageIndex + 1} / {images.length}
            </div>

            {/* Thumbnails */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 flex space-x-2 max-w-full overflow-x-auto px-4">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`relative w-16 h-12 rounded overflow-hidden border-2 transition-colors duration-200 flex-shrink-0 ${
                    index === currentImageIndex 
                      ? 'border-white' 
                      : 'border-transparent hover:border-white/50'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 