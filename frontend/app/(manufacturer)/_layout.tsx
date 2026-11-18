import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { RoleGuard } from '../../src/components/RoleGuard';

export default function ManufacturerLayout() {
  return (
    <RoleGuard allowedRoles={['MANUFACTURER']}>
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
          tabBarActiveTintColor: colors.role.MANUFACTURER_LIGHT,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="twins/index"
          options={{
            title: 'Twins',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="hardware-chip-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="twins/create"
          options={{
            title: 'Create',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle-outline" size={size + 2} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: 'Scan',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="scan-outline" size={size} color={color} />
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

        {/* Hidden sub-screens in tabs */}
        <Tabs.Screen name="products/index" options={{ href: null }} />
        <Tabs.Screen name="products/new" options={{ href: null }} />
        <Tabs.Screen name="products/[id]" options={{ href: null }} />
        <Tabs.Screen name="batches/index" options={{ href: null }} />
        <Tabs.Screen name="batches/new" options={{ href: null }} />
        <Tabs.Screen name="twins/[id]" options={{ href: null }} />
        <Tabs.Screen name="audit" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}
