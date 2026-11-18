import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';

interface FallbackSheetProps {
  visible: boolean;
  message?: string;
  confidence?: number;
  onRetryLogo: () => void;
  onSwitchToQr: () => void;
  onClose: () => void;
  isServiceDown?: boolean;
}

export const FallbackSheet: React.FC<FallbackSheetProps> = ({
  visible,
  message,
  confidence,
  onRetryLogo,
  onSwitchToQr,
  onClose,
  isServiceDown = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isServiceDown ? 'cloud-offline-outline' : 'scan-outline'}
              size={32}
              color={colors.warning}
            />
          </View>

          <Text style={[typography.h3, styles.title]}>
            {isServiceDown ? 'Logo Service Unavailable' : "Couldn't read the logo mark"}
          </Text>

          <Text style={[typography.body, styles.bodyText]}>
            {message ||
              'We were unable to decode the hidden imperceptible watermark from this angle. You can try with better lighting or verify instantly using the fallback QR code.'}
          </Text>

          {confidence !== undefined && (
            <View style={styles.confidenceRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Detection Confidence: {Math.round(confidence * 100)}% (Threshold: 75%)
              </Text>
            </View>
          )}

          <View style={styles.buttonStack}>
            <Button
              title="Switch to QR Scan"
              onPress={onSwitchToQr}
              variant="primary"
              size="lg"
              leftIcon={<Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />}
            />

            {!isServiceDown && (
              <Button
                title="Retry Logo Scan"
                onPress={onRetryLogo}
                variant="secondary"
                size="md"
                leftIcon={<Ionicons name="camera-outline" size={18} color={colors.text} />}
              />
            )}

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={[typography.body, styles.cancelText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  bodyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  confidenceRow: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    marginBottom: spacing.base,
  },
  buttonStack: {
    width: '100%',
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textMuted,
  },
});
