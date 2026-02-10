'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Eye, Camera, Home } from 'lucide-react'
import { formatNumber } from './utils'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

interface ImageGalleryProps {
  images: string[]
  totalPhotos: number
  views?: number
}

/**
 * ImageGallery Component
 * 
 * Full-width responsive image gallery with navigation, thumbnails,
 * and photo/view counters. Active thumbnail uses sky blue ring.
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
      <div
        className="relative rounded-[14px] overflow-hidden"
        style={{ height: '400px', backgroundColor: colors.background.cardUp }}
      >
        {images[currentIndex] && !imageError[currentIndex] ? (
          <img
            src={images[currentIndex]}
            alt={`Property photo ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={() => handleImageError(currentIndex)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home size={48} style={{ color: colors.text.tertiary }} />
          </div>
        )}
        
        {/* Top Bar - Views & Photo Counter */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {views !== undefined && (
            <div
              className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2"
              style={{ backgroundColor: 'rgba(12,18,32,0.85)' }}
            >
              <Eye size={14} style={{ color: colors.text.secondary }} />
              <span className="text-sm font-medium" style={{ color: colors.text.body, fontVariantNumeric: 'tabular-nums' }}>
                {formatNumber(views)} views
              </span>
            </div>
          )}
          <div
            className="px-3 py-1.5 rounded-lg backdrop-blur-md flex items-center gap-2 ml-auto"
            style={{ backgroundColor: 'rgba(12,18,32,0.85)' }}
          >
            <Camera size={14} style={{ color: colors.text.secondary }} />
            <span className="text-sm font-medium" style={{ color: colors.text.body, fontVariantNumeric: 'tabular-nums' }}>
              {currentIndex + 1}/{totalPhotos}
            </span>
          </div>
        </div>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ backgroundColor: 'rgba(12,18,32,0.85)' }}
              aria-label="Previous image"
            >
              <ChevronLeft size={20} style={{ color: colors.text.primary }} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ backgroundColor: 'rgba(12,18,32,0.85)' }}
              aria-label="Next image"
            >
              <ChevronRight size={20} style={{ color: colors.text.primary }} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all"
            style={{
              backgroundColor: colors.background.cardUp,
              borderColor: i === currentIndex ? colors.brand.blue : 'transparent',
              boxShadow: i === currentIndex ? `0 0 0 2px ${colors.accentBg.blue}` : 'none',
            }}
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
                <Home size={16} style={{ color: colors.text.tertiary }} />
              </div>
            )}
          </button>
        ))}
        {totalPhotos > images.length && (
          <button
            className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-sm font-semibold border-2 border-transparent transition-colors hover:bg-white/5"
            style={{ backgroundColor: colors.background.cardUp, color: colors.text.secondary }}
          >
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
      <div
        className="relative rounded-[14px] overflow-hidden animate-pulse"
        style={{ height: '400px', backgroundColor: colors.background.cardUp }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Home size={48} style={{ color: colors.text.tertiary }} />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div 
            key={i} 
            className="flex-shrink-0 w-16 h-16 rounded-lg animate-pulse"
            style={{ backgroundColor: colors.background.cardUp }}
          />
        ))}
      </div>
    </div>
  )
}
