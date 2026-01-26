/**
 * DealMakerPage - Deal Maker Pro worksheet page
 * Route: /deal-maker/[address]
 * 
 * Mobile-friendly worksheet for adjusting deal terms and viewing metric impacts
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { DEAL_MAKER_PRO_COLORS } from '../../components/deal-maker/types';
import { DealMakerScreen } from '../../components/deal-maker';

export default function DealMakerPage() {
  const router = useRouter();
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
        {/* Main Deal Maker Pro Screen */}
        <DealMakerScreen
          propertyAddress={decodedAddress || 'New Deal'}
          listPrice={listPrice}
          rentEstimate={rentEstimate}
          propertyTax={propertyTax}
          insurance={insurance}
          onBackPress={handleBack}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DEAL_MAKER_PRO_COLORS.contentBg,
  },
});
