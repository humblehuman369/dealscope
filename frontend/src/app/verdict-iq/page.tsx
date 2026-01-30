import { redirect } from 'next/navigation';

/**
 * Verdict IQ Page Route - DEPRECATED
 * 
 * This route now redirects to /verdict which contains the combined analysis functionality.
 */

export const dynamic = 'force-dynamic';

export default function VerdictIQRoute() {
  redirect('/verdict');
}
