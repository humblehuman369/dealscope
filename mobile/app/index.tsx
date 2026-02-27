import { Redirect } from 'expo-router';

/**
 * Root index — redirects to the Search tab (primary entry point).
 */
export default function Index() {
  return <Redirect href="/(tabs)/search" />;
}
