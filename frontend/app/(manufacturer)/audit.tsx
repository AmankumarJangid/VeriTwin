import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { manufacturerApi } from '../../src/api/manufacturer';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { formatDateTime, formatShortHash } from '../../src/utils/format';

const EVENT_TYPES = [
  'ALL',
  'MANUFACTURED',
  'QA_PASSED',
  'DISPATCHED_TO_RETAIL',
  'RECEIVED_AT_RETAIL',
  'INSPECTED',
  'FIRST_SALE',
  'RESOLD',
];

export default function ManufacturerAuditFeedScreen() {
  const router = useRouter();
  const [filterType, setFilterType] = useState('ALL');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mfg-audit-feed', filterType],
    queryFn: () =>
      manufacturerApi.getAuditFeed({
        event_type: filterType === 'ALL' ? undefined : filterType,
      }),
  });

  const events = data?.data?.events || [];

  return (
    <Screen
      title="Global Audit Feed"
      subtitle="Network-wide cryptographic ledger activity"
      roleAccent={colors.role.MANUFACTURER}
      onRefresh={refetch}
      refreshing={isLoading}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      {/* Event Type Filter Chips */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={EVENT_TYPES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filterType === item && styles.filterChipActive,
              ]}
              onPress={() => setFilterType(item)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.filterChipText,
                  filterType === item && styles.filterChipTextActive,
                ]}
              >
                {item.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Events Feed */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : events.length === 0 ? (
        <EmptyState
          icon="newspaper-outline"
          title="No Audit Events"
          description="Global blockchain events will appear here as units move through manufacturing, distribution, retail, and consumer resales."
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.event_id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.eventCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(manufacturer)/twins/[id]',
                  params: { id: item.twin_id },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.typePill}>
                  <Text style={[typography.captionBold, styles.typeText]}>
                    {item.event_type.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {formatDateTime(item.created_at)}
                </Text>
              </View>

              <View style={styles.serialRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Serial:
                </Text>
                <Text style={[typography.code, { color: colors.role.MANUFACTURER_LIGHT }]}>
                  {item.serial_number}
                </Text>
              </View>

              <Text style={[typography.body, styles.notes]}>{item.notes}</Text>

              <View style={styles.footerRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  By {item.actor?.display} ({item.actor?.role})
                </Text>
                <View style={styles.hashChip}>
                  <Ionicons name="lock-closed" size={11} color={colors.success} />
                  <Text style={[typography.code, styles.hashText]}>
                    {formatShortHash(item.event_hash)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    marginBottom: spacing.base,
  },
  filterChip: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  eventCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typePill: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: borderRadius.xs,
  },
  typeText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  serialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: 4,
  },
  notes: {
    color: colors.text,
    fontSize: 13,
    marginTop: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  hashChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
  },
  hashText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
