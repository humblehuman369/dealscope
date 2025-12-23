'use client'

import { usePropertyStore } from '@/stores'
import { MapPin, Home, X, Bell, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function formatCurrency(value: number | null): string {
  if (value === null) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function Header() {
  const pathname = usePathname()
  const { currentProperty, clearCurrentProperty } = usePropertyStore()

  const isPropertyPage = pathname?.startsWith('/property')

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Left side - Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <span className="text-lg font-semibold text-gray-900">InvestIQ</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-5">
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors ${
                  pathname === '/' ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search
              </Link>
              <Link 
                href="/property" 
                className={`text-sm font-medium transition-colors ${
                  pathname?.startsWith('/property') ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/photos" 
                className={`text-sm font-medium transition-colors ${
                  pathname === '/photos' ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Photos
              </Link>
            </nav>
          </div>

          {/* Center - Current Property (when selected) */}
          {currentProperty && (
            <div className="hidden lg:flex items-center gap-3 px-4 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Home className="w-4 h-4 text-teal-600" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 max-w-[200px] truncate">
                      {currentProperty.address}
                    </span>
                    <span className="text-xs text-gray-500">
                      {currentProperty.city}, {currentProperty.state} {currentProperty.zipCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {currentProperty.bedrooms && (
                      <span>{currentProperty.bedrooms} bed</span>
                    )}
                    {currentProperty.bathrooms && (
                      <span>{currentProperty.bathrooms} bath</span>
                    )}
                    {currentProperty.squareFootage && (
                      <span>{currentProperty.squareFootage.toLocaleString()} sqft</span>
                    )}
                    {currentProperty.estimatedValue && (
                      <span className="text-teal-600 font-medium">
                        Est. {formatCurrency(currentProperty.estimatedValue)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={clearCurrentProperty}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Clear property"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}

          {/* Compact property display for medium screens */}
          {currentProperty && (
            <div className="hidden md:flex lg:hidden items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <MapPin className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
                {currentProperty.address}
              </span>
              <button
                onClick={clearCurrentProperty}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Clear property"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2 ml-2">
              <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Sign In
              </button>
              <button className="px-3 py-1.5 text-xs font-medium text-white bg-teal-600 rounded-md hover:bg-teal-700 transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile property bar (shown below main header when property is selected) */}
      {currentProperty && (
        <div className="md:hidden border-t border-gray-100 px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Home className="w-4 h-4 text-teal-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentProperty.address}
                </p>
                <p className="text-xs text-gray-500">
                  {currentProperty.bedrooms} bed · {currentProperty.bathrooms} bath · {formatCurrency(currentProperty.estimatedValue)}
                </p>
              </div>
            </div>
            <button
              onClick={clearCurrentProperty}
              className="p-1.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

