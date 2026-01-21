'use client'

import { School, BookOpen, GraduationCap, ExternalLink } from 'lucide-react'
import { SchoolInfo } from './types'
import { getRatingColor } from './utils'

interface NearbySchoolsProps {
  schools: SchoolInfo[]
}

/**
 * NearbySchools Component
 * 
 * Displays nearby schools with ratings, grades, and distances.
 */
export function NearbySchools({ schools }: NearbySchoolsProps) {
  if (!schools || schools.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
        <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
          Nearby Schools
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide mb-4">
        Nearby Schools
      </div>

      <div className="space-y-3">
        {schools.map((school, i) => {
          const LevelIcon = getLevelIcon(school.level)
          return (
            <div 
              key={i} 
              className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center flex-shrink-0">
                <LevelIcon size={18} className="text-slate-500 dark:text-slate-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {school.name}
                  </span>
                  {school.link && (
                    <a 
                      href={school.link} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-500 hover:text-teal-600 dark:hover:text-teal-400 flex-shrink-0"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {school.type} · Grades {school.grades} · {school.distance} mi
                </div>
              </div>

              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${getRatingColor(school.rating)}`}>
                {school.rating}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
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
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-5">
      <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1" />
              <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
