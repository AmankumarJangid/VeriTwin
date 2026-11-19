// Login Screen with Quick Seed Fill Chips & Long-Press Dev Menu
// Spec reference: 02_FRONTEND.md §6.1 & DESIGN-intercom.md
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { loginApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { getErrorMessage } from '../../src/utils/errors';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth, setDevMenu } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const demoAccounts = [
    { label: 'Maker', role: 'MANUFACTURER', email: 'maker@veritwin.dev', pass: 'Maker@123' },
    { label: 'Retailer', role: 'RETAILER', email: 'retail@veritwin.dev', pass: 'Retail@123' },
    { label: 'Riya (Owner)', role: 'CONSUMER', email: 'riya@veritwin.dev', pass: 'Riya@123' },
    { label: 'Arjun (Buyer)', role: 'CONSUMER', email: 'arjun@veritwin.dev', pass: 'Arjun@123' },
  ];

  const handleQuickFill = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const data = await loginApi(email.trim(), password);
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
    } catch (err) {
      Alert.alert('Login Failed', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scrollable>
      {/* Brand Header with Long-Press Dev Menu */}
      <View style={styles.brandContainer}>
        <TouchableOpacity
          onLongPress={() => {
            Alert.alert('Developer Menu', 'Opening Dev Menu switches…');
            setDevMenu({ isOpen: true });
          }}
          delayLongPress={600}
          activeOpacity={0.85}
          style={styles.logoBadge}
        >
          <Ionicons name="shield-checkmark" size={32} color={colors.finOrange} />
        </TouchableOpacity>
        <Text style={styles.brandTitle}>VeriTwin</Text>
        <Text style={styles.brandTagline}>
          Physical-Digital Tamper-Evident Authentication
        </Text>
      </View>

      {/* Main Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in to your account</Text>
        <Text style={styles.cardSubtitle}>
          Enter your credentials or choose a pre-seeded demo profile below.
        </Text>

        {/* Quick Fill Chips */}
        <View style={styles.quickFillSection}>
          <Text style={styles.quickFillLabel}>Demo Accounts (Instant Fill):</Text>
          <View style={styles.chipsContainer}>
            {demoAccounts.map((acc) => {
              const isActive = email === acc.email;
              return (
                <TouchableOpacity
                  key={acc.email}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => handleQuickFill(acc)}
                >
                  <Text style={[styles.chipRole, isActive && styles.chipTextActive]}>
                    {acc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Form Fields */}
        <FormField
          label="Email Address"
          placeholder="name@domain.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <FormField
          label="Password"
          placeholder="••••••••"
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={isLoading}
          variant="primary"
          style={{ marginTop: spacing.xs }}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hintText}>
        Tip: Long-press the shield logo above to open the simulated Dev Menu.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandContainer: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: radii.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  brandTitle: {
    ...typography.displayMd,
    letterSpacing: -0.8,
  },
  brandTagline: {
    ...typography.subhead,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    ...typography.headline,
    fontSize: 19,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  quickFillSection: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface2,
    padding: 10,
    borderRadius: radii.md,
  },
  quickFillLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.inkMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipRole: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  chipTextActive: {
    color: colors.onPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.inkMuted,
  },
  footerLink: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.finOrange,
  },
  hintText: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.inkSubtle,
  },
});
