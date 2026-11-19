// Low-confidence watermark fallback modal sheet
// Spec reference: 02_FRONTEND.md §5.4 & 00_SHARED_CONTRACT.md §7.5
import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface FallbackSheetProps {
  visible: boolean;
  message?: string;
  isServiceUnavailable?: boolean;
  onRetryLogo: () => void;
  onSwitchToQr: () => void;
  onClose: () => void;
}

export const FallbackSheet: React.FC<FallbackSheetProps> = ({
  visible,
  message,
  isServiceUnavailable = false,
  onRetryLogo,
  onSwitchToQr,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isServiceUnavailable ? 'cloud-offline-outline' : 'scan-outline'}
              size={30}
              color={colors.finOrange}
            />
          </View>

          <Text style={styles.title}>
            {isServiceUnavailable
              ? 'Logo Scanning Unavailable'
              : "Couldn't read the logo mark"}
          </Text>

          <Text style={styles.body}>
            {message ||
              'The subtle digital watermark could not be decoded with high confidence. Please ensure good lighting without reflection, or switch to the signed physical QR fallback.'}
          </Text>

          <View style={styles.buttonCol}>
            <Button
              title="Switch to Signed QR Scan"
              onPress={onSwitchToQr}
              variant="fin"
              icon={<Ionicons name="qr-code-outline" size={18} color={colors.onPrimary} />}
            />
            {!isServiceUnavailable && (
              <Button
                title="Retry Logo Capture"
                onPress={onRetryLogo}
                variant="secondary"
                icon={<Ionicons name="refresh-outline" size={18} color={colors.ink} />}
              />
            )}
            <Button
              title="Cancel"
              onPress={onClose}
              variant="outline"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.headline,
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 6,
  },
  body: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  buttonCol: {
    width: '100%',
    gap: 10,
  },
});
