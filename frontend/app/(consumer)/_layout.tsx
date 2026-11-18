import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { RoleGuard } from '../../src/components/RoleGuard';

export default function ConsumerLayout() {
  return (
    <RoleGuard allowedRoles={['CONSUMER']}>
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
          tabBarActiveTintColor: colors.role.CONSUMER_LIGHT,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Verify',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark-outline" size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="vault/index"
          options={{
            title: 'My Vault',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="transfer/claim"
          options={{
            title: 'Claim P2P',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="swap-horizontal-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />

        {/* Hidden sub-screens */}
        <Tabs.Screen name="vault/[twinId]" options={{ href: null }} />
        <Tabs.Screen name="transfer/[twinId]" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
