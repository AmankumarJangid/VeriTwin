// Verdict banner for scan results (GENUINE, FAKE, ALREADY_CLAIMED)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScanVerdict, VerificationMethod } from '../types/api';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface VerdictBannerProps {
  verdict: ScanVerdict;
  method?: VerificationMethod;
  confidence?: number;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  verdict,
  method,
  confidence,
}) => {
  const getConfig = () => {
    switch (verdict) {
      case 'GENUINE':
        return {
          title: 'Authentic & Verified',
          subtitle: 'Cryptographic digital twin matches physical item.',
          color: colors.verdictGenuine,
          bg: colors.verdictGenuineBg,
          icon: 'shield-checkmark' as const,
        };
      case 'ALREADY_CLAIMED':
        return {
          title: 'Already Claimed & Locked',
          subtitle: 'This item is registered to an existing owner.',
          color: colors.verdictClaimed,
          bg: colors.verdictClaimedBg,
          icon: 'lock-closed' as const,
        };
      case 'FAKE':
      default:
        return {
          title: 'Counterfeit / Unverified',
          subtitle: 'No valid digital twin or signature mismatch.',
          color: colors.verdictFake,
          bg: colors.verdictFakeBg,
          icon: 'alert-circle' as const,
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.color + '40' }]}>
      <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
        <Ionicons name={config.icon} size={28} color={colors.onPrimary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      </View>
      {method && (
        <View style={styles.badgeRow}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>
              {method === 'WATERMARK' ? 'Hidden Watermark' : 'Signed Fallback QR'}
            </Text>
          </View>
          {confidence !== undefined && (
            <View style={styles.confBadge}>
              <Text style={styles.confText}>{Math.round(confidence * 100)}% match</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    marginBottom: spacing.md,
    alignItems: 'center',
    textAlign: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    ...typography.headline,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  methodBadge: {
    backgroundColor: colors.surface1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  methodText: {
    ...typography.caption,
    color: colors.ink,
    fontWeight: '600',
  },
  confBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  confText: {
    ...typography.caption,
    color: colors.inkMuted,
    fontWeight: '600',
  },
});
