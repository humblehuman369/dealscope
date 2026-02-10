'use client'

import { School, BookOpen, GraduationCap, ExternalLink } from 'lucide-react'
import { SchoolInfo } from './types'
import { colors } from '@/components/iq-verdict/verdict-design-tokens'

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
  if (rating >= 8) return { bg: colors.accentBg.green, color: colors.status.positive }
  if (rating >= 5) return { bg: colors.accentBg.gold, color: colors.brand.gold }
  return { bg: colors.accentBg.red, color: colors.status.negative }
}

/**
 * NearbySchools Component
 * 
 * Displays nearby schools with ratings, grades, and distances.
 * Rating badges use semantic colors: green (good), gold (average), red (poor).
 */
export function NearbySchools({ schools }: NearbySchoolsProps) {
  const cardStyle = {
    backgroundColor: colors.background.card,
    border: `1px solid ${colors.ui.border}`,
    boxShadow: colors.shadow.card,
  }

  if (!schools || schools.length === 0) {
    return (
      <div className="rounded-[14px] p-5" style={cardStyle}>
        <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
          Nearby Schools
        </div>
        <p className="text-sm text-center py-4" style={{ color: colors.text.tertiary }}>
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

  return (
    <div className="rounded-[14px] p-5" style={cardStyle}>
      <div className="text-xs font-bold uppercase tracking-[0.12em] mb-4" style={{ color: colors.brand.blue }}>
        Nearby Schools
      </div>

      <div className="space-y-3">
        {schools.map((school, i) => {
          const LevelIcon = getLevelIcon(school.level)
          const ratingStyle = getSchoolRatingStyle(school.rating)
          return (
            <div 
              key={i} 
              className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/[0.03]"
              style={{ backgroundColor: colors.background.cardUp, border: `1px solid ${colors.ui.border}` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: colors.background.card }}
              >
                <LevelIcon size={18} style={{ color: colors.text.secondary }} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate" style={{ color: colors.text.primary }}>
                    {school.name}
                  </span>
                  {school.link && (
                    <a 
                      href={school.link} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 transition-colors hover:brightness-125"
                      style={{ color: colors.brand.blue }}
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="text-xs" style={{ color: colors.text.secondary }}>
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

      <p className="mt-3 text-[10px]" style={{ color: colors.text.tertiary }}>
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
      style={{ backgroundColor: colors.background.card, border: `1px solid ${colors.ui.border}` }}
    >
      <div className="h-3 w-24 rounded animate-pulse mb-4" style={{ backgroundColor: colors.background.cardUp }} />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: colors.background.cardUp }}>
            <div className="w-10 h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <div className="flex-1">
              <div className="h-4 w-3/4 rounded animate-pulse mb-1" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
              <div className="h-3 w-1/2 rounded animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="w-8 h-8 rounded-lg animate-pulse" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
