// Register Screen with Dynamic Role & Invite Code Fields
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { FormField } from '../../src/components/FormField';
import { Button } from '../../src/components/Button';
import { registerApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/authStore';
import { getErrorMessage } from '../../src/utils/errors';
import { UserRole } from '../../src/types/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CONSUMER');
  const [organizationName, setOrganizationName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roles: Array<{ key: UserRole; label: string; desc: string }> = [
    { key: 'CONSUMER', label: 'Consumer', desc: 'Verify authenticity & hold digital vault' },
    { key: 'RETAILER', label: 'Retailer', desc: 'Receive stock, inspect & execute first sale' },
    { key: 'MANUFACTURER', label: 'Manufacturer', desc: 'Mint digital twins & watermark logos' },
  ];

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in name, email, and password.');
      return;
    }

    if (role !== 'CONSUMER') {
      if (!organizationName.trim() || !inviteCode.trim()) {
        Alert.alert('Organization Required', 'Please provide organization name and invite code.');
        return;
      }
    }

    try {
      setIsLoading(true);
      const data = await registerApi({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
        organization_name: role !== 'CONSUMER' ? organizationName.trim() : undefined,
        invite_code: role !== 'CONSUMER' ? inviteCode.trim() : undefined,
      });

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
      Alert.alert('Registration Failed', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen scrollable title="Create Account" subtitle="Join the VeriTwin tamper-evident network">
      <View style={styles.card}>
        {/* Role Selector Tabs */}
        <Text style={styles.fieldLabel}>Select Your Account Type</Text>
        <View style={styles.roleContainer}>
          {roles.map((r) => {
            const isSelected = role === r.key;
            return (
              <TouchableOpacity
                key={r.key}
                style={[styles.roleCard, isSelected && styles.roleCardActive]}
                onPress={() => setRole(r.key)}
              >
                <Text style={[styles.roleTitle, isSelected && styles.roleTextActive]}>
                  {r.label}
                </Text>
                <Text style={[styles.roleDesc, isSelected && styles.roleDescActive]}>
                  {r.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormField
          label="Full Name"
          placeholder="e.g. Priya Nair"
          value={fullName}
          onChangeText={setFullName}
        />

        <FormField
          label="Email Address"
          placeholder="priya@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <FormField
          label="Password (min 8 chars)"
          placeholder="••••••••"
          isPassword
          value={password}
          onChangeText={setPassword}
        />

        {/* Dynamic Organization & Invite Code for Manufacturer/Retailer */}
        {role !== 'CONSUMER' && (
          <View style={styles.orgSection}>
            <Text style={styles.orgSectionTitle}>Enterprise Verification</Text>
            <FormField
              label="Organization / Company Name"
              placeholder={role === 'MANUFACTURER' ? 'e.g. Titan Watch Works' : 'e.g. Luxury Retail Hub'}
              value={organizationName}
              onChangeText={setOrganizationName}
            />

            <FormField
              label="Authorized Invite Code"
              placeholder={role === 'MANUFACTURER' ? 'MAKER-2026' : 'RETAIL-2026'}
              autoCapitalize="characters"
              helperText={`Seeded code: ${role === 'MANUFACTURER' ? 'MAKER-2026' : 'RETAIL-2026'}`}
              value={inviteCode}
              onChangeText={setInviteCode}
            />
          </View>
        )}

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={isLoading}
          variant="primary"
          style={{ marginTop: spacing.sm }}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    marginVertical: spacing.sm,
  },
  fieldLabel: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 8,
  },
  roleContainer: {
    gap: 8,
    marginBottom: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 12,
  },
  roleCardActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  roleTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.ink,
  },
  roleDesc: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  roleTextActive: {
    color: colors.onPrimary,
  },
  roleDescActive: {
    color: colors.surface2,
  },
  orgSection: {
    backgroundColor: colors.surface2,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  orgSectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.inkMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
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
});
