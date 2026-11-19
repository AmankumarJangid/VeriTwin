// Manufacturer Products Master List
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { getProductsApi } from '../../../src/api/manufacturer';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function ManufacturerProductsIndex() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerProducts', search],
    queryFn: () => getProductsApi({ q: search || undefined }),
  });

  const products = data?.products || [];

  return (
    <Screen
      title="Product Master Catalog"
      subtitle="Luxury product SKUs, specs & MRP registered on VeriTwin"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
      bottomBar={
        <Button
          title="Create New Product Master"
          onPress={() => router.push('/(manufacturer)/products/new' as any)}
          variant="primary"
          icon={<Ionicons name="add" size={18} color={colors.onPrimary} />}
        />
      }
    >
      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.inkMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by SKU, model, or brand…"
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

      {products.length === 0 ? (
        <EmptyState
          icon="pricetag-outline"
          title="No Products Registered"
          description="Create your first master product definition with specifications and MSRP."
          actionTitle="Create Product"
          onAction={() => router.push('/(manufacturer)/products/new' as any)}
        />
      ) : (
        <View style={styles.list}>
          {products.map((p) => (
            <TouchableOpacity
              key={p.product_id}
              style={styles.card}
              onPress={() => router.push(`/(manufacturer)/products/${p.product_id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryText}>{p.category}</Text>
                </View>
                <Text style={styles.priceText}>{formatCurrency(p.mrp)}</Text>
              </View>

              <Text style={styles.brandText}>{p.brand}</Text>
              <Text style={styles.nameText}>{p.name}</Text>
              <Text style={styles.skuText}>SKU: {p.sku}</Text>
              <Text style={styles.descText} numberOfLines={2}>
                {p.description}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={styles.dateText}>Registered {formatDate(p.created_at)}</Text>
                <View style={styles.arrowRow}>
                  <Text style={styles.actionLink}>View Master Specs</Text>
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
    marginBottom: spacing.md,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.ink,
  },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryPill: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.ink,
  },
  priceText: {
    ...typography.headline,
    fontSize: 16,
    color: colors.finOrange,
  },
  brandText: {
    ...typography.caption,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  nameText: {
    ...typography.cardTitle,
    fontSize: 16,
    marginTop: 1,
  },
  skuText: {
    ...typography.mono,
    fontSize: 11,
    color: colors.inkSubtle,
    marginTop: 2,
  },
  descText: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginVertical: 6,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  dateText: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionLink: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.finOrange,
  },
});
