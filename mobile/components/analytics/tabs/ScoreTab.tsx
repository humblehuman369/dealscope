/**
 * ScoreTab - Detailed score breakdown with gauge and category bars
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { DealScore, ScoreBreakdown, Insight } from '../types';

interface ScoreTabProps {
  score: DealScore;
  insights: Insight[];
  isDark?: boolean;
}

export function ScoreTab({ score, insights, isDark = true }: ScoreTabProps) {
  // Gauge dimensions
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * score.score) / 100;

  // Split insights by type
  const strengths = insights.filter(i => i.type === 'strength');
  const concerns = insights.filter(i => i.type === 'concern');
  const tips = insights.filter(i => i.type === 'tip');

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Score Gauge */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e', textAlign: 'center' }]}>
          Deal Score
        </Text>
        
        <View style={styles.gaugeContainer}>
          <Svg width={size} height={size}>
            <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)'}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={score.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </G>
          </Svg>
          
          <View style={styles.gaugeCenter}>
            <Text style={[styles.gaugeScore, { color: score.color }]}>
              {score.score}
            </Text>
            <Text style={[styles.gaugeGrade, { color: score.color }]}>
              {score.grade}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.verdict, { color: score.color }]}>
          {score.label}
        </Text>

        {/* Grade Scale */}
        <View style={[styles.gradeScale, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(7,23,46,0.02)',
        }]}>
          <View style={styles.gradeItem}>
            <Text style={[styles.gradeLabel, { color: '#22c55e' }]}>A: 80+</Text>
          </View>
          <View style={styles.gradeDivider} />
          <View style={styles.gradeItem}>
            <Text style={[styles.gradeLabel, { color: '#84cc16' }]}>B: 60-79</Text>
          </View>
          <View style={styles.gradeDivider} />
          <View style={styles.gradeItem}>
            <Text style={[styles.gradeLabel, { color: '#f97316' }]}>C: 40-59</Text>
          </View>
          <View style={styles.gradeDivider} />
          <View style={styles.gradeItem}>
            <Text style={[styles.gradeLabel, { color: '#ef4444' }]}>D: &lt;40</Text>
          </View>
        </View>
      </View>

      {/* Score Breakdown */}
      <View style={[styles.card, { 
        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(7,23,46,0.08)',
      }]}>
        <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#07172e' }]}>
          Score Breakdown
        </Text>
        
        {score.breakdown.map((item, index) => (
          <ScoreRow key={index} item={item} isDark={isDark} />
        ))}
      </View>

      {/* Strengths */}
      {strengths.length > 0 && (
        <View style={[styles.insightCard, { 
          backgroundColor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)',
          borderColor: 'rgba(34,197,94,0.2)',
        }]}>
          <Text style={[styles.insightTitle, { color: '#22c55e' }]}>✅ Strengths</Text>
          {strengths.map((insight, i) => (
            <Text key={i} style={[styles.insightText, { color: isDark ? '#e1e8ed' : '#374151' }]}>
              • {insight.text}
            </Text>
          ))}
        </View>
      )}

      {/* Concerns */}
      {concerns.length > 0 && (
        <View style={[styles.insightCard, { 
          backgroundColor: isDark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.05)',
          borderColor: 'rgba(249,115,22,0.2)',
        }]}>
          <Text style={[styles.insightTitle, { color: '#f97316' }]}>⚠️ Areas of Concern</Text>
          {concerns.map((insight, i) => (
            <Text key={i} style={[styles.insightText, { color: isDark ? '#e1e8ed' : '#374151' }]}>
              • {insight.text}
            </Text>
          ))}
        </View>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <View style={[styles.insightCard, { 
          backgroundColor: isDark ? 'rgba(77,208,225,0.08)' : 'rgba(0,126,167,0.05)',
          borderColor: isDark ? 'rgba(77,208,225,0.2)' : 'rgba(0,126,167,0.2)',
        }]}>
          <Text style={[styles.insightTitle, { color: isDark ? '#4dd0e1' : '#007ea7' }]}>
            💡 How to Improve
          </Text>
          {tips.map((insight, i) => (
            <Text key={i} style={[styles.insightText, { color: isDark ? '#e1e8ed' : '#374151' }]}>
              • {insight.text}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ScoreRow({ item, isDark }: { item: ScoreBreakdown; isDark: boolean }) {
  const percentage = (item.points / item.maxPoints) * 100;
  const barColor = percentage >= 80 ? '#22c55e' : percentage >= 60 ? '#84cc16' : percentage >= 40 ? '#f97316' : '#ef4444';

  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreRowHeader}>
        <Text style={[styles.scoreRowLabel, { color: isDark ? '#aab2bd' : '#6b7280' }]}>
          {item.icon} {item.category}
        </Text>
        <Text style={[styles.scoreRowPoints, { color: isDark ? '#fff' : '#07172e' }]}>
          {item.points}/{item.maxPoints}
        </Text>
      </View>
      <View style={[styles.scoreBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(7,23,46,0.08)' }]}>
        <View 
          style={[
            styles.scoreBarFill, 
            { width: `${percentage}%`, backgroundColor: barColor }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
  },
  gaugeGrade: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  verdict: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  gradeScale: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    marginTop: 16,
    justifyContent: 'space-around',
  },
  gradeItem: {
    alignItems: 'center',
  },
  gradeDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  gradeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  scoreRow: {
    marginBottom: 12,
  },
  scoreRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreRowLabel: {
    fontSize: 12,
  },
  scoreRowPoints: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
});

