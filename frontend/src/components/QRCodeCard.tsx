import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface QRCodeCardProps {
  value: string;
  size?: number;
  title?: string;
  subtitle?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  value,
  size = 260,
  title,
  subtitle,
}) => {
  return (
    <View style={styles.card}>
      {title && <Text style={[typography.h3, styles.title]}>{title}</Text>}
      {subtitle && <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text>}

      <View style={[styles.qrWrapper, { padding: spacing.md }]}>
        {value ? (
          <QRCode
            value={value}
            size={size}
            color="#0B0F19"
            backgroundColor="#FFFFFF"
            quietZone={12}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size }]}>
            <Text style={{ color: colors.textMuted }}>No QR Data</Text>
          </View>
        )}
      </View>

      <Text style={[typography.code, styles.payloadText]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    maxWidth: 280,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEEEEE',
  },
  payloadText: {
    color: colors.textMuted,
    marginTop: spacing.md,
    fontSize: 11,
    maxWidth: 260,
  },
});
