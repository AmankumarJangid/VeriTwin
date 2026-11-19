// Manufacturer Batches List
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { getBatchesApi } from '../../../src/api/manufacturer';
import { formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function ManufacturerBatchesIndex() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerBatches'],
    queryFn: () => getBatchesApi(),
  });

  const batches = data?.batches || [];

  return (
    <Screen
      title="Production Batches"
      subtitle="Factory lot runs, assembly locations & planned quantities"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
      bottomBar={
        <Button
          title="Create New Batch"
          onPress={() => router.push('/(manufacturer)/batches/new' as any)}
          variant="primary"
          icon={<Ionicons name="add" size={18} color={colors.onPrimary} />}
        />
      }
    >
      {batches.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          title="No Batches Created"
          description="Create a production batch before minting digital twin units."
          actionTitle="Create Batch"
          onAction={() => router.push('/(manufacturer)/batches/new' as any)}
        />
      ) : (
        <View style={styles.list}>
          {batches.map((b) => (
            <View key={b.batch_id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.batchNo}>{b.batch_no}</Text>
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyText}>{b.planned_quantity} Units Planned</Text>
                </View>
              </View>

              <Text style={styles.location}>Factory: {b.factory_location}</Text>
              {b.notes ? <Text style={styles.notes}>{b.notes}</Text> : null}

              <View style={styles.grid}>
                <View>
                  <Text style={styles.label}>Manufactured On</Text>
                  <Text style={styles.val}>{formatDate(b.manufactured_on)}</Text>
                </View>
                <View>
                  <Text style={styles.label}>Minted Twins</Text>
                  <Text style={styles.val}>{b.twins_count || 0} active</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  batchNo: {
    ...typography.headline,
    fontSize: 16,
  },
  qtyBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  qtyText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.ink,
    fontSize: 10,
  },
  location: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginTop: 2,
  },
  notes: {
    ...typography.caption,
    color: colors.inkSubtle,
    fontStyle: 'italic',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    marginTop: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  val: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 1,
  },
});
