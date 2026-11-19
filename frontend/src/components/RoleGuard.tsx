// Role-based route guard
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/api';
import { colors } from '../theme/colors';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login');
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      // Redirect to correct dashboard
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
    }
  }, [user, isAuthenticated, isLoading, allowedRoles]);

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
