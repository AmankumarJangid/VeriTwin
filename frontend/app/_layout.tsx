import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { DevMenuModal } from '../src/components/DevMenuModal';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { spacing, borderRadius } from '../src/theme/spacing';
import '../src/api'; // Initialize mock adapter & interceptors

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const { initialize, user, isAuthenticated } = useAuthStore();
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <View style={styles.container}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(manufacturer)" />
            <Stack.Screen name="(retailer)" />
            <Stack.Screen name="(consumer)" />
            <Stack.Screen
              name="scan-result"
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack>

          {/* Floating Dev Mode Pill */}
          <TouchableOpacity
            style={styles.floatingDevBadge}
            onPress={() => setDevMenuOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="flask-outline" size={14} color="#FFFFFF" />
            <Text style={[typography.captionBold, styles.devBadgeText]}>
              MOCK DEV
            </Text>
          </TouchableOpacity>

          <DevMenuModal visible={devMenuOpen} onClose={() => setDevMenuOpen(false)} />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  floatingDevBadge: {
    position: 'absolute',
    top: 44,
    right: spacing.md,
    backgroundColor: 'rgba(99, 102, 241, 0.85)',
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#818CF8',
  },
  devBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
