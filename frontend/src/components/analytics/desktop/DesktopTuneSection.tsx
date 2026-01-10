'use client'

import React, { useState, useCallback } from 'react'
import { SliderConfig, TuneGroup } from '../types'

/**
 * DesktopTuneSection Component
 * 
 * Enhanced desktop version of the tune section with better spacing,
 * larger touch targets, and improved visual feedback.
 */

interface DesktopTuneSectionProps {
  /** Title for the section */
  title?: string
  /** Array of tune groups with sliders */
  groups: TuneGroup[]
  /** Always-visible slider (usually Purchase Price) */
  primarySlider?: SliderConfig
  /** Callback when any slider value changes */
  onSliderChange?: (sliderId: string, value: number) => void
  /** Initial open state */
  defaultOpen?: boolean
}

export function DesktopTuneSection({
  title = 'Tune the Deal',
  groups,
  primarySlider,
  onSliderChange,
  defaultOpen = false
}: DesktopTuneSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="desktop-tune-section-collapsible">
      {/* Collapsible Header */}
      <div
        className="desktop-tune-section-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="desktop-tune-section-title">
          <span>⚙️</span>
          {title}
        </div>
        <div className="desktop-tune-expand-hint">
          <span className="desktop-expand-text">
            {isOpen ? 'Collapse' : 'Tap to adjust'}
          </span>
          <div className={`desktop-tune-section-toggle ${isOpen ? 'open' : ''}`}>
            ▼
          </div>
        </div>
      </div>

      {/* Collapsible Body */}
      <div className={`desktop-tune-section-body ${isOpen ? 'open' : ''}`}>
        {/* Primary Slider */}
        {primarySlider && (
          <DesktopSliderRow 
            slider={primarySlider} 
            onChange={onSliderChange}
          />
        )}

        {/* Nested Groups */}
        {groups.map((group) => (
          <DesktopTuneGroup 
            key={group.id} 
            group={group}
            onSliderChange={onSliderChange}
          />
        ))}
      </div>
    </div>
  )
}

interface DesktopTuneGroupProps {
  group: TuneGroup
  onSliderChange?: (sliderId: string, value: number) => void
}

function DesktopTuneGroup({ group, onSliderChange }: DesktopTuneGroupProps) {
  const [isOpen, setIsOpen] = useState(group.isOpen ?? false)

  return (
    <div className="desktop-tune-group">
      {/* Group Header */}
      <div
        className="desktop-tune-group-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="desktop-tune-group-title">{group.title}</span>
        <span className={`desktop-tune-group-toggle ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </div>

      {/* Group Body */}
      <div className={`desktop-tune-group-body ${isOpen ? 'open' : ''}`}>
        {group.sliders.map((slider) => (
          <DesktopSliderRow 
            key={slider.id} 
            slider={slider}
            onChange={onSliderChange}
          />
        ))}
      </div>
    </div>
  )
}

interface DesktopSliderRowProps {
  slider: SliderConfig
  onChange?: (sliderId: string, value: number) => void
}

function DesktopSliderRow({ slider, onChange }: DesktopSliderRowProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange?.(slider.id, newValue)
  }, [slider.id, onChange])

  return (
    <div className="desktop-slider-row">
      {/* Header with label and value */}
      <div className="desktop-slider-header">
        <span className="desktop-slider-label">{slider.label}</span>
        <span>
          <span className="desktop-slider-value">{slider.formattedValue}</span>
          {slider.suffix && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginLeft: '6px' }}>
              {slider.suffix}
            </span>
          )}
          {slider.changeIndicator && (
            <span className={`desktop-slider-change ${slider.changeIndicator.isPositive ? 'positive' : 'negative'}`}>
              {slider.changeIndicator.value}
            </span>
          )}
        </span>
      </div>

      {/* Slider Track */}
      <div className="desktop-slider-track">
        <div 
          className="desktop-slider-fill" 
          style={{ width: `${slider.fillPercent}%` }}
        />
        <div 
          className="desktop-slider-thumb" 
          style={{ left: `${slider.fillPercent}%` }}
        />
        {/* Hidden range input */}
        <input
          type="range"
          min={slider.min}
          max={slider.max}
          step={slider.step}
          value={slider.value}
          onChange={handleChange}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  )
}

export default DesktopTuneSection
