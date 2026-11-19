// Manufacturer Profile Screen with Instant Role Switcher & Web-Safe Logout
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { useAuthStore } from '../../src/store/authStore';
import { logoutApi, loginApi } from '../../src/api/auth';
import { SEED_USERS } from '../../src/api/mocks/mockData';
import { confirmAction } from '../../src/utils/dialog';
import { formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function ManufacturerProfileScreen() {
  const router = useRouter();
  const { user, refreshToken, logout, setAuth, setDevMenu } = useAuthStore();

  const handleLogout = () => {
    confirmAction(
      'Sign Out',
      'Log out of manufacturer enterprise portal?',
      async () => {
        try {
          if (refreshToken) await logoutApi(refreshToken);
        } catch {
        } finally {
          await logout();
          router.replace('/(auth)/login');
        }
      },
      'Log Out'
    );
  };

  const handleSwitchAccount = async (targetUser: typeof SEED_USERS['maker']) => {
    try {
      // Authenticate with real backend API
      const pass =
        targetUser.role === 'MANUFACTURER'
          ? 'Maker@123'
          : targetUser.role === 'RETAILER'
          ? 'Retail@123'
          : targetUser.email === 'riya@veritwin.dev'
          ? 'Riya@123'
          : 'Arjun@123';

      const data = await loginApi(targetUser.email, pass);
      await setAuth(data.user, data.tokens);

      switch (data.user.role) {
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
    } catch {
      // Fallback if offline
      await setAuth(targetUser, {
        access_token: `mock_jwt_access_${targetUser.user_id}`,
        refresh_token: `mock_jwt_refresh_${targetUser.user_id}`,
        expires_in: 900,
      });
      switch (targetUser.role) {
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
  };

  return (
    <Screen
      title="Factory Profile"
      subtitle="Enterprise Brand & Manufacturing Authority"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
    >
      <View style={styles.card}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Ionicons name="business" size={28} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.organization_name || 'Aurelia Watches Atelier'}</Text>
            <Text style={styles.manager}>Administrator: {user?.full_name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.metaBox}>
          <View>
            <Text style={styles.metaLabel}>Genesis Date</Text>
            <Text style={styles.metaVal}>{formatDate(user?.created_at || '') || 'November 2026'}</Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Authority Level</Text>
            <Text style={[styles.metaVal, { color: colors.roleManufacturer }]}>
              Master Minting & Watermark Authority
            </Text>
          </View>
        </View>
      </View>

      {/* Account / Role Quick-Switcher */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Switch Account & Role</Text>
        <Text style={styles.sectionSub}>Quickly swap between platform roles to test workflows</Text>

        <View style={styles.switchGrid}>
          {/* Manufacturer */}
          <TouchableOpacity
            style={[styles.switchCard, user?.role === 'MANUFACTURER' && styles.switchCardCurrent]}
            onPress={() => handleSwitchAccount(SEED_USERS.maker)}
            activeOpacity={0.8}
          >
            <View style={[styles.switchIcon, { backgroundColor: colors.roleManufacturer + '15' }]}>
              <Ionicons name="business" size={18} color={colors.roleManufacturer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchRole}>Manufacturer</Text>
              <Text style={styles.switchName}>Vikram Aurelia (Maker)</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.inkMuted} />
          </TouchableOpacity>

          {/* Retailer */}
          <TouchableOpacity
            style={[styles.switchCard, user?.role === 'RETAILER' && styles.switchCardCurrent]}
            onPress={() => handleSwitchAccount(SEED_USERS.retailer)}
            activeOpacity={0.8}
          >
            <View style={[styles.switchIcon, { backgroundColor: colors.roleRetailer + '15' }]}>
              <Ionicons name="storefront" size={18} color={colors.roleRetailer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchRole}>Retailer</Text>
              <Text style={styles.switchName}>TimeHouse Retail POS</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.inkMuted} />
          </TouchableOpacity>

          {/* Consumer 1 */}
          <TouchableOpacity
            style={[styles.switchCard, user?.email === SEED_USERS.riya.email && styles.switchCardCurrent]}
            onPress={() => handleSwitchAccount(SEED_USERS.riya)}
            activeOpacity={0.8}
          >
            <View style={[styles.switchIcon, { backgroundColor: colors.roleConsumer + '15' }]}>
              <Ionicons name="person" size={18} color={colors.roleConsumer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchRole}>Consumer (Owner)</Text>
              <Text style={styles.switchName}>Riya Sharma</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.inkMuted} />
          </TouchableOpacity>

          {/* Consumer 2 */}
          <TouchableOpacity
            style={[styles.switchCard, user?.email === SEED_USERS.arjun.email && styles.switchCardCurrent]}
            onPress={() => handleSwitchAccount(SEED_USERS.arjun)}
            activeOpacity={0.8}
          >
            <View style={[styles.switchIcon, { backgroundColor: colors.roleConsumer + '15' }]}>
              <Ionicons name="person-outline" size={18} color={colors.roleConsumer} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchRole}>Consumer (P2P Buyer)</Text>
              <Text style={styles.switchName}>Arjun Mehta</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={colors.inkMuted} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.devCard}
        onPress={() => setDevMenu({ isOpen: true })}
        activeOpacity={0.8}
      >
        <View style={styles.devIcon}>
          <Ionicons name="construct-outline" size={20} color={colors.finOrange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.devTitle}>Developer Menu</Text>
          <Text style={styles.devSub}>Switch scan verdicts and impersonate accounts</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
      </TouchableOpacity>

      <Button
        title="Sign Out of Portal"
        onPress={handleLogout}
        variant="outline"
        icon={<Ionicons name="log-out-outline" size={18} color={colors.ink} />}
        style={styles.logoutBtn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.roleManufacturer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...typography.headline,
    fontSize: 18,
  },
  manager: {
    ...typography.bodySm,
    color: colors.ink,
    marginTop: 2,
  },
  email: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  metaVal: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.cardTitle,
    fontSize: 15,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
    marginTop: 2,
  },
  switchGrid: {
    gap: 8,
  },
  switchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    padding: 10,
    gap: 10,
  },
  switchCardCurrent: {
    borderColor: colors.finOrange,
    backgroundColor: colors.finOrangeLight,
  },
  switchIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRole: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
  },
  switchName: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.inkMuted,
  },
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  devIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.finOrangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  devTitle: {
    ...typography.cardTitle,
    fontSize: 14,
  },
  devSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  logoutBtn: {
    borderColor: colors.hairline,
    marginBottom: spacing.xl,
  },
});
