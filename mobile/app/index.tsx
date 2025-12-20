import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the scan tab as the default screen
  return <Redirect href="/(tabs)/scan" />;
}

