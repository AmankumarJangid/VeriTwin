import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { RoleGuard } from '../../src/components/RoleGuard';

export default function RetailerLayout() {
  return (
    <RoleGuard allowedRoles={['RETAILER']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.surfaceBorder,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.role.RETAILER_LIGHT,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan POS',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sales"
          options={{
            title: 'Sales',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Store',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="storefront-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Hidden sub-screen */}
        <Tabs.Screen name="sell/[twinId]" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
