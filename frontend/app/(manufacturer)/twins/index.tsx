// Manufacturer Twins Catalog
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { getTwinsApi } from '../../../src/api/manufacturer';
import { formatDate } from '../../../src/utils/format';
import { TwinStatus } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function ManufacturerTwinsIndex() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerTwins', selectedStatus, search],
    queryFn: () =>
      getTwinsApi({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        q: search || undefined,
      }),
  });

  const twins = data?.twins || [];
  const statusOptions: Array<'ALL' | TwinStatus> = [
    'ALL',
    'MANUFACTURED',
    'QA_PASSED',
    'IN_TRANSIT',
    'IN_RETAIL',
    'SOLD',
  ];

  return (
    <Screen
      title="Digital Twin Units"
      subtitle="Minted units with invisible watermarks & signed QR signatures"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
      bottomBar={
        <Button
          title="Mint / Create Digital Twins"
          onPress={() => router.push('/(manufacturer)/twins/create' as any)}
          variant="fin"
          icon={<Ionicons name="sparkles" size={18} color={colors.onPrimary} />}
        />
      }
    >
      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by serial or product name…"
          placeholderTextColor={colors.inkTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.inkMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {statusOptions.map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, selectedStatus === st && styles.filterChipActive]}
            onPress={() => setSelectedStatus(st)}
          >
            <Text
              style={[
                styles.filterText,
                selectedStatus === st && styles.filterTextActive,
              ]}
            >
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Twins List */}
      {twins.length === 0 ? (
        <EmptyState
          icon="sparkles-outline"
          title="No Twins Match Filters"
          description="Create your first batch of digital twins using base brand logos."
          actionTitle="Create Twins"
          onAction={() => router.push('/(manufacturer)/twins/create' as any)}
        />
      ) : (
        <View style={styles.list}>
          {twins.map((t) => (
            <TouchableOpacity
              key={t.twin_id}
              style={styles.card}
              onPress={() => router.push(`/(manufacturer)/twins/${t.twin_id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serial}>{t.serial_number}</Text>
                  <Text style={styles.prodName}>{t.product.name}</Text>
                </View>
                <StatusBadge status={t.status} />
              </View>

              <View style={styles.grid}>
                <View>
                  <Text style={styles.label}>Batch</Text>
                  <Text style={styles.val}>{t.batch_no}</Text>
                </View>
                <View>
                  <Text style={styles.label}>Assigned / Owner</Text>
                  <Text style={styles.val}>
                    {t.owner_name || t.current_retailer_name || 'At Factory'}
                  </Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.date}>Minted {formatDate(t.created_at)}</Text>
                <View style={styles.linkRow}>
                  <Text style={styles.linkText}>View Chain & Assets</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.finOrange} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: spacing.xs,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.ink,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    backgroundColor: colors.surface1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  filterChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  filterText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
    color: colors.ink,
  },
  filterTextActive: {
    color: colors.onPrimary,
  },
  list: {
    gap: 10,
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
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  serial: {
    ...typography.mono,
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  prodName: {
    ...typography.cardTitle,
    fontSize: 14,
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 8,
    marginVertical: 6,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  val: {
    ...typography.bodySm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  linkText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.finOrange,
  },
});
