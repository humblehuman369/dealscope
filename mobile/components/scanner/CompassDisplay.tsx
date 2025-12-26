import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface CompassDisplayProps {
  heading: number;
  accuracy: number;
}

/**
 * Compact compass display showing current heading direction.
 */
export function CompassDisplay({ heading, accuracy }: CompassDisplayProps) {
  const cardinalDirection = getCardinalDirection(heading);
  
  return (
    <View style={styles.container}>
      <View style={styles.compassRing}>
        {/* 
          COMPASS NEEDLE ROTATION FIX:
          The needle should ALWAYS point to magnetic North.
          When the device heading is 90° (facing East), the needle
          must rotate -90° to continue pointing North.
          
          Therefore: needle rotation = -heading
        */}
        <View
          style={[
            styles.needle,
            { transform: [{ rotate: `${-heading}deg` }] },
          ]}
        >
          <View style={styles.needleNorth} />
        </View>
        
        <View style={styles.centerDot} />
        
        {/* Cardinal direction labels */}
        <Text style={[styles.cardinalLabel, styles.north]}>N</Text>
        <Text style={[styles.cardinalLabel, styles.east]}>E</Text>
        <Text style={[styles.cardinalLabel, styles.south]}>S</Text>
        <Text style={[styles.cardinalLabel, styles.west]}>W</Text>
      </View>
      
      <View style={styles.readout}>
        <Text style={styles.headingText}>{Math.round(heading)}°</Text>
        <Text style={styles.directionText}>{cardinalDirection}</Text>
      </View>

      {/* Accuracy indicator */}
      <View style={styles.accuracyContainer}>
        <Ionicons 
          name={accuracy < 10 ? "locate" : "locate-outline"} 
          size={10} 
          color={accuracy < 10 ? colors.profit.main : colors.gray[400]} 
        />
        <Text style={styles.accuracyText}>±{Math.round(accuracy)}m</Text>
      </View>
    </View>
  );
}

function getCardinalDirection(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(heading / 45) % 8;
  return directions[index];
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    padding: 8,
    minWidth: 60,
  },
  compassRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.gray[400],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  needle: {
    position: 'absolute',
    width: 4,
    height: 32,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  needleNorth: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.loss.main,
  },
  centerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gray[300],
  },
  cardinalLabel: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '500',
    color: colors.gray[400],
  },
  north: {
    top: 2,
  },
  east: {
    right: 2,
  },
  south: {
    bottom: 2,
  },
  west: {
    left: 2,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 4,
  },
  headingText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#fff',
  },
  directionText: {
    fontWeight: '500',
    fontSize: 11,
    color: colors.gray[400],
  },
  accuracyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  accuracyText: {
    fontWeight: '400',
    fontSize: 9,
    color: colors.gray[400],
  },
});

