/**
 * DealMakerPage - Deal Maker IQ worksheet page
 * Route: /deal-maker/[address]
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';

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

  const listPrice = params.listPrice ? parseFloat(params.listPrice) : undefined;
  const rentEstimate = params.rent ? parseFloat(params.rent) : undefined;
  const propertyTax = params.tax ? parseFloat(params.tax) : undefined;
  const insurance = params.insurance ? parseFloat(params.insurance) : undefined;

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
    backgroundColor: '#F1F5F9',
  },
});
