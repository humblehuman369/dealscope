'use client';

import React from 'react';
import { X, MapPin, ArrowRight, Home, Clock, Target, CheckCircle, Map } from 'lucide-react';
import { ScanResult } from '@/hooks/usePropertyScan';

interface ScanResultSheetProps {
  result: ScanResult;
  onClose: () => void;
  onViewDetails: () => void;
  onPickFromMap?: () => void;
}

/**
 * Bottom sheet displaying property confirmation after scan,
 * with a fallback link to open the map picker.
 */
export function ScanResultSheet({
  result,
  onClose,
  onViewDetails,
  onPickFromMap,
}: ScanResultSheetProps) {
  const { property, confidence, scanTime, heading, distance } = result;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--surface-base)]/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl shadow-2xl animate-slide-up"
        style={{
          background: 'var(--surface-card)',
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-12 h-1 rounded-full"
            style={{ background: 'var(--border-default)' }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ background: 'var(--surface-elevated)' }}
          aria-label="Close"
        >
          <X className="w-4 h-4" style={{ color: 'var(--text-label)' }} />
        </button>

        {/* Content */}
        <div className="px-6 pb-8">
          {/* Success indicator */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(20, 184, 166, 0.15)' }}
            >
              <CheckCircle className="w-6 h-6" style={{ color: '#14B8A6' }} />
            </div>
            <div>
              <h3
                className="text-lg font-bold"
                style={{ color: 'var(--text-heading)' }}
              >
                Property Found!
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {confidence}% confidence match
              </p>
            </div>
          </div>

          {/* Property details */}
          <div
            className="rounded-xl p-4 mb-4"
            style={{ background: 'var(--surface-elevated)' }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#14B8A6' }}>
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4
                  className="font-semibold truncate"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {property.address}
                </h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {property.city}, {property.state} {property.zip}
                </p>
              </div>
            </div>
          </div>

          {/* Scan metadata */}
          <div
            className="flex items-center justify-between text-xs mb-4"
            style={{ color: 'var(--text-label)' }}
          >
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

          {/* Confirmation prompt */}
          <p
            className="text-center text-sm font-medium mb-3"
            style={{ color: 'var(--text-body)' }}
          >
            Is this your property?
          </p>

          {/* Primary CTA */}
          <button
            onClick={onViewDetails}
            className="w-full py-3.5 px-4 rounded-xl text-white font-semibold transition-colors flex items-center justify-center gap-2 mb-3"
            style={{ background: '#14B8A6' }}
          >
            Analyze This Property
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium transition-colors"
              style={{
                border: '1px solid var(--border-default)',
                color: 'var(--text-body)',
                background: 'var(--surface-card)',
              }}
            >
              Scan Another
            </button>
            {onPickFromMap && (
              <button
                onClick={onPickFromMap}
                className="flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                style={{
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-body)',
                  background: 'var(--surface-card)',
                }}
              >
                <Map className="w-4 h-4" />
                Search Map
              </button>
            )}
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
