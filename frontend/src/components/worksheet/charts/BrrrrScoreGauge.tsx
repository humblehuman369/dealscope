'use client'

interface BrrrrScoreGaugeProps {
  score: number
}

export function BrrrrScoreGauge({ score }: BrrrrScoreGaugeProps) {
  const clampedScore = Math.max(0, Math.min(100, score))
  
  // Calculate arc path for score
  const getArcPath = (percentage: number) => {
    const startAngle = 180
    const endAngle = 180 + (percentage / 100) * 180
    const x1 = 70 + 55 * Math.cos((startAngle * Math.PI) / 180)
    const y1 = 70 + 55 * Math.sin((startAngle * Math.PI) / 180)
    const x2 = 70 + 55 * Math.cos((endAngle * Math.PI) / 180)
    const y2 = 70 + 55 * Math.sin((endAngle * Math.PI) / 180)
    const largeArc = percentage > 50 ? 1 : 0
    return `M ${x1} ${y1} A 55 55 0 ${largeArc} 1 ${x2} ${y2}`
  }
  
  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent BRRRR Deal'
    if (score >= 70) return 'Good BRRRR Deal'
    if (score >= 55) return 'Fair BRRRR Deal'
    return 'Risky Deal'
  }
  
  return (
    <div className="brrrr-score-content">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Background arc */}
        <path 
          d="M 15 70 A 55 55 0 0 1 125 70" 
          fill="none" 
          stroke="#e2e8f0" 
          strokeWidth="12" 
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path 
          d={getArcPath(clampedScore)}
          fill="none" 
          stroke="url(#brrrrGauge)" 
          strokeWidth="12" 
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="brrrrGauge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed"/>
            <stop offset="100%" stopColor="#a78bfa"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="brrrr-score-value">{Math.round(clampedScore)}</div>
      <div className="brrrr-score-label">{getScoreLabel(clampedScore)}</div>
    </div>
  )
}
