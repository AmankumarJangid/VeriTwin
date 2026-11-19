// Prettified dynamic specs table
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface SpecListProps {
  specs: Record<string, any>;
}

export const SpecList: React.FC<SpecListProps> = ({ specs }) => {
  if (!specs || Object.keys(specs).length === 0) {
    return null;
  }

  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^\w/, (c) => c.toUpperCase());
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardHeader}>Specifications & Master Data</Text>
      <View style={styles.list}>
        {Object.entries(specs).map(([key, value], idx) => (
          <View
            key={key}
            style={[
              styles.row,
              idx === Object.keys(specs).length - 1 && styles.rowLast,
            ]}
          >
            <Text style={styles.label}>{formatKey(key)}</Text>
            <Text style={styles.value}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  cardHeader: {
    ...typography.cardTitle,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  list: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  rowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    ...typography.bodySm,
    color: colors.inkMuted,
  },
  value: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'right',
  },
});
