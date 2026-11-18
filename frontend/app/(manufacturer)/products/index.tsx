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
import { EmptyState } from '../../../src/components/EmptyState';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { ProductCategory, Product } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatCurrency } from '../../../src/utils/format';

const CATEGORIES: Array<ProductCategory | 'ALL'> = [
  'ALL',
  'WATCH',
  'APPAREL',
  'FOOTWEAR',
  'ACCESSORY',
  'OTHER',
];

export default function ManufacturerProductsScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['manufacturer-products', selectedCategory, searchQuery],
    queryFn: () =>
      manufacturerApi.getProducts({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        q: searchQuery || undefined,
      }),
  });

  const products: Product[] = data?.data?.products || [];

  return (
    <Screen
      title="Product Master"
      subtitle="Authorized brand SKU catalog"
      roleAccent={colors.role.MANUFACTURER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(manufacturer)/products/new')}
          style={styles.fabHeader}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      }
    >
      {/* Search Input */}
      <FormField
        label="SEARCH CATALOG"
        placeholder="Search by SKU, product name..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        leftIcon={<Ionicons name="search-outline" size={18} color={colors.textSecondary} />}
        containerStyle={{ marginBottom: spacing.sm }}
      />

      {/* Category Filter Chips (§6.2) */}
      <View style={styles.categoriesRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(item)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.categoryChipText,
                  selectedCategory === item && styles.categoryChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Product List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          icon="pricetags-outline"
          title="No Products Found"
          description="Create your first luxury product SKU master to begin issuing Digital Twins."
          actionTitle="Create Product SKU"
          onAction={() => router.push('/(manufacturer)/products/new')}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.product_id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.productCard}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(manufacturer)/products/[id]',
                  params: { id: item.product_id },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                    {item.brand} • {item.category}
                  </Text>
                  <Text style={[typography.h3, styles.prodName]}>{item.name}</Text>
                  <Text style={[typography.code, styles.skuCode]}>SKU: {item.sku}</Text>
                </View>
                <Text style={[typography.h3, { color: colors.success }]}>
                  {formatCurrency(item.mrp)}
                </Text>
              </View>

              <Text style={[typography.body, styles.materialText]} numberOfLines={1}>
                {item.material}
              </Text>
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
  categoriesRow: {
    marginBottom: spacing.base,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  categoryChipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  productCard: {
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
  prodName: {
    color: colors.text,
    marginTop: 2,
  },
  skuCode: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  materialText: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
