/**
 * ProfitZoneDashboard - Three-column profit/loss visualization
 * Combines key metrics, profit zone visualizer, and actionable tips
 * 
 * Layout:
 * [LEFT: Stacked Metrics] [CENTER: Profit Zone Gradient] [RIGHT: Tips & Actions]
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InsightType } from './types';

// ============================================
// TYPES
// ============================================

export interface ProfitZoneMetrics {
  buyPrice: number;
  cashNeeded: number;
  monthlyCashFlow: number;
  cashOnCash: number;
  capRate: number;
  dealScore: number;
}

export interface ProfitZoneTip {
  type: InsightType | 'action';
  icon: string;
  title: string;
  description?: string;
}

export interface ProfitZoneDashboardProps {
  // Left column metrics
  metrics: ProfitZoneMetrics;
  
  // Center column visualizer
  projectedProfit: number;
  breakevenPrice: number;
  listPrice: number;
  
  // Right column tips
  tips: ProfitZoneTip[];
  
  // Styling
  isDark?: boolean;
  compact?: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatCompact = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`;
  }
  return formatCurrency(value);
};

const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

const getDealScoreLabel = (score: number): string => {
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Strong';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Average';
  if (score >= 40) return 'Fair';
  return 'Weak';
};

const getDealScoreColor = (score: number): string => {
  if (score >= 70) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
};

// ============================================
// METRIC BOX COMPONENT
// ============================================

interface MetricBoxProps {
  label: string;
  value: string;
  sublabel: string;
  valueColor?: string;
  isDark?: boolean;
}

function MetricBox({ label, value, sublabel, valueColor = '#22c55e', isDark = true }: MetricBoxProps) {
  return (
    <View style={[
      styles.metricBox,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.1)',
      }
    ]}>
      <Text style={[styles.metricLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(7,23,46,0.5)' }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: valueColor }]}>
        {value}
      </Text>
      <Text style={[styles.metricSublabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(7,23,46,0.4)' }]}>
        {sublabel}
      </Text>
    </View>
  );
}

// ============================================
// PROFIT ZONE VISUALIZER COMPONENT
// ============================================

interface ProfitZoneVisualizerProps {
  projectedProfit: number;
  breakevenPrice: number;
  listPrice: number;
  isDark?: boolean;
}

function ProfitZoneVisualizer({ projectedProfit, breakevenPrice, listPrice, isDark = true }: ProfitZoneVisualizerProps) {
  // Calculate position of the profit indicator (0 = bottom/loss, 100 = top/max profit)
  // The gradient bar height represents the range from 0 to listPrice
  const maxProfit = listPrice * 0.5; // Max profit shown is 50% of list price
  const profitPosition = Math.min(Math.max((projectedProfit / maxProfit) * 100, 5), 95);
  
  // Breakeven position on the scale
  const breakevenPosition = Math.min(Math.max((breakevenPrice / listPrice) * 50, 10), 90);
  
  const isProfit = projectedProfit > 0;
  
  return (
    <View style={styles.visualizerContainer}>
      {/* Header */}
      <Text style={[styles.visualizerHeader, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
        PROJECTED OUTCOME
      </Text>
      
      {/* Profit Zone Badge */}
      <View style={styles.profitZoneBadge}>
        <MaterialCommunityIcons 
          name={isProfit ? "trending-up" : "trending-down"} 
          size={14} 
          color={isProfit ? '#22c55e' : '#ef4444'} 
        />
        <Text style={[styles.profitZoneText, { color: isProfit ? '#22c55e' : '#ef4444' }]}>
          {isProfit ? 'PROFIT ZONE' : 'LOSS ZONE'}
        </Text>
      </View>
      
      {/* Gradient Bar */}
      <View style={styles.gradientWrapper}>
        <LinearGradient
          colors={['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#f0fdf4', '#ffffff']}
          locations={[0, 0.15, 0.3, 0.45, 0.6, 0.8, 1]}
          style={styles.gradientBar}
        >
          {/* Profit Value Badge */}
          <View style={[
            styles.profitBadge,
            { 
              top: `${100 - profitPosition}%`,
              backgroundColor: isProfit ? '#22c55e' : '#ef4444',
            }
          ]}>
            <Text style={styles.profitBadgeText}>
              {formatCompact(projectedProfit)}
            </Text>
          </View>
          
          {/* Breakeven Line */}
          <View style={[styles.breakevenLine, { top: `${100 - breakevenPosition}%` }]}>
            <View style={styles.dashedLine} />
            <Text style={[styles.breakevenText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
              BREAKEVEN {formatCompact(breakevenPrice)}
            </Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================
// TIPS SECTION COMPONENT
// ============================================

interface TipsSectionProps {
  tips: ProfitZoneTip[];
  isDark?: boolean;
}

const TIP_COLORS: Record<string, string> = {
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  tip: '#4dd0e1',
  action: '#3b82f6',
};

function TipsSection({ tips, isDark = true }: TipsSectionProps) {
  return (
    <View style={styles.tipsContainer}>
      <Text style={[styles.tipsHeader, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
        HELPFUL TIPS
      </Text>
      
      <View style={styles.tipsList}>
        {tips.slice(0, 3).map((tip, index) => {
          const color = TIP_COLORS[tip.type] || TIP_COLORS.tip;
          return (
            <View 
              key={index} 
              style={[
                styles.tipItem,
                { 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
                  borderLeftColor: color,
                }
              ]}
            >
              <Text style={styles.tipIcon}>{tip.icon}</Text>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: isDark ? '#fff' : '#07172e' }]}>
                  {tip.title}
                </Text>
                {tip.description && (
                  <Text style={[styles.tipDescription, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(7,23,46,0.6)' }]}>
                    {tip.description}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
      
      {/* What's Next Section */}
      <View style={[
        styles.whatsNextBox,
        { 
          backgroundColor: isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.05)',
          borderColor: isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.15)',
        }
      ]}>
        <Text style={[styles.whatsNextHeader, { color: '#4dd0e1' }]}>
          📋 What's Next
        </Text>
        <Text style={[styles.whatsNextText, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(7,23,46,0.7)' }]}>
          Review the metrics and adjust assumptions to see how they impact your returns.
        </Text>
      </View>
    </View>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ProfitZoneDashboard({
  metrics,
  projectedProfit,
  breakevenPrice,
  listPrice,
  tips,
  isDark = true,
  compact = false,
}: ProfitZoneDashboardProps) {
  const { buyPrice, cashNeeded, monthlyCashFlow, cashOnCash, capRate, dealScore } = metrics;
  const scoreLabel = getDealScoreLabel(dealScore);
  const scoreColor = getDealScoreColor(dealScore);
  
  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }
    ]}>
      {/* Three Column Layout */}
      <View style={styles.columnsWrapper}>
        
        {/* LEFT COLUMN - Metrics Stack */}
        <View style={styles.leftColumn}>
          <MetricBox 
            label="BUY PRICE" 
            value={formatCompact(buyPrice)} 
            sublabel="Target" 
            isDark={isDark}
          />
          <MetricBox 
            label="CASH NEEDED" 
            value={formatCompact(cashNeeded)} 
            sublabel="Negotiated" 
            isDark={isDark}
          />
          <MetricBox 
            label="CASH FLOW" 
            value={formatCompact(monthlyCashFlow)} 
            sublabel="Est. Monthly" 
            valueColor={monthlyCashFlow >= 0 ? '#22c55e' : '#ef4444'}
            isDark={isDark}
          />
          <MetricBox 
            label="CASH ON CASH" 
            value={formatPercent(cashOnCash)} 
            sublabel="Annual" 
            valueColor={cashOnCash >= 8 ? '#22c55e' : cashOnCash >= 5 ? '#f59e0b' : '#ef4444'}
            isDark={isDark}
          />
          <MetricBox 
            label="CAP RATE" 
            value={formatPercent(capRate)} 
            sublabel="Annual" 
            valueColor={capRate >= 6 ? '#22c55e' : capRate >= 4 ? '#f59e0b' : '#ef4444'}
            isDark={isDark}
          />
          <MetricBox 
            label="Deal Score" 
            value={String(Math.round(dealScore))} 
            sublabel={scoreLabel} 
            valueColor={scoreColor}
            isDark={isDark}
          />
        </View>
        
        {/* CENTER COLUMN - Profit Zone Visualizer */}
        <View style={styles.centerColumn}>
          <ProfitZoneVisualizer 
            projectedProfit={projectedProfit}
            breakevenPrice={breakevenPrice}
            listPrice={listPrice}
            isDark={isDark}
          />
        </View>
        
        {/* RIGHT COLUMN - Tips & What's Next */}
        <View style={styles.rightColumn}>
          <TipsSection tips={tips} isDark={isDark} />
        </View>
        
      </View>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  columnsWrapper: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  
  // Left Column - Metrics
  leftColumn: {
    flex: 1,
    gap: 6,
  },
  metricBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricSublabel: {
    fontSize: 9,
    marginTop: 1,
  },
  
  // Center Column - Visualizer
  centerColumn: {
    flex: 1.2,
    alignItems: 'center',
  },
  visualizerContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  visualizerHeader: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  profitZoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  profitZoneText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gradientWrapper: {
    flex: 1,
    width: '70%',
    minHeight: 200,
  },
  gradientBar: {
    flex: 1,
    borderRadius: 12,
    position: 'relative',
    overflow: 'visible',
  },
  profitBadge: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -40 }],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profitBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  breakevenLine: {
    position: 'absolute',
    left: -20,
    right: -60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashedLine: {
    flex: 1,
    height: 2,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.3)',
    backgroundColor: 'transparent',
  },
  breakevenText: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  // Right Column - Tips
  rightColumn: {
    flex: 1.3,
  },
  tipsContainer: {
    flex: 1,
  },
  tipsHeader: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  tipIcon: {
    fontSize: 14,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  tipDescription: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  whatsNextBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  whatsNextHeader: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  whatsNextText: {
    fontSize: 10,
    lineHeight: 14,
  },
});

export default ProfitZoneDashboard;
