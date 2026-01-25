/**
 * DealMakerPage - Deal Maker worksheet page
 * Route: /deal-maker/[address]
 * 
 * Mobile-friendly worksheet for adjusting deal terms and viewing metric impacts
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors } from '../../theme/colors';
import { DealMakerScreen } from '../../components/deal-maker';

export default function DealMakerPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    address: string;
    listPrice?: string;
    rent?: string;
    tax?: string;
    insurance?: string;
  }>();

  const decodedAddress = decodeURIComponent(params.address || '');

  // Parse optional params from query string
  const listPrice = params.listPrice ? parseFloat(params.listPrice) : undefined;
  const rentEstimate = params.rent ? parseFloat(params.rent) : undefined;
  const propertyTax = params.tax ? parseFloat(params.tax) : undefined;
  const insurance = params.insurance ? parseFloat(params.insurance) : undefined;

  // Navigation handlers
  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          animation: 'slide_from_right',
        }} 
      />
      
      <View style={styles.container}>
        {/* Back Button Overlay */}
        <TouchableOpacity 
          style={[
            styles.backButton, 
            { top: insets.top + 8 }
          ]}
          onPress={handleBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
        </TouchableOpacity>

        {/* Address Display */}
        <View style={[styles.addressContainer, { top: insets.top + 8 }]}>
          <Text style={styles.addressText} numberOfLines={1}>
            {decodedAddress || 'New Deal'}
          </Text>
        </View>

        {/* Main Deal Maker Screen */}
        <DealMakerScreen
          propertyAddress={decodedAddress}
          listPrice={listPrice}
          rentEstimate={rentEstimate}
          propertyTax={propertyTax}
          insurance={insurance}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[100],
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    position: 'absolute',
    left: 60,
    right: 60,
    zIndex: 10,
    alignItems: 'center',
  },
  addressText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
});
