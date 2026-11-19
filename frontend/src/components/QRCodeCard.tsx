// QR Code renderer with quiet zone, copy, and share actions
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface QRCodeCardProps {
  payload: string;
  size?: number;
  title?: string;
  subtitle?: string;
  onShare?: () => void;
  onSave?: () => void;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  payload,
  size = 220,
  title,
  subtitle,
  onShare,
  onSave,
}) => {
  return (
    <View style={styles.card}>
      {title && <Text style={styles.title}>{title}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {/* QR with white quiet zone */}
      <View style={styles.qrContainer}>
        <QRCode
          value={payload || 'VT1.empty'}
          size={size}
          backgroundColor={colors.surface1}
          color={colors.ink}
        />
      </View>

      <Text style={styles.payloadText} numberOfLines={1}>
        {payload}
      </Text>

      {(onShare || onSave) && (
        <View style={styles.actionsRow}>
          {onSave && (
            <TouchableOpacity style={styles.actionBtn} onPress={onSave}>
              <Ionicons name="download-outline" size={16} color={colors.ink} />
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>
          )}
          {onShare && (
            <TouchableOpacity style={styles.actionBtn} onPress={onShare}>
              <Ionicons name="share-social-outline" size={16} color={colors.ink} />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  title: {
    ...typography.cardTitle,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payloadText: {
    ...typography.mono,
    fontSize: 11,
    color: colors.inkSubtle,
    marginTop: spacing.md,
    maxWidth: 240,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  actionText: {
    ...typography.button,
    fontSize: 13,
    color: colors.ink,
  },
});
