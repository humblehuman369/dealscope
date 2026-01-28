'use client';

/**
 * Property Details Page Route
 * Route: /property-details?address=...
 * 
 * Displays detailed property information with image gallery,
 * property facts, features, and bottom action bar.
 */

import { Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PropertyDetailsPage } from '@/components/property';

function PropertyDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const addressParam = searchParams.get('address') || '';
  
  // Handle navigation
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAnalyze = useCallback(() => {
    // Navigate to verdict/analysis page
    if (addressParam) {
      router.push(`/verdict?address=${encodeURIComponent(addressParam)}`);
    }
  }, [router, addressParam]);

  const handleSave = useCallback(() => {
    console.log('Save property');
    // TODO: Implement save functionality
  }, []);

  const handleShare = useCallback(() => {
    console.log('Share property');
    // TODO: Implement share functionality
  }, []);

  const handleStrategyChange = useCallback((strategy: string) => {
    console.log('Strategy changed to:', strategy);
  }, []);

  const handleNavChange = useCallback((navId: string) => {
    switch (navId) {
      case 'search':
        router.push('/search');
        break;
      case 'home':
        // Stay on property details (home icon navigates here)
        break;
      case 'analysis':
        if (addressParam) {
          router.push(`/analysis-iq?address=${encodeURIComponent(addressParam)}`);
        }
        break;
      case 'deals':
        if (addressParam) {
          router.push(`/deal-maker?address=${encodeURIComponent(addressParam)}`);
        }
        break;
      default:
        console.log('Navigate to:', navId);
    }
  }, [router, addressParam]);

  return (
    <PropertyDetailsPage
      showPhoneFrame={true}
      onBack={handleBack}
      onAnalyze={handleAnalyze}
      onSave={handleSave}
      onShare={handleShare}
      onStrategyChange={handleStrategyChange}
      onNavChange={handleNavChange}
    />
  );
}

export default function PropertyDetailsRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">Loading property details...</p>
        </div>
      </div>
    }>
      <PropertyDetailsContent />
    </Suspense>
  );
}
