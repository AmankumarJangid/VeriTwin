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
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { EmptyState } from '../../../src/components/EmptyState';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { TwinStatus, ManufacturerTwinListItem } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatRelativeDate } from '../../../src/utils/format';

const STATUS_FILTERS: Array<TwinStatus | 'ALL'> = [
  'ALL',
  'MANUFACTURED',
  'QA_PASSED',
  'IN_TRANSIT',
  'IN_RETAIL',
  'SOLD',
];

export default function ManufacturerTwinsListScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<TwinStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mfg-twins-list', selectedStatus, searchQuery],
    queryFn: () =>
      manufacturerApi.getTwins({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        q: searchQuery || undefined,
      }),
  });

  const twins: ManufacturerTwinListItem[] = data?.data?.twins || [];

  return (
    <Screen
      title="Digital Twins"
      subtitle="Immutable registry of all product units"
      roleAccent={colors.role.MANUFACTURER}
      onRefresh={refetch}
      refreshing={isLoading}
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(manufacturer)/twins/create')}
          style={styles.fabHeader}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      }
    >
      {/* Search Input */}
      <FormField
        label="SEARCH REGISTRY"
        placeholder="Filter by serial (VT-WCH...) or name"
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={<Ionicons name="search-outline" size={18} color={colors.textSecondary} />}
        containerStyle={{ marginBottom: spacing.xs }}
      />

      {/* Status Filter Chips */}
      <View style={styles.statusFiltersRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.statusChip,
                selectedStatus === item && styles.statusChipActive,
              ]}
              onPress={() => setSelectedStatus(item)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.statusChipText,
                  selectedStatus === item && styles.statusChipTextActive,
                ]}
              >
                {item.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Twins List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : twins.length === 0 ? (
        <EmptyState
          icon="hardware-chip-outline"
          title="No Digital Twins Found"
          description="Mint digital twins to embed imperceptible watermarks and register them on the hash chain."
          actionTitle="Create Digital Twins"
          onAction={() => router.push('/(manufacturer)/twins/create')}
        />
      ) : (
        <FlatList
          data={twins}
          keyExtractor={(item) => item.twin_id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.twinCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(manufacturer)/twins/[id]',
                  params: { id: item.twin_id },
                })
              }
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, styles.serialText]}>{item.serial_number}</Text>
                  <Text style={[typography.body, styles.prodName]}>{item.product.name}</Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>

              <View style={styles.cardDetails}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Lot: {item.batch_no}
                </Text>
                {item.current_retailer_name && (
                  <Text style={[typography.caption, { color: colors.role.RETAILER_LIGHT }]}>
                    Retailer: {item.current_retailer_name}
                  </Text>
                )}
                {item.owner_name && (
                  <Text style={[typography.caption, { color: colors.role.CONSUMER_LIGHT }]}>
                    Owner: {item.owner_name}
                  </Text>
                )}
              </View>

              <View style={styles.cardFooter}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Minted {formatRelativeDate(item.created_at)}
                </Text>
                <View style={styles.arrowRow}>
                  <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                    View Hash Chain
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.role.MANUFACTURER_LIGHT} />
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
  fabHeader: {
    backgroundColor: colors.role.MANUFACTURER,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusFiltersRow: {
    marginVertical: spacing.sm,
  },
  statusChip: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.xs,
  },
  statusChipActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  statusChipText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  twinCard: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serialText: {
    color: colors.text,
    fontFamily: 'monospace',
  },
  prodName: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDetails: {
    marginTop: spacing.sm,
    gap: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
