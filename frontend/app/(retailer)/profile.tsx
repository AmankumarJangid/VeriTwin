import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { DevMenuModal } from '../../src/components/DevMenuModal';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { formatDateTime } from '../../src/utils/format';

export default function RetailerProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [devMenuVisible, setDevMenuVisible] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Sign out of Retailer Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <Screen
      scrollable
      title="Store Profile"
      subtitle="Authorized dealer boutique details"
      roleAccent={colors.role.RETAILER}
    >
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="storefront" size={32} color={colors.role.RETAILER_LIGHT} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: colors.text }]}>{user?.organization_name}</Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>{user?.full_name}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metaRow}>
          <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Dealer Role</Text>
          <Text style={[typography.bodyBold, { color: colors.role.RETAILER_LIGHT }]}>
            {user?.role}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Store ID</Text>
          <Text style={[typography.code, { color: colors.textMuted }]}>{user?.user_id}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Authorized Since</Text>
          <Text style={[typography.body, { color: colors.text }]}>
            {formatDateTime(user?.created_at)}
          </Text>
        </View>
      </View>

      {/* Dev Tools Shortcut */}
      <TouchableOpacity
        style={styles.devCard}
        onPress={() => setDevMenuVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="construct-outline" size={20} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyBold, { color: colors.text }]}>Developer Sandbox Menu</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Switch accounts, force counterfeit verdicts, simulate network
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Button
        title="Sign Out of Store Account"
        onPress={handleLogout}
        variant="destructive"
        size="lg"
        style={{ marginTop: spacing.xl }}
        leftIcon={<Ionicons name="log-out-outline" size={20} color="#FFFFFF" />}
      />

      <DevMenuModal visible={devMenuVisible} onClose={() => setDevMenuVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.base,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.role.RETAILER_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.role.RETAILER,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: spacing.base,
  },
});
