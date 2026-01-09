'use client';

import React from 'react';

/**
 * IQ Icon Options Demo Page
 * Visit /iq-icons-demo to preview all icon options for the hero badge
 */

import Image from 'next/image';

// The NEW IQ Brain Icon - Human head with house inside (Real Estate on the Brain)
function IQBrainIcon({ mode = 'dark', size = 20 }: { mode?: 'dark' | 'light'; size?: number }) {
  return (
    <Image 
      src={mode === 'dark' ? '/images/iq-brain-dark.png' : '/images/iq-brain-light.png'}
      alt="IQ - Real Estate on the Brain"
      width={size}
      height={size}
    />
  );
}


export default function IQIconsDemoPage() {
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
          🧠🏠 IQ Brain Icon - Selected
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '48px', fontSize: '1.1rem' }}>
          &quot;Real Estate on the Brain&quot; - The genius investment advisor who thinks properties 24/7
        </p>

        {/* Theme Comparison */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(2, 1fr)', 
          gap: '24px',
          marginBottom: '60px'
        }}>
          {/* Dark Mode */}
          <div style={{
            padding: '40px',
            background: '#0a0a12',
            borderRadius: '24px',
            border: '1px solid rgba(77,208,225,0.2)',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#4dd0e1', 
              fontWeight: 600,
              letterSpacing: '2px',
              marginBottom: '24px'
            }}>
              DARK MODE
            </div>

            {/* Large Icon Preview */}
            <div style={{ marginBottom: '24px' }}>
              <IQBrainIcon mode="dark" size={80} />
            </div>

            {/* Badge Preview */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              background: 'rgba(77, 208, 225, 0.1)',
              border: '1px solid rgba(77, 208, 225, 0.25)',
              borderRadius: '100px',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#4dd0e1'
            }}>
              <IQBrainIcon mode="dark" size={22} />
              Powered by IQ
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#6b7280' }}>
              Color: #4dd0e1 (Electric Cyan)
            </div>
          </div>

          {/* Light Mode */}
          <div style={{
            padding: '40px',
            background: '#f7f8fa',
            borderRadius: '24px',
            border: '1px solid rgba(25,118,210,0.2)',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#1976d2', 
              fontWeight: 600,
              letterSpacing: '2px',
              marginBottom: '24px'
            }}>
              LIGHT MODE
            </div>

            {/* Large Icon Preview */}
            <div style={{ marginBottom: '24px' }}>
              <IQBrainIcon mode="light" size={80} />
            </div>

            {/* Badge Preview */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 20px',
              background: 'rgba(25, 118, 210, 0.1)',
              border: '1px solid rgba(25, 118, 210, 0.25)',
              borderRadius: '100px',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#1976d2'
            }}>
              <IQBrainIcon mode="light" size={22} />
              Powered by IQ
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.85rem', color: '#6b7280' }}>
              Color: #1976d2 (Blue)
            </div>
          </div>
        </div>

        {/* Hero Context Preview - Dark Mode */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>
            Hero Preview — Dark Mode
          </h2>
          
          <div style={{
            background: 'linear-gradient(180deg, rgba(77, 208, 225, 0.08) 0%, #0a0a12 50%)',
            borderRadius: '24px',
            padding: '48px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              background: 'rgba(77, 208, 225, 0.1)',
              border: '1px solid rgba(77, 208, 225, 0.25)',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#4dd0e1',
              marginBottom: '24px'
            }}>
              <IQBrainIcon mode="dark" size={20} />
              Powered by IQ — Your Genius Advisor
            </div>

            <h1 style={{ 
              fontSize: 'clamp(2rem, 4vw, 3rem)', 
              fontWeight: 800, 
              lineHeight: 1.1,
              marginBottom: '16px',
              letterSpacing: '-1px',
              color: 'white'
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

        {/* Hero Context Preview - Light Mode */}
        <div style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px' }}>
            Hero Preview — Light Mode
          </h2>
          
          <div style={{
            background: 'linear-gradient(180deg, rgba(25, 118, 210, 0.05) 0%, #f7f8fa 50%)',
            borderRadius: '24px',
            padding: '48px',
            border: '1px solid rgba(0,0,0,0.08)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 18px',
              background: 'rgba(25, 118, 210, 0.08)',
              border: '1px solid rgba(25, 118, 210, 0.2)',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#1976d2',
              marginBottom: '24px'
            }}>
              <IQBrainIcon mode="light" size={20} />
              Powered by IQ — Your Genius Advisor
            </div>

            <h1 style={{ 
              fontSize: 'clamp(2rem, 4vw, 3rem)', 
              fontWeight: 800, 
              lineHeight: 1.1,
              marginBottom: '16px',
              letterSpacing: '-1px',
              color: '#07172e'
            }}>
              Know the{' '}
              <span style={{
                background: 'linear-gradient(135deg, #007ea7 0%, #1976d2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Real Return
              </span>
              <br />Before You Invest
            </h1>

            <p style={{ fontSize: '1.1rem', color: '#6b7280', maxWidth: '500px' }}>
              Meet IQ — your genius real estate advisor. Point & Scan any property and IQ instantly analyzes it across 6 investment strategies in 60 seconds.
            </p>
          </div>
        </div>

        {/* Icon Sizes */}
        <div style={{ 
          padding: '32px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '40px'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>
            Icon Size Variations
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '32px', flexWrap: 'wrap' }}>
            {[16, 20, 24, 32, 48, 64, 80].map((s) => (
              <div key={s} style={{ textAlign: 'center' }}>
                <IQBrainIcon mode="dark" size={s} />
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '8px' }}>{s}px</div>
              </div>
            ))}
          </div>
        </div>

        {/* Meaning */}
        <div style={{ 
          padding: '32px',
          background: 'rgba(77, 208, 225, 0.08)',
          borderRadius: '20px',
          border: '1px solid rgba(77, 208, 225, 0.2)'
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4dd0e1', marginBottom: '12px' }}>
            🧠 Icon Meaning
          </h3>
          <p style={{ color: '#9ca3af', lineHeight: 1.8 }}>
            <strong style={{ color: 'white' }}>&quot;Real Estate on the Brain&quot;</strong> — IQ is a brainy-act who thinks about properties 24/7. The icon depicts:
          </p>
          <ul style={{ color: '#9ca3af', marginTop: '12px', paddingLeft: '20px', lineHeight: 2 }}>
            <li><strong style={{ color: 'white' }}>Human Head Profile:</strong> Represents IQ as an intelligent advisor</li>
            <li><strong style={{ color: 'white' }}>House Inside Brain:</strong> Real estate is always on IQ&apos;s mind</li>
            <li><strong style={{ color: 'white' }}>Clean Line Style:</strong> Professional, modern, instantly recognizable</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
