import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { prettifySpecKey } from '../utils/format';

interface SpecListProps {
  specs?: Record<string, string | number | boolean>;
}

export const SpecList: React.FC<SpecListProps> = ({ specs }) => {
  if (!specs || Object.keys(specs).length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          No technical specifications provided.
        </Text>
      </View>
    );
  }

  const entries = Object.entries(specs);

  return (
    <View style={styles.container}>
      {entries.map(([key, value], index) => {
        const isLast = index === entries.length - 1;
        return (
          <View key={key} style={[styles.row, !isLast && styles.rowBorder]}>
            <Text style={[typography.body, styles.keyText]}>{prettifySpecKey(key)}</Text>
            <Text style={[typography.bodyBold, styles.valueText]}>{String(value)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  keyText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  valueText: {
    color: colors.text,
    fontSize: 13,
    textAlign: 'right',
    maxWidth: '55%',
  },
  empty: {
    padding: spacing.md,
    alignItems: 'center',
  },
});
