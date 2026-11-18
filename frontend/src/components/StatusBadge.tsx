import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { TwinStatus } from '../types/api';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

interface StatusBadgeProps {
  status: TwinStatus;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style, size = 'md' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'MANUFACTURED':
        return {
          label: 'MANUFACTURED',
          color: colors.status.MANUFACTURED,
          bg: colors.status.MANUFACTURED_BG,
        };
      case 'QA_PASSED':
        return {
          label: 'QA PASSED',
          color: colors.status.QA_PASSED,
          bg: colors.status.QA_PASSED_BG,
        };
      case 'IN_TRANSIT':
        return {
          label: 'IN TRANSIT',
          color: colors.status.IN_TRANSIT,
          bg: colors.status.IN_TRANSIT_BG,
        };
      case 'IN_RETAIL':
        return {
          label: 'IN RETAIL',
          color: colors.status.IN_RETAIL,
          bg: colors.status.IN_RETAIL_BG,
        };
      case 'SOLD':
        return {
          label: 'SOLD & CLAIMED',
          color: colors.status.SOLD,
          bg: colors.status.SOLD_BG,
        };
      default:
        return {
          label: status,
          color: colors.textSecondary,
          bg: colors.surfaceElevated,
        };
    }
  };

  const config = getBadgeConfig();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.color,
          paddingVertical: isSm ? 2 : 4,
          paddingHorizontal: isSm ? spacing.xs : spacing.sm,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text
        style={[
          typography.captionBold,
          styles.text,
          { color: config.color, fontSize: isSm ? 10 : 11 },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    letterSpacing: 0.5,
  },
});
