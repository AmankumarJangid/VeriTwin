// Root Application Layout & Global Providers
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/store/authStore';
import { DevMenu } from '../src/components/DevMenu';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f5f1ec' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(manufacturer)" options={{ headerShown: false }} />
          <Stack.Screen name="(retailer)" options={{ headerShown: false }} />
          <Stack.Screen name="(consumer)" options={{ headerShown: false }} />
          <Stack.Screen
            name="scan-result"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
        <DevMenu />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
