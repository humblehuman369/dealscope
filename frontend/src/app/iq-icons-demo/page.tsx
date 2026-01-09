'use client';

import React from 'react';
import Image from 'next/image';

/**
 * IQ Icon Options Demo Page
 * Visit /iq-icons-demo to preview all icon options for the hero badge
 */

// Option A: Brain with sparkle (Intelligence)
function IQIconBrain() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04Z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04Z"/>
      <path d="M12 2v1" stroke="#4dd0e1" strokeWidth="2"/>
      <path d="M17 4l-.7.7" stroke="#4dd0e1" strokeWidth="2"/>
      <path d="M7 4l.7.7" stroke="#4dd0e1" strokeWidth="2"/>
    </svg>
  );
}

// Option B: Lightbulb with glow (Genius idea)
function IQIconLightbulb() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      <circle cx="12" cy="8" r="2" fill="#4dd0e1" stroke="none"/>
    </svg>
  );
}

// Option C: Friendly Robot face (AI advisor)
function IQIconRobot() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="12" rx="3"/>
      <path d="M12 2v4"/>
      <circle cx="12" cy="2" r="1" fill="#4dd0e1"/>
      <circle cx="9" cy="13" r="1.5" fill="#4dd0e1"/>
      <circle cx="15" cy="13" r="1.5" fill="#4dd0e1"/>
      <path d="M9 17h6" stroke="#4dd0e1"/>
    </svg>
  );
}

// Option D: Target/Bullseye (Precision)
function IQIconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2" fill="#4dd0e1"/>
      <path d="M12 2v4" stroke="#4dd0e1"/>
      <path d="M12 18v4" stroke="#4dd0e1"/>
      <path d="M2 12h4" stroke="#4dd0e1"/>
      <path d="M18 12h4" stroke="#4dd0e1"/>
    </svg>
  );
}

// Option E: Sparkles/Magic (Instant)
function IQIconSparkles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4dd0e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill="#4dd0e1" fillOpacity="0.2"/>
      <path d="M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"/>
      <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z"/>
    </svg>
  );
}

// Option F: Chart with checkmark
function IQIconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/>
      <path d="M7 16l4-4 4 4 5-5"/>
      <circle cx="19" cy="7" r="4" fill="#4dd0e1" stroke="none"/>
      <path d="M17 7l1 1 2-2" stroke="white" strokeWidth="1.5"/>
    </svg>
  );
}

// Option G: IQ Image (actual avatar)
function IQIconAvatar() {
  return (
    <Image 
      src="/images/IQ.png" 
      alt="IQ" 
      width={20} 
      height={20}
      style={{ borderRadius: '50%' }}
    />
  );
}

export default function IQIconsDemoPage() {
  const options = [
    { id: 'A', name: 'Brain', icon: <IQIconBrain />, desc: 'Intelligence & analytical thinking' },
    { id: 'B', name: 'Lightbulb', icon: <IQIconLightbulb />, desc: 'Genius ideas & insights' },
    { id: 'C', name: 'Robot', icon: <IQIconRobot />, desc: 'Friendly AI advisor' },
    { id: 'D', name: 'Target', icon: <IQIconTarget />, desc: 'Precision analysis' },
    { id: 'E', name: 'Sparkles', icon: <IQIconSparkles />, desc: 'Magic / instant insights' },
    { id: 'F', name: 'Chart', icon: <IQIconChart />, desc: 'Analysis verified' },
    { id: 'G', name: 'IQ Avatar', icon: <IQIconAvatar />, desc: 'Actual IQ character (small)' },
  ];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#0a0a12',
      color: 'white',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      padding: '60px 24px'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #4dd0e1 0%, #007ea7 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          IQ Icon Options
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '48px', fontSize: '1.1rem' }}>
          Choose an icon style for the hero badge. Each shows how it would appear in context.
        </p>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px' 
        }}>
          {options.map((opt) => (
            <div key={opt.id} style={{
              padding: '32px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '20px',
              border: '1px solid rgba(77,208,225,0.15)',
              transition: 'all 0.3s ease'
            }}>
              {/* Option Label */}
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#4dd0e1', 
                fontWeight: 600,
                letterSpacing: '2px',
                marginBottom: '16px'
              }}>
                OPTION {opt.id}
              </div>

              {/* Badge Preview */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                background: 'rgba(77, 208, 225, 0.1)',
                border: '1px solid rgba(77, 208, 225, 0.25)',
                borderRadius: '100px',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#4dd0e1',
                marginBottom: '20px'
              }}>
                {opt.icon}
                Powered by IQ
              </div>

              {/* Name & Description */}
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
                {opt.name}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                {opt.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Comparison in Hero Context */}
        <div style={{ marginTop: '80px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '32px' }}>
            Preview in Hero Context
          </h2>
          
          <div style={{
            background: 'linear-gradient(180deg, rgba(77, 208, 225, 0.05) 0%, transparent 50%)',
            borderRadius: '24px',
            padding: '48px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {/* Using Sparkles as example */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'rgba(77, 208, 225, 0.1)',
              border: '1px solid rgba(77, 208, 225, 0.25)',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#4dd0e1',
              marginBottom: '24px'
            }}>
              <IQIconSparkles />
              Powered by IQ — Your Genius Advisor
            </div>

            <h1 style={{ 
              fontSize: 'clamp(2rem, 4vw, 3rem)', 
              fontWeight: 800, 
              lineHeight: 1.1,
              marginBottom: '16px',
              letterSpacing: '-1px'
            }}>
              Know the{' '}
              <span style={{
                background: 'linear-gradient(135deg, #4dd0e1 0%, #007ea7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Real Return
              </span>
              <br />Before You Invest
            </h1>

            <p style={{ fontSize: '1.1rem', color: '#9ca3af', maxWidth: '500px' }}>
              Meet IQ — your genius real estate advisor. Point & Scan any property and IQ instantly analyzes it across 6 investment strategies in 60 seconds.
            </p>
          </div>
        </div>

        {/* My Recommendation */}
        <div style={{ 
          marginTop: '60px', 
          padding: '32px',
          background: 'rgba(77, 208, 225, 0.08)',
          borderRadius: '20px',
          border: '1px solid rgba(77, 208, 225, 0.2)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4dd0e1', marginBottom: '12px' }}>
            💡 My Recommendation
          </h3>
          <p style={{ color: '#9ca3af', lineHeight: 1.7 }}>
            <strong style={{ color: 'white' }}>Option E (Sparkles)</strong> or <strong style={{ color: 'white' }}>Option G (IQ Avatar)</strong> work best:
          </p>
          <ul style={{ color: '#9ca3af', marginTop: '12px', paddingLeft: '20px' }}>
            <li><strong>Sparkles:</strong> Clean icon style, conveys "magic" and instant insights</li>
            <li><strong>IQ Avatar:</strong> Directly introduces the IQ character, consistent with the rest of the site</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
