'use client';

import React from 'react';

/**
 * IQ Icon Options for Review
 * These are different icon-style representations of IQ for the hero badge
 */

// Option A: Brain with sparkle (Intelligence)
export function IQIconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/>
      {/* Sparkle */}
      <path d="M12 2v1" stroke="#0EA5E9" strokeWidth="2"/>
      <path d="M17 4l-.7.7" stroke="#0EA5E9" strokeWidth="2"/>
      <path d="M7 4l.7.7" stroke="#0EA5E9" strokeWidth="2"/>
    </svg>
  );
}

// Option B: Lightbulb with IQ (Genius idea)
export function IQIconLightbulb() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      {/* IQ spark */}
      <circle cx="12" cy="8" r="2" fill="#0EA5E9" stroke="none"/>
    </svg>
  );
}

// Option C: Robot face (AI advisor) - Friendly
export function IQIconRobot() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3"/>
      <path d="M12 2v4"/>
      <circle cx="12" cy="2" r="1" fill="#0EA5E9"/>
      {/* Eyes */}
      <circle cx="9" cy="13" r="1.5" fill="#0EA5E9"/>
      <circle cx="15" cy="13" r="1.5" fill="#0EA5E9"/>
      {/* Smile */}
      <path d="M9 17h6" stroke="#0EA5E9"/>
    </svg>
  );
}

// Option D: Target/Bullseye (Precision analysis)
export function IQIconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2" fill="#0EA5E9"/>
      {/* Crosshairs */}
      <path d="M12 2v4" stroke="#0EA5E9"/>
      <path d="M12 18v4" stroke="#0EA5E9"/>
      <path d="M2 12h4" stroke="#0EA5E9"/>
      <path d="M18 12h4" stroke="#0EA5E9"/>
    </svg>
  );
}

// Option E: Sparkles/Magic (Instant insights)
export function IQIconSparkles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill="#0EA5E9" fillOpacity="0.2"/>
      <path d="M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z"/>
    </svg>
  );
}

// Option F: Chart with checkmark (Analysis complete)
export function IQIconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-4 4 4 5-5"/>
      {/* Checkmark bubble */}
      <circle cx="19" cy="7" r="4" fill="#0EA5E9" stroke="none"/>
      <path d="M17 7l1 1 2-2" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

// Demo component to show all options
export function IQIconOptionsDemo() {
  const options = [
    { name: 'A: Brain', icon: <IQIconBrain />, desc: 'Intelligence & thinking' },
    { name: 'B: Lightbulb', icon: <IQIconLightbulb />, desc: 'Genius ideas' },
    { name: 'C: Robot', icon: <IQIconRobot />, desc: 'AI advisor (friendly)' },
    { name: 'D: Target', icon: <IQIconTarget />, desc: 'Precision analysis' },
    { name: 'E: Sparkles', icon: <IQIconSparkles />, desc: 'Magic/instant insights' },
    { name: 'F: Chart', icon: <IQIconChart />, desc: 'Analysis complete' },
  ];

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(3, 1fr)', 
      gap: '24px', 
      padding: '40px',
      background: '#0a0a12',
      color: 'white'
    }}>
      {options.map((opt) => (
        <div key={opt.name} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(77,208,225,0.2)'
        }}>
          {/* Badge preview */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: 'rgba(77, 208, 225, 0.1)',
            border: '1px solid rgba(77, 208, 225, 0.2)',
            borderRadius: '100px',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#0EA5E9'
          }}>
            {opt.icon}
            Powered by IQ
          </div>
          <div style={{ fontWeight: 600, marginTop: '8px' }}>{opt.name}</div>
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center' }}>{opt.desc}</div>
        </div>
      ))}
    </div>
  );
}
