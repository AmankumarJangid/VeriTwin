import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ScanVerdict, VerificationMethod } from '../types/api';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface VerdictBannerProps {
  verdict: ScanVerdict;
  method?: VerificationMethod;
  confidence?: number;
  message?: string;
  isOwner?: boolean;
}

export const VerdictBanner: React.FC<VerdictBannerProps> = ({
  verdict,
  method,
  confidence,
  message,
  isOwner,
}) => {
  useEffect(() => {
    // Trigger haptics on verdict mount (§4.4)
    if (Platform.OS !== 'web') {
      if (verdict === 'GENUINE') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (verdict === 'ALREADY_CLAIMED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [verdict]);

  const getConfig = () => {
    switch (verdict) {
      case 'GENUINE':
        return {
          title: isOwner ? 'AUTHENTIC (YOUR ITEM)' : 'AUTHENTIC PRODUCT',
          subtitle: message || 'Cryptographic hash chain & physical markers validated.',
          icon: 'shield-checkmark' as const,
          color: colors.verdict.GENUINE,
          bg: colors.verdict.GENUINE_BG,
          borderColor: 'rgba(22, 163, 74, 0.4)',
        };
      case 'ALREADY_CLAIMED':
        return {
          title: 'ALREADY CLAIMED & LOCKED',
          subtitle:
            message ||
            'This unit is registered to an existing owner. Ownership transfer requires a peer-to-peer in-app handshake.',
          icon: 'lock-closed' as const,
          color: colors.verdict.ALREADY_CLAIMED,
          bg: colors.verdict.ALREADY_CLAIMED_BG,
          borderColor: 'rgba(217, 119, 6, 0.4)',
        };
      case 'FAKE':
      default:
        return {
          title: 'POTENTIAL COUNTERFEIT',
          subtitle:
            message ||
            'No matching Digital Twin found on the immutable registry. This item failed physical-digital verification.',
          icon: 'alert-circle' as const,
          color: colors.verdict.FAKE,
          bg: colors.verdict.FAKE_BG,
          borderColor: 'rgba(220, 38, 38, 0.4)',
        };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: config.borderColor }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
          <Ionicons name={config.icon} size={28} color="#FFFFFF" />
        </View>
        <View style={styles.titleColumn}>
          <Text style={[typography.h2, styles.title, { color: config.color }]}>{config.title}</Text>
          {method && (
            <View style={styles.chipsRow}>
              <View style={styles.methodChip}>
                <Ionicons
                  name={method === 'WATERMARK' ? 'scan-outline' : 'qr-code-outline'}
                  size={12}
                  color={colors.textSecondary}
                />
                <Text style={[typography.captionBold, styles.methodText]}>
                  {method === 'WATERMARK' ? 'Embedded Watermark' : 'Signed Fallback QR'}
                </Text>
              </View>
              {confidence !== undefined && (
                <View style={styles.confidenceChip}>
                  <Text style={[typography.captionBold, styles.confidenceText]}>
                    {Math.round(confidence * 100)}% Match
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      <Text style={[typography.body, styles.subtitle]}>{config.subtitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    padding: spacing.base,
    borderWidth: 1.5,
    marginBottom: spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 4,
  },
  methodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
  },
  methodText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  confidenceChip: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
  },
  confidenceText: {
    color: '#93C5FD',
    fontSize: 10,
  },
  subtitle: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
