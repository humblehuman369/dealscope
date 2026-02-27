/**
 * Analytics service — wraps PostHog for event tracking.
 *
 * All conversion funnel events are defined here with typed payloads.
 * PostHog is initialized via the PostHogProvider in root layout;
 * this service uses the singleton client for imperative tracking.
 */

import { Platform } from 'react-native';
import PostHog from 'posthog-react-native';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Event names (typed string constants)
// ---------------------------------------------------------------------------

export const EVENTS = {
  APP_OPENED: 'app_opened',
  SEARCH_INITIATED: 'search_initiated',
  ANALYSIS_COMPLETED: 'analysis_completed',
  VERDICT_VIEWED: 'verdict_viewed',
  STRATEGY_VIEWED: 'strategy_viewed',
  DEAL_MAKER_USED: 'deal_maker_used',
  PROPERTY_SAVED: 'property_saved',
  PROFORMA_DOWNLOADED: 'proforma_downloaded',
  LOI_GENERATED: 'loi_generated',
  UPGRADE_PROMPT_SHOWN: 'upgrade_prompt_shown',
  PURCHASE_INITIATED: 'purchase_initiated',
  PURCHASE_COMPLETED: 'purchase_completed',
  PURCHASE_FAILED: 'purchase_failed',
  SCREEN_VIEWED: '$screen',
} as const;

// ---------------------------------------------------------------------------
// Singleton client reference
// ---------------------------------------------------------------------------

let _client: PostHog | null = null;

export function setAnalyticsClient(client: PostHog): void {
  _client = client;
}

function track(event: string, properties?: Record<string, string | number | boolean | null>): void {
  _client?.capture(event, properties);
}

// ---------------------------------------------------------------------------
// User properties
// ---------------------------------------------------------------------------

export function identifyAnalyticsUser(
  userId: string,
  properties?: {
    subscription_tier?: string;
    analyses_count?: number;
    saved_properties_count?: number;
  },
): void {
  _client?.identify(userId, {
    ...properties,
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version ?? '1.0.0',
  });
}

export function resetAnalyticsUser(): void {
  _client?.reset();
}

export function setUserProperty(key: string, value: string | number | boolean | null): void {
  _client?.capture('$set', { $set: { [key]: value } });
}

// ---------------------------------------------------------------------------
// Typed event helpers
// ---------------------------------------------------------------------------

export function trackAppOpened(source: 'organic' | 'push' | 'deep_link'): void {
  track(EVENTS.APP_OPENED, { source });
}

export function trackSearchInitiated(method: 'address' | 'camera' | 'history'): void {
  track(EVENTS.SEARCH_INITIATED, { method });
}

export function trackAnalysisCompleted(address: string, durationMs: number): void {
  track(EVENTS.ANALYSIS_COMPLETED, { address, duration_ms: durationMs });
}

export function trackVerdictViewed(address: string, score?: number): void {
  track(EVENTS.VERDICT_VIEWED, { address, verdict_score: score ?? null });
}

export function trackStrategyViewed(address: string, strategy: string): void {
  track(EVENTS.STRATEGY_VIEWED, { address, strategy });
}

export function trackDealMakerUsed(address: string, fieldCount: number): void {
  track(EVENTS.DEAL_MAKER_USED, { address, fields_changed_count: fieldCount });
}

export function trackPropertySaved(address: string): void {
  track(EVENTS.PROPERTY_SAVED, { address });
}

export function trackProformaDownloaded(format: 'excel' | 'pdf', propertyId: string): void {
  track(EVENTS.PROFORMA_DOWNLOADED, { format, property_id: propertyId });
}

export function trackLoiGenerated(address: string, offerPrice: number): void {
  track(EVENTS.LOI_GENERATED, { address, offer_price: offerPrice });
}

export function trackUpgradePromptShown(feature: string): void {
  track(EVENTS.UPGRADE_PROMPT_SHOWN, { feature });
}

export function trackPurchaseInitiated(productId: string): void {
  track(EVENTS.PURCHASE_INITIATED, { product_id: productId });
}

export function trackPurchaseCompleted(productId: string): void {
  track(EVENTS.PURCHASE_COMPLETED, { product_id: productId });
}

export function trackPurchaseFailed(productId: string, reason: string): void {
  track(EVENTS.PURCHASE_FAILED, { product_id: productId, reason });
}

export function trackScreenView(screenName: string): void {
  track(EVENTS.SCREEN_VIEWED, { $screen_name: screenName });
}
