import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { DevMenuModal } from '../../src/components/DevMenuModal';
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { getErrorMessage } from '../../src/utils/errors';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devModalOpen, setDevModalOpen] = useState(false);

  const handleLogin = async (customEmail?: string, customPass?: string) => {
    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    if (!targetEmail || !targetPass) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login({
        email: targetEmail.trim(),
        password: targetPass,
      });

      await setAuth(data.user, data.tokens);

      if (data.user.role === 'MANUFACTURER') {
        router.replace('/(manufacturer)');
      } else if (data.user.role === 'RETAILER') {
        router.replace('/(retailer)');
      } else {
        router.replace('/(consumer)');
      }
    } catch (err) {
      Alert.alert('Sign In Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillAndLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(demoEmail, demoPass);
  };

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header with Long Press Dev Menu Gesture */}
        <TouchableOpacity
          style={styles.logoSection}
          onLongPress={() => setDevModalOpen(true)}
          delayLongPress={600}
          activeOpacity={0.85}
        >
          <View style={styles.logoIcon}>
            <Ionicons name="shield-checkmark" size={36} color={colors.primary} />
          </View>
          <Text style={[typography.h1, styles.brandTitle]}>VeriTwin</Text>
          <Text style={[typography.caption, styles.brandTagline]}>
            Physical-Digital Twin Verification Protocol
          </Text>
          <Text style={[typography.caption, styles.devHint]}>
            (Tip: Long-press logo for Dev Menu)
          </Text>
        </TouchableOpacity>

        {/* Demo Quick-Fill Chips (§6.1) */}
        <View style={styles.demoSection}>
          <Text style={[typography.captionBold, styles.demoTitle]}>
            QUICK DEMO ACCOUNTS (§8 CONTRACT)
          </Text>
          <View style={styles.chipGrid}>
            <TouchableOpacity
              style={[styles.demoChip, { borderColor: colors.role.MANUFACTURER }]}
              onPress={() => fillAndLogin('maker@veritwin.dev', 'Maker@123')}
            >
              <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                🏭 Manufacturer (Aurelia)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoChip, { borderColor: colors.role.RETAILER }]}
              onPress={() => fillAndLogin('retail@veritwin.dev', 'Retail@123')}
            >
              <Text style={[typography.captionBold, { color: colors.role.RETAILER_LIGHT }]}>
                🏬 Retailer (TimeHouse)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoChip, { borderColor: colors.role.CONSUMER }]}
              onPress={() => fillAndLogin('riya@veritwin.dev', 'Riya@123')}
            >
              <Text style={[typography.captionBold, { color: colors.role.CONSUMER_LIGHT }]}>
                🛍️ Consumer (Riya Sharma)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoChip, { borderColor: colors.role.CONSUMER }]}
              onPress={() => fillAndLogin('arjun@veritwin.dev', 'Arjun@123')}
            >
              <Text style={[typography.captionBold, { color: colors.role.CONSUMER_LIGHT }]}>
                🛍️ Buyer (Arjun Mehta)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Form */}
        <View style={styles.formCard}>
          <FormField
            label="Email Address"
            placeholder="e.g. maker@veritwin.dev"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
          />

          <FormField
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
          />

          <Button
            title="Sign In"
            onPress={() => handleLogin()}
            loading={loading}
            size="lg"
            style={styles.loginBtn}
          />

          <View style={styles.registerRow}>
            <Text style={[typography.body, styles.registerText]}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[typography.bodyBold, styles.registerLink]}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <DevMenuModal visible={devModalOpen} onClose={() => setDevModalOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  logoSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    marginBottom: spacing.sm,
  },
  brandTitle: {
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandTagline: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  devHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  demoSection: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.lg,
  },
  demoTitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  chipGrid: {
    gap: spacing.xs,
  },
  demoChip: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  formCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  loginBtn: {
    marginTop: spacing.sm,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.base,
    gap: spacing.xs,
  },
  registerText: {
    color: colors.textSecondary,
  },
  registerLink: {
    color: colors.primary,
  },
});
