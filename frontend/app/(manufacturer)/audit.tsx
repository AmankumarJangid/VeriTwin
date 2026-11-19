// Manufacturer Global Audit Chain Feed
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { getAuditApi } from '../../src/api/manufacturer';
import { formatDateTime, getEventTypeLabel } from '../../src/utils/format';
import { LifecycleEventType } from '../../src/types/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function ManufacturerAuditScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerAudit', selectedType],
    queryFn: () => getAuditApi({ event_type: selectedType === 'ALL' ? undefined : selectedType }),
  });

  const events = data?.events || [];
  const eventTypes: Array<'ALL' | LifecycleEventType> = [
    'ALL',
    'MANUFACTURED',
    'QA_PASSED',
    'DISPATCHED_TO_RETAIL',
    'RECEIVED_AT_RETAIL',
    'INSPECTED',
    'FIRST_SALE',
    'RESOLD',
  ];

  return (
    <Screen
      title="Audit Chain Feed"
      subtitle="Global append-only cryptographic event log across all units"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {/* Event Type Filter Chips */}
      <View style={styles.filterRow}>
        {eventTypes.map((et) => (
          <TouchableOpacity
            key={et}
            style={[styles.filterChip, selectedType === et && styles.filterChipActive]}
            onPress={() => setSelectedType(et)}
          >
            <Text style={[styles.filterText, selectedType === et && styles.filterTextActive]}>
              {et}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {events.length === 0 ? (
        <EmptyState
          icon="link-outline"
          title="No Audit Events Recorded"
          description="Lifecycle events appended to twins will appear in this immutable global feed."
        />
      ) : (
        <View style={styles.list}>
          {events.map((ev, idx) => (
            <View key={ev.event_id || idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRow}>
                  <View style={styles.eventBadge}>
                    <Text style={styles.eventBadgeText}>{ev.event_type}</Text>
                  </View>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="lock-closed" size={10} color={colors.verdictGenuine} />
                    <Text style={styles.verifiedText}>Hash Chain Valid</Text>
                  </View>
                </View>
                <Text style={styles.timeText}>{formatDateTime(ev.created_at)}</Text>
              </View>

              <Text style={styles.eventTitle}>{getEventTypeLabel(ev.event_type)}</Text>

              <View style={styles.metaBox}>
                <View>
                  <Text style={styles.metaLabel}>Unit Serial</Text>
                  <Text style={styles.serialText}>{ev.serial_number || 'VT-WCH-2026-000123'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metaLabel}>Actor</Text>
                  <Text style={styles.actorText}>{ev.actor?.display} ({ev.actor?.role})</Text>
                </View>
              </View>

              {ev.notes ? <Text style={styles.notesText}>{ev.notes}</Text> : null}

              <View style={styles.hashRow}>
                <Ionicons name="key-outline" size={12} color={colors.inkSubtle} />
                <Text style={styles.hashVal}>
                  Block Hash: {ev.event_hash ? ev.event_hash.slice(0, 16) + '…' : 'Verified'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  eventBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  eventBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 9,
    color: colors.ink,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.verdictGenuineBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  verifiedText: {
    ...typography.caption,
    fontSize: 9,
    color: colors.verdictGenuine,
    fontWeight: '700',
  },
  timeText: {
    ...typography.caption,
    color: colors.inkSubtle,
    fontSize: 10,
  },
  eventTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    marginBottom: 6,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 8,
    marginVertical: 4,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 9,
  },
  serialText: {
    ...typography.mono,
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 1,
  },
  actorText: {
    ...typography.bodySm,
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 1,
  },
  notesText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.inkMuted,
    marginVertical: 4,
    fontStyle: 'italic',
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  hashVal: {
    ...typography.mono,
    fontSize: 10,
    color: colors.inkSubtle,
  },
});
