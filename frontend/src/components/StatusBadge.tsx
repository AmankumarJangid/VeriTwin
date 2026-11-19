// Pill status badge per twin_status
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TwinStatus } from '../types/api';
import { getStatusDetails } from '../utils/format';
import { typography } from '../theme/typography';
import { radii } from '../theme/spacing';

interface StatusBadgeProps {
  status: TwinStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { label, color, bg } = getStatusDetails(status);

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + '30' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
});
