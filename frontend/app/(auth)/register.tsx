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
import { useAuthStore } from '../../src/store/authStore';
import { authApi } from '../../src/api/auth';
import { UserRole } from '../../src/types/api';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { getErrorMessage } from '../../src/utils/errors';

export default function RegisterScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [role, setRole] = useState<UserRole>('CONSUMER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isBusinessRole = role === 'MANUFACTURER' || role === 'RETAILER';

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Required Fields', 'Please complete all required fields.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
      return;
    }

    if (isBusinessRole && (!orgName || !inviteCode)) {
      Alert.alert(
        'Enterprise Verification',
        'Organization name and an authorized invite code are required for business roles.'
      );
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
        organization_name: isBusinessRole ? orgName.trim() : undefined,
        invite_code: isBusinessRole ? inviteCode.trim() : undefined,
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
      Alert.alert('Registration Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scrollable title="Create Account" subtitle="Join the VeriTwin authenticity network">
      <ScrollView contentContainerStyle={styles.container}>
        {/* Role Selector Tabs */}
        <Text style={[typography.captionBold, styles.selectorTitle]}>ACCOUNT ROLE</Text>
        <View style={styles.roleTabs}>
          {(['CONSUMER', 'RETAILER', 'MANUFACTURER'] as UserRole[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleTab,
                role === r && styles.roleTabActive,
                role === r && {
                  borderColor:
                    r === 'MANUFACTURER'
                      ? colors.role.MANUFACTURER
                      : r === 'RETAILER'
                      ? colors.role.RETAILER
                      : colors.role.CONSUMER,
                },
              ]}
              onPress={() => setRole(r)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.roleTabText,
                  role === r && styles.roleTabTextActive,
                ]}
              >
                {r === 'CONSUMER' ? '🛍️ Buyer' : r === 'RETAILER' ? '🏬 Retailer' : '🏭 Maker'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Fields */}
        <View style={styles.card}>
          <FormField
            label="Full Name"
            placeholder="e.g. Riya Sharma"
            value={fullName}
            onChangeText={setFullName}
            required
            leftIcon={<Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
          />

          <FormField
            label="Email Address"
            placeholder="e.g. riya@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            required
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
          />

          <FormField
            label="Password"
            placeholder="Min 8 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
            required
            helperText="At least 8 characters"
            leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />}
          />

          {isBusinessRole && (
            <>
              <View style={styles.divider} />
              <Text style={[typography.captionBold, styles.sectionTitle]}>
                ORGANIZATION VERIFICATION
              </Text>

              <FormField
                label="Organization / Store Name"
                placeholder="e.g. Aurelia Watches Ltd."
                value={orgName}
                onChangeText={setOrgName}
                required
                leftIcon={<Ionicons name="business-outline" size={18} color={colors.textSecondary} />}
              />

              <FormField
                label="Invite Authorization Code"
                placeholder={role === 'MANUFACTURER' ? 'MAKER-2026' : 'RETAIL-2026'}
                value={inviteCode}
                onChangeText={setInviteCode}
                required
                helperText={`Demo code: ${role === 'MANUFACTURER' ? 'MAKER-2026' : 'RETAIL-2026'}`}
                leftIcon={<Ionicons name="key-outline" size={18} color={colors.textSecondary} />}
              />
            </>
          )}

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={loading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.loginRow}>
            <Text style={[typography.body, styles.loginText]}>Already registered?</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[typography.bodyBold, styles.loginLink]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  selectorTitle: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  roleTabs: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  roleTab: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTabActive: {
    backgroundColor: colors.surfaceSubtle,
  },
  roleTabText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  roleTabTextActive: {
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  divider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.base,
    gap: spacing.xs,
  },
  loginText: {
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
  },
});
