import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { retailerApi } from '../../src/api/retailer';
import { RetailerSaleHistoryItem } from '../../src/types/api';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { formatCurrency, formatDateTime } from '../../src/utils/format';

export default function RetailerSalesHistoryScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['retailer-sales-history'],
    queryFn: () => retailerApi.getSalesHistory(),
  });

  const sales: RetailerSaleHistoryItem[] = data?.data?.sales || [];

  return (
    <Screen
      title="Sales Registry"
      subtitle="First-hand retail POS handover records"
      roleAccent={colors.role.RETAILER}
      onRefresh={refetch}
      refreshing={isLoading}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.RETAILER} />
        </View>
      ) : sales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No Sales Recorded"
          description="Handover transactions registered from the POS flow will appear here."
        />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(item, index) => `${item.twin_id}-${index}`}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, styles.prodName]}>{item.product_name}</Text>
                  <Text style={[typography.code, styles.serialText]}>{item.serial_number}</Text>
                </View>
                <Text style={[typography.h3, { color: colors.success }]}>
                  {formatCurrency(item.sale_price)}
                </Text>
              </View>

              <View style={styles.detailsRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Buyer: <Text style={{ color: colors.text }}>{item.consumer_name}</Text>
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Invoice: <Text style={{ color: colors.text }}>{item.invoice_no}</Text>
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Sold on {formatDateTime(item.sold_at)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
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
  prodName: {
    color: colors.text,
  },
  serialText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  cardFooter: {
    marginTop: spacing.xs,
  },
});
