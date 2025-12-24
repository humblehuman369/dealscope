'use client'

import { useState, useEffect } from 'react'
import { usePropertyStore } from '@/stores'
import { 
  Search, Image as ImageIcon, Download, Grid3X3, 
  LayoutGrid, X, ChevronLeft, ChevronRight, Loader2,
  ExternalLink, AlertCircle, Camera
} from 'lucide-react'

interface Photo {
  url: string
  caption?: string
  width?: number
  height?: number
}

interface PhotosResponse {
  success: boolean
  zpid?: string
  url?: string
  photos: Photo[]
  total_count: number
  fetched_at: string
  error?: string
  is_mock?: boolean
}

export default function PhotosPage() {
  const { currentProperty } = usePropertyStore()
  
  const [zpid, setZpid] = useState('')
  const [propertyUrl, setPropertyUrl] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid')
  const [isMock, setIsMock] = useState(false)
  const [autoFetched, setAutoFetched] = useState(false)

  // Auto-populate ZPID from current property
  useEffect(() => {
    if (currentProperty?.zpid && !zpid) {
      setZpid(currentProperty.zpid)
    }
  }, [currentProperty, zpid])

  // Auto-fetch photos when we have a ZPID from current property
  useEffect(() => {
    if (currentProperty?.zpid && !autoFetched && photos.length === 0 && !isLoading) {
      setAutoFetched(true)
      fetchPhotosWithZpid(currentProperty.zpid)
    }
  }, [currentProperty?.zpid, autoFetched, photos.length, isLoading])

  const fetchPhotosWithZpid = async (zpidToFetch: string) => {
    setIsLoading(true)
    setError(null)
    setPhotos([])
    setIsMock(false)

    try {
      const params = new URLSearchParams()
      params.append('zpid', zpidToFetch)

      const response = await fetch(`/api/v1/photos?${params.toString()}`)
      const data: PhotosResponse = await response.json()

      if (data.success) {
        setPhotos(data.photos || [])
        setIsMock(data.is_mock || false)
        if (data.photos.length === 0) {
          setError('No photos found for this property')
        }
      } else {
        setError(data.error || 'Failed to fetch photos')
      }
    } catch (err) {
      setError('Failed to fetch photos. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPhotos = async () => {
    if (!zpid && !propertyUrl) {
      setError('Please enter either a Zillow Property ID (ZPID) or a Zillow URL')
      return
    }

    setIsLoading(true)
    setError(null)
    setPhotos([])
    setIsMock(false)

    try {
      const params = new URLSearchParams()
      if (zpid) params.append('zpid', zpid)
      if (propertyUrl) params.append('url', propertyUrl)

      const response = await fetch(`/api/v1/photos?${params.toString()}`)
      const data: PhotosResponse = await response.json()

      if (data.success) {
        setPhotos(data.photos || [])
        setIsMock(data.is_mock || false)
        if (data.photos.length === 0) {
          setError('No photos found for this property')
        }
      } else {
        setError(data.error || 'Failed to fetch photos')
      }
    } catch (err) {
      setError('Failed to fetch photos. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setAutoFetched(true) // Prevent auto-fetch from running again
    fetchPhotos()
  }

  const openLightbox = (index: number) => {
    setSelectedPhoto(index)
  }

  const closeLightbox = () => {
    setSelectedPhoto(null)
  }

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (selectedPhoto === null) return
    
    if (direction === 'prev') {
      setSelectedPhoto(selectedPhoto === 0 ? photos.length - 1 : selectedPhoto - 1)
    } else {
      setSelectedPhoto(selectedPhoto === photos.length - 1 ? 0 : selectedPhoto + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* No Property Selected - Show Manual Input */}
        {(!currentProperty || !currentProperty.zpid) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Manual Photo Lookup</h2>
              <p className="text-sm text-gray-500">
                No property selected. Search for a property on the Dashboard first, or enter a ZPID/URL below.
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="zpid" className="block text-sm font-medium text-gray-700 mb-1">
                    Zillow Property ID (ZPID)
                  </label>
                  <input
                    type="text"
                    id="zpid"
                    value={zpid}
                    onChange={(e) => setZpid(e.target.value)}
                    placeholder="e.g., 2078546319"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                    Or Zillow Property URL
                  </label>
                  <input
                    type="text"
                    id="url"
                    value={propertyUrl}
                    onChange={(e) => setPropertyUrl(e.target.value)}
                    placeholder="e.g., https://www.zillow.com/homedetails/..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isLoading || (!zpid && !propertyUrl)}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Fetch Photos
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading property photos...</p>
          </div>
        )}

        {/* Error Message */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Mock Data Notice */}
        {isMock && photos.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-amber-700">
              Showing placeholder photos. Connect the backend API to fetch real property photos.
            </p>
          </div>
        )}

        {/* Photos Grid */}
        {photos.length > 0 && !isLoading && (
          <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {photos.length} photo{photos.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('masonry')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'masonry' 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  title="Masonry view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Photos */}
            <div className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {photos.map((photo, index) => (
                <div
                  key={index}
                  className="group relative bg-gray-100 rounded-xl overflow-hidden cursor-pointer aspect-[4/3] hover:shadow-lg transition-shadow"
                  onClick={() => openLightbox(index)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `Property photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23e5e7eb" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">No Image</text></svg>'
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                        <Search className="w-5 h-5 text-gray-700" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Caption */}
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-sm truncate">{photo.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Only show if no current property and not loading */}
        {!isLoading && photos.length === 0 && !error && !currentProperty?.zpid && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Photos Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Search for a property on the Dashboard to automatically load photos, or enter a ZPID above.
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedPhoto !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Navigation */}
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('prev') }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigateLightbox('next') }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Image */}
          <div 
            className="max-w-5xl max-h-[85vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[selectedPhoto].url}
              alt={photos[selectedPhoto].caption || `Property photo ${selectedPhoto + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            
            {/* Photo Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div>
                  {photos[selectedPhoto].caption && (
                    <p className="text-white font-medium">{photos[selectedPhoto].caption}</p>
                  )}
                  <p className="text-white/60 text-sm">
                    {selectedPhoto + 1} of {photos.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={photos[selectedPhoto].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </a>
                  <a
                    href={photos[selectedPhoto].url}
                    download
                    className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
