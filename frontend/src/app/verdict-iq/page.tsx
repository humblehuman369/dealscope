'use client';

import { VerdictIQPage } from '@/components/analytics';

export default function VerdictIQRoute() {
  const handleNavigateToAnalysis = (strategyId?: string) => {
    // Navigate to analysis-iq page
    window.location.href = `/analysis-iq${strategyId ? `?strategy=${strategyId}` : ''}`;
  };

  return (
    <VerdictIQPage 
      showPhoneFrame={true} 
      isDark={false}
      onNavigateToAnalysis={handleNavigateToAnalysis}
    />
  );
}
