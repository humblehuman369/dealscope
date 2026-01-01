'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect old /landing2 URLs to the main page
export default function Landing2Redirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8eef3]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0465f2] border-t-transparent mx-auto mb-4"></div>
        <p className="text-[#6b7280] font-medium">Redirecting to main page...</p>
      </div>
    </div>
  );
}
