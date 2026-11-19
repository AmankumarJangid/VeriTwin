// Root Entry & Role Redirect Gate
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '../src/theme/colors';

export default function Index() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
      return;
    }

    switch (user.role) {
      case 'MANUFACTURER':
        router.replace('/(manufacturer)');
        break;
      case 'RETAILER':
        router.replace('/(retailer)');
        break;
      case 'CONSUMER':
      default:
        router.replace('/(consumer)');
        break;
    }
  }, [user, isAuthenticated, isLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
