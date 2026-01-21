'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Camera, Home } from 'lucide-react'
import { formatNumber } from './utils'

interface ImageGalleryProps {
  images: string[]
  totalPhotos: number
  views?: number
}

/**
 * ImageGallery Component
 * 
 * Full-width responsive image gallery with navigation,
 * thumbnails, and photo/view counters.
 */
export function ImageGallery({ images, totalPhotos, views }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState<Record<number, boolean>>({})

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length)
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)

  const handleImageError = (index: number) => {
    setImageError(prev => ({ ...prev, [index]: true }))
  }

  return (
    <div className="space-y-3">
      {/* Main Image Container */}
      <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800" style={{ height: '400px' }}>
        {images[currentIndex] && !imageError[currentIndex] ? (
          <img
            src={images[currentIndex]}
            alt={`Property photo ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={() => handleImageError(currentIndex)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home size={48} className="text-slate-400" />
          </div>
        )}
        
        {/* Top Bar - Views & Photo Counter */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {views !== undefined && (
            <div className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center gap-2 shadow-sm">
              <Eye size={14} className="text-slate-600 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{formatNumber(views)} views</span>
            </div>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center gap-2 shadow-sm ml-auto">
            <Camera size={14} className="text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{currentIndex + 1}/{totalPhotos}</span>
          </div>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft size={20} className="text-slate-700 dark:text-slate-300" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 shadow-lg flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 transition-colors"
              aria-label="Next image"
            >
              <ChevronRight size={20} className="text-slate-700 dark:text-slate-300" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all bg-slate-100 dark:bg-slate-800 ${
              i === currentIndex 
                ? 'border-teal-500 ring-2 ring-teal-500/20' 
                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {img && !imageError[i] ? (
              <img 
                src={img} 
                alt={`Thumbnail ${i + 1}`} 
                className="w-full h-full object-cover"
                onError={() => handleImageError(i)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home size={16} className="text-slate-400" />
              </div>
            )}
          </button>
        ))}
        {totalPhotos > images.length && (
          <button className="flex-shrink-0 w-16 h-16 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border-2 border-transparent">
            +{totalPhotos - images.length}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * ImageGallerySkeleton
 * Loading state for the image gallery
 */
export function ImageGallerySkeleton() {
  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-800 animate-pulse" style={{ height: '400px' }}>
        <div className="w-full h-full flex items-center justify-center">
          <Home size={48} className="text-slate-300 dark:text-slate-600" />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 w-16 h-16 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}
