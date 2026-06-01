'use client'

import { useState } from 'react'
import { School, BookOpen, GraduationCap, ExternalLink, ChevronDown } from 'lucide-react'
import { SchoolInfo } from './types'

const COLLAPSED_COUNT = 3

interface NearbySchoolsProps {
  schools: SchoolInfo[]
}

/**
 * Get rating badge color using the semantic color system:
 * - 8-10: green (positive) — great schools
 * - 5-7: gold (caution) — average
 * - 1-4: red (negative) — below average
 */
function getSchoolRatingStyle(rating: number): { bg: string; color: string } {
  if (rating >= 8) return { bg: 'var(--color-green-dim)', color: 'var(--status-positive)' }
  if (rating >= 5) return { bg: 'var(--color-gold-dim)', color: 'var(--status-warning)' }
  return { bg: 'var(--color-red-dim)', color: 'var(--status-negative)' }
}

/**
 * NearbySchools Component
 *
 * Displays nearby schools with ratings, grades, and distances.
 * Rating badges use semantic colors: green (good), gold (average), red (poor).
 */
export function NearbySchools({ schools }: NearbySchoolsProps) {
  const [expanded, setExpanded] = useState(false)
  const cardStyle = {
    backgroundColor: 'var(--surface-base)',
    border: `1px solid var(--border-subtle)`,
    boxShadow: 'var(--shadow-card)',
  }

  if (!schools || schools.length === 0) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        <div
          className="text-xs font-bold uppercase tracking-[0.12em] mb-4"
          style={{ color: 'var(--accent-sky)' }}
        >
          Nearby Schools
        </div>
        <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>
          No school information available
        </p>
      </div>
    )
  }

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'elementary':
        return School
      case 'middle':
        return BookOpen
      case 'high':
        return GraduationCap
      default:
        return School
    }
  }

  const canExpand = schools.length > COLLAPSED_COUNT
  const visibleSchools = expanded ? schools : schools.slice(0, COLLAPSED_COUNT)

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      {canExpand ? (
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 mb-4 text-left"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          <span
            className="text-xs font-bold uppercase tracking-[0.12em]"
            style={{ color: 'var(--accent-sky)' }}
          >
            Nearby Schools
          </span>
          <ChevronDown
            size={16}
            className={`flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
            aria-hidden
          />
        </button>
      ) : (
        <div
          className="text-xs font-bold uppercase tracking-[0.12em] mb-4"
          style={{ color: 'var(--accent-sky)' }}
        >
          Nearby Schools
        </div>
      )}

      <div className="space-y-3">
        {visibleSchools.map((school, i) => {
          const LevelIcon = getLevelIcon(school.level)
          const ratingStyle = getSchoolRatingStyle(school.rating)
          return (
            <div
              key={`${school.name}-${i}`}
              className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-[var(--surface-card-hover)]"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                border: `1px solid var(--border-subtle)`,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--surface-elevated)' }}
              >
                <LevelIcon size={18} style={{ color: 'var(--text-secondary)' }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {school.name}
                  </span>
                  {school.link && (
                    <a
                      href={school.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 transition-colors hover:brightness-125"
                      style={{ color: 'var(--accent-sky)' }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {school.type} · Grades {school.grades} · {school.distance} mi
                </div>
              </div>

              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  backgroundColor: ratingStyle.bg,
                  color: ratingStyle.color,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {school.rating}
              </div>
            </div>
          )
        })}
      </div>

      {canExpand && !expanded && (
        <button
          type="button"
          className="mt-3 text-xs font-semibold transition-colors hover:brightness-110"
          style={{ color: 'var(--accent-sky)' }}
          onClick={() => setExpanded(true)}
        >
          Show all {schools.length} schools
        </button>
      )}

      <p className="mt-3 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
        School ratings provided by GreatSchools. Ratings are on a scale of 1-10.
      </p>
    </div>
  )
}

/**
 * NearbySchoolsSkeleton
 * Loading state for nearby schools
 */
export function NearbySchoolsSkeleton() {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{ backgroundColor: 'var(--surface-base)', border: `1px solid var(--border-subtle)` }}
    >
      <div
        className="h-3 w-24 rounded animate-pulse mb-4"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--surface-elevated)' }}
          >
            <div
              className="w-10 h-10 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--surface-card-hover)' }}
            />
            <div className="flex-1">
              <div
                className="h-4 w-3/4 rounded animate-pulse mb-1"
                style={{ backgroundColor: 'var(--surface-card-hover)' }}
              />
              <div
                className="h-3 w-1/2 rounded animate-pulse"
                style={{ backgroundColor: 'var(--surface-card-hover)' }}
              />
            </div>
            <div
              className="w-8 h-8 rounded-lg animate-pulse"
              style={{ backgroundColor: 'var(--surface-card-hover)' }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
