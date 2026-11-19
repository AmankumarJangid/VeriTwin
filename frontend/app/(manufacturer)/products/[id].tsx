// Product Master Detail Screen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { SpecList } from '../../../src/components/SpecList';
import { Button } from '../../../src/components/Button';
import { getProductApi } from '../../../src/api/manufacturer';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerProduct', id],
    queryFn: () => getProductApi(id!),
    enabled: !!id,
  });

  const product = data?.product;
  const stats = data?.stats || { twins_total: 24, sold: 6, in_retail: 10 };

  if (isLoading || !product) {
    return (
      <Screen title="Loading Product…">
        <Text style={styles.loadingText}>Fetching product master data…</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Product Master"
      subtitle={`SKU: ${product.sku}`}
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
      bottomBar={
        <Button
          title="Mint Twins for this Product"
          onPress={() => router.push('/(manufacturer)/twins/create' as any)}
          variant="fin"
          icon={<Ionicons name="sparkles" size={18} color={colors.onPrimary} />}
        />
      }
    >
      {/* Product Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.brand}>{product.brand}</Text>
          <View style={styles.catPill}>
            <Text style={styles.catText}>{product.category}</Text>
          </View>
        </View>

        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.desc}>{product.description}</Text>

        <View style={styles.metaBox}>
          <View>
            <Text style={styles.label}>Retail MRP</Text>
            <Text style={styles.price}>{formatCurrency(product.mrp)}</Text>
          </View>
          <View>
            <Text style={styles.label}>Material</Text>
            <Text style={styles.val}>{product.material}</Text>
          </View>
        </View>
      </View>

      {/* Production & Inventory Stats */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Production & Channel Distribution</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statNum}>{stats.twins_total}</Text>
            <Text style={styles.statLabel}>Total Minted</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.roleRetailer }]}>{stats.in_retail}</Text>
            <Text style={styles.statLabel}>In Retail</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.verdictGenuine }]}>{stats.sold}</Text>
            <Text style={styles.statLabel}>Sold to Consumers</Text>
          </View>
        </View>
      </View>

      {/* Specifications */}
      {product.specs && <SpecList specs={product.specs} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    ...typography.body,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  brand: {
    ...typography.caption,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  catPill: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  catText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.ink,
  },
  name: {
    ...typography.headline,
    fontSize: 18,
    marginTop: 2,
  },
  desc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginVertical: 6,
    lineHeight: 18,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    marginTop: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  price: {
    ...typography.headline,
    fontSize: 16,
    color: colors.finOrange,
    marginTop: 2,
  },
  val: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statsTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
  },
  statCol: {
    alignItems: 'center',
  },
  statNum: {
    ...typography.displayMd,
    fontSize: 22,
    color: colors.ink,
  },
  statLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
