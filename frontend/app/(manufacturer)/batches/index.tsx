import React from 'react';
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
import { EmptyState } from '../../../src/components/EmptyState';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { Batch } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';

export default function BatchesScreen() {
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['manufacturer-batches'],
    queryFn: () => manufacturerApi.getBatches(),
  });

  const batches: Batch[] = data?.data?.batches || [];

  return (
    <Screen
      title="Production Batches"
      subtitle="Factory lot registers & planned volumes"
      roleAccent={colors.role.MANUFACTURER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(manufacturer)/batches/new')}
          style={styles.fabHeader}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      }
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : batches.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          title="No Batches Found"
          description="Register a production run batch to track unit quantities and factory locations."
          actionTitle="Register Batch"
          onAction={() => router.push('/(manufacturer)/batches/new')}
        />
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item.batch_id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <View style={styles.batchCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[typography.h3, styles.batchNo]}>{item.batch_no}</Text>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    Location: {item.factory_location}
                  </Text>
                </View>
                <View style={styles.qtyBadge}>
                  <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                    {item.twins_count ?? 0} / {item.planned_quantity} Twins
                  </Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Manufactured: {item.manufactured_on}
                </Text>
                {item.notes ? (
                  <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>
            </View>
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
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  batchCard: {
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
    alignItems: 'flex-start',
  },
  batchNo: {
    color: colors.text,
    fontFamily: 'monospace',
  },
  qtyBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  footerRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
