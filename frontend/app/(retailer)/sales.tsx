// Retailer Sales History Log
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { getRetailerSalesApi } from '../../src/api/retailer';
import { formatCurrency, formatDateTime } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function RetailerSalesScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retailerSales'],
    queryFn: () => getRetailerSalesApi(),
  });

  const sales = data?.sales || [];

  return (
    <Screen
      title="POS Sales Ledger"
      subtitle="Complete audit record of retail handovers executed by your store"
      roleBadge={{ text: 'Retailer', color: colors.roleRetailer }}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {sales.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title="No Sales Recorded"
          description="Units sold and handed over to consumers will appear in this immutable transaction register."
        />
      ) : (
        <View style={styles.list}>
          {sales.map((sale, idx) => (
            <View key={sale.twin_id + idx} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.productName}>{sale.product_name}</Text>
                <Text style={styles.price}>{formatCurrency(sale.sale_price)}</Text>
              </View>

              <View style={styles.grid}>
                <View>
                  <Text style={styles.label}>Buyer</Text>
                  <Text style={styles.val}>{sale.consumer_name}</Text>
                </View>
                <View>
                  <Text style={styles.label}>Invoice</Text>
                  <Text style={styles.val}>{sale.invoice_no}</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.serial}>Serial: {sale.serial_number}</Text>
                <Text style={styles.date}>{formatDateTime(sale.sold_at)}</Text>
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
    marginBottom: spacing.xs,
  },
  productName: {
    ...typography.cardTitle,
    fontSize: 16,
  },
  price: {
    ...typography.headline,
    fontSize: 16,
    color: colors.finOrange,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    marginVertical: 6,
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
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  serial: {
    ...typography.mono,
    fontSize: 11,
    color: colors.inkMuted,
  },
  date: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
});
