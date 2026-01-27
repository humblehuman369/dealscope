/**
 * ProfitQualityCard Component
 * 
 * Displays the profit quality score with a circular gauge and key metrics:
 * - Strategy Fit
 * - Risk Level  
 * - Protection
 * 
 * Also includes expandable factors and insight text.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

// Types
export interface ProfitQualityData {
  score: number; // 0-100
  strategyFit: 'Poor' | 'Fair' | 'Good Fit' | 'Great';
  riskLevel: 'High' | 'Moderate' | 'Low';
  protection: 'Poor' | 'Fair' | 'Good';
  insight: string;
  factors?: ProfitFactor[];
}

export interface ProfitFactor {
  label: string;
  value: string;
  isPositive: boolean;
}

interface ProfitQualityCardProps {
  data: ProfitQualityData;
  isDark?: boolean;
}

// Circular Progress Component
function CircularProgress({ 
  score, 
  size = 100, 
  strokeWidth = 8,
  isDark = false,
}: { 
  score: number; 
  size?: number; 
  strokeWidth?: number;
  isDark?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  // Score color based on value
  const getScoreColor = () => {
    if (score >= 80) return colors.profit.main;
    if (score >= 60) return '#0891B2'; // Teal
    if (score >= 40) return colors.warning.main;
    return colors.loss.main;
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getScoreColor()}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      {/* Score text */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.scoreValue, { color: isDark ? 'white' : '#0A1628' }]}>{score}</Text>
        <Text style={[styles.scoreMax, { color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }]}>/100</Text>
      </View>
    </View>
  );
}

export function ProfitQualityCard({ data, isDark = false }: ProfitQualityCardProps) {
  const [showFactors, setShowFactors] = useState(false);

  // Color for strategy fit
  const getStrategyFitColor = () => {
    switch (data.strategyFit) {
      case 'Great': return colors.profit.main;
      case 'Good Fit': return colors.profit.main;
      case 'Fair': return colors.warning.main;
      case 'Poor': return colors.loss.main;
      default: return isDark ? 'white' : '#0A1628';
    }
  };

  // Color for risk level
  const getRiskLevelColor = () => {
    switch (data.riskLevel) {
      case 'Low': return colors.profit.main;
      case 'Moderate': return colors.warning.main;
      case 'High': return colors.loss.main;
      default: return isDark ? 'white' : '#0A1628';
    }
  };

  // Color for protection
  const getProtectionColor = () => {
    switch (data.protection) {
      case 'Good': return colors.profit.main;
      case 'Fair': return '#0891B2'; // Teal/cyan
      case 'Poor': return colors.loss.main;
      default: return isDark ? 'white' : '#0A1628';
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? '#0F1D32' : 'white' }]}>
      {/* Header */}
      <Text style={[styles.headerLabel, { color: '#0891B2' }]}>PROFIT QUALITY</Text>

      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Circular gauge */}
        <CircularProgress score={data.score} isDark={isDark} />

        {/* Metrics column */}
        <View style={styles.metricsColumn}>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>
              Strategy Fit
            </Text>
            <Text style={[styles.metricValue, { color: getStrategyFitColor() }]}>
              {data.strategyFit}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>
              Risk Level
            </Text>
            <Text style={[styles.metricValue, { color: getRiskLevelColor() }]}>
              {data.riskLevel}
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : '#64748B' }]}>
              Protection
            </Text>
            <Text style={[styles.metricValue, { color: getProtectionColor() }]}>
              {data.protection}
            </Text>
          </View>
        </View>
      </View>

      {/* View Factors */}
      <TouchableOpacity 
        style={styles.viewFactorsBtn}
        onPress={() => setShowFactors(!showFactors)}
      >
        <Text style={[styles.viewFactorsText, { color: isDark ? 'rgba(255,255,255,0.6)' : '#64748B' }]}>
          View Factors
        </Text>
        <Ionicons 
          name={showFactors ? 'chevron-up' : 'chevron-down'} 
          size={14} 
          color={isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8'} 
        />
      </TouchableOpacity>

      {/* Factors list (expandable) */}
      {showFactors && data.factors && (
        <View style={styles.factorsList}>
          {data.factors.map((factor, index) => (
            <View key={index} style={styles.factorRow}>
              <Ionicons 
                name={factor.isPositive ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={factor.isPositive ? colors.profit.main : colors.loss.main} 
              />
              <Text style={[styles.factorLabel, { color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' }]}>
                {factor.label}
              </Text>
              <Text style={[styles.factorValue, { color: isDark ? 'white' : '#0A1628' }]}>
                {factor.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Insight */}
      <View style={[styles.insightContainer, { borderLeftColor: '#0891B2' }]}>
        <Text style={[styles.insightText, { color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' }]}>
          {data.insight}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -4,
  },
  metricsColumn: {
    flex: 1,
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewFactorsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
    paddingVertical: 4,
  },
  viewFactorsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  factorsList: {
    marginTop: 12,
    gap: 8,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  factorLabel: {
    flex: 1,
    fontSize: 12,
  },
  factorValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightContainer: {
    marginTop: 16,
    paddingLeft: 12,
    borderLeftWidth: 3,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default ProfitQualityCard;
