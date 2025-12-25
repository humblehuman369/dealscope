'use client';

import React from 'react';
import { X, MapPin, ArrowRight, Home, Clock, Target, CheckCircle } from 'lucide-react';
import { ScanResult } from '@/hooks/usePropertyScan';

interface ScanResultSheetProps {
  result: ScanResult;
  onClose: () => void;
  onViewDetails: () => void;
}

/**
 * Bottom sheet displaying property confirmation after scan.
 */
export function ScanResultSheet({ result, onClose, onViewDetails }: ScanResultSheetProps) {
  const { property, confidence, scanTime, heading, distance } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl animate-slide-up">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Success indicator */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Property Found!</h3>
              <p className="text-sm text-gray-500">{confidence}% confidence match</p>
            </div>
          </div>

          {/* Property details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-500 flex items-center justify-center flex-shrink-0">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate">
                  {property.address}
                </h4>
                <p className="text-sm text-gray-500">
                  {property.city}, {property.state} {property.zip}
                </p>
                {(property.bedrooms || property.bathrooms || property.sqft) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {property.bedrooms && `${property.bedrooms} bd`}
                    {property.bathrooms && ` · ${property.bathrooms} ba`}
                    {property.sqft && ` · ${property.sqft.toLocaleString()} sqft`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scan metadata */}
          <div className="flex items-center justify-between text-xs text-gray-400 mb-6">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{distance}m away</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              <span>{heading}° heading</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{(scanTime / 1000).toFixed(1)}s</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Scan Another
            </button>
            <button
              onClick={onViewDetails}
              className="flex-1 py-3 px-4 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors flex items-center justify-center gap-2"
            >
              View Analytics
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

