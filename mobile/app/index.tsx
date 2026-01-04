import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to the home tab as the default screen
  return <Redirect href="/(tabs)/home" />;
}

