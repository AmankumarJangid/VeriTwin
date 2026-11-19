// Manufacturer Tab Layout
import React from 'react';
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
          tabBarActiveTintColor: colors.roleManufacturer,
          tabBarInactiveTintColor: colors.inkMuted,
          tabBarStyle: {
            backgroundColor: colors.surface1,
            borderTopColor: colors.hairline,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="twins"
          options={{
            title: 'Twins & Mint',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: 'Products',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="pricetag-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="batches"
          options={{
            title: 'Batches',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="layers-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="audit"
          options={{
            title: 'Audit Chain',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="link-outline" size={size} color={color} />
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
            title: 'Factory',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </RoleGuard>
  );
}
