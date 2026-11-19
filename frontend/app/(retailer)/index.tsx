// Retailer Inventory Screen
// Spec reference: 02_FRONTEND.md §6.3
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { getRetailerInventoryApi, appendRetailerEventApi } from '../../src/api/retailer';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function RetailerInventoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<'IN_TRANSIT' | 'IN_RETAIL'>('IN_RETAIL');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['retailerInventory', selectedTab],
    queryFn: () => getRetailerInventoryApi({ status: selectedTab }),
  });

  const twins = data?.twins || [];
  const counts = data?.counts || { IN_TRANSIT: 0, IN_RETAIL: 0 };

  const handleReceive = async (twinId: string) => {
    try {
      setIsProcessing(twinId);
      await appendRetailerEventApi(twinId, {
        event_type: 'RECEIVED_AT_RETAIL',
        notes: 'Received and verified in store inventory.',
      });
      Alert.alert('Stock Accepted', 'Product marked as IN_RETAIL.');
      queryClient.invalidateQueries({ queryKey: ['retailerInventory'] });
    } catch (err: any) {
      Alert.alert('Receive Failed', err.message || 'Could not receive stock.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <Screen
      title="Store Inventory"
      subtitle="Track incoming factory shipments and showroom stock"
      roleBadge={{ text: 'Retailer', color: colors.roleRetailer }}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {/* Segmented Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segment, selectedTab === 'IN_RETAIL' && styles.segmentActive]}
          onPress={() => setSelectedTab('IN_RETAIL')}
        >
          <Text style={[styles.segmentText, selectedTab === 'IN_RETAIL' && styles.segmentTextActive]}>
            In Store
          </Text>
          <View style={[styles.badge, selectedTab === 'IN_RETAIL' && styles.badgeActive]}>
            <Text style={[styles.badgeText, selectedTab === 'IN_RETAIL' && styles.badgeTextActive]}>
              {counts.IN_RETAIL}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segment, selectedTab === 'IN_TRANSIT' && styles.segmentActive]}
          onPress={() => setSelectedTab('IN_TRANSIT')}
        >
          <Text style={[styles.segmentText, selectedTab === 'IN_TRANSIT' && styles.segmentTextActive]}>
            Incoming Shipments
          </Text>
          <View style={[styles.badge, selectedTab === 'IN_TRANSIT' && styles.badgeActive]}>
            <Text style={[styles.badgeText, selectedTab === 'IN_TRANSIT' && styles.badgeTextActive]}>
              {counts.IN_TRANSIT}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stock List */}
      {twins.length === 0 ? (
        <EmptyState
          icon={selectedTab === 'IN_TRANSIT' ? 'airplane-outline' : 'cube-outline'}
          title={selectedTab === 'IN_TRANSIT' ? 'No Shipments In Transit' : 'No Store Inventory'}
          description={
            selectedTab === 'IN_TRANSIT'
              ? 'There are currently no factory dispatches routed to your store.'
              : 'You have no verified units in your showroom stock right now.'
          }
        />
      ) : (
        <View style={styles.list}>
          {twins.map((item) => (
            <View key={item.twin_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <Text style={styles.skuText}>SKU: {item.product.sku}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.metaBox}>
                <View>
                  <Text style={styles.metaLabel}>Serial Number</Text>
                  <Text style={styles.metaVal}>{item.serial_number}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.metaLabel}>Retail Price</Text>
                  <Text style={styles.price}>{formatCurrency(item.product.mrp)}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.footerDate}>
                  {item.status === 'IN_TRANSIT'
                    ? `Dispatched: ${item.dispatched_at ? formatDate(item.dispatched_at) : 'Recent'}`
                    : `Received: ${item.received_at ? formatDate(item.received_at) : 'Active'}`}
                </Text>

                {item.status === 'IN_TRANSIT' ? (
                  <Button
                    title="Mark Received"
                    onPress={() => handleReceive(item.twin_id)}
                    loading={isProcessing === item.twin_id}
                    variant="primary"
                    style={styles.actionBtn}
                  />
                ) : (
                  <Button
                    title="Execute Sale (POS)"
                    onPress={() => router.push(`/(retailer)/sell/${item.twin_id}` as any)}
                    variant="fin"
                    icon={<Ionicons name="bag-handle-outline" size={14} color={colors.onPrimary} />}
                    style={styles.actionBtn}
                  />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    padding: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.pill,
    gap: 8,
  },
  segmentActive: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    ...typography.button,
    fontSize: 13,
    color: colors.ink,
  },
  segmentTextActive: {
    color: colors.onPrimary,
  },
  badge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  badgeActive: {
    backgroundColor: colors.finOrange,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
  badgeTextActive: {
    color: colors.onPrimary,
  },
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
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  productName: {
    ...typography.cardTitle,
    fontSize: 16,
  },
  skuText: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 1,
  },
  metaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    marginVertical: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  metaVal: {
    ...typography.mono,
    fontSize: 11,
    color: colors.ink,
    marginTop: 2,
  },
  price: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  footerDate: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
  actionBtn: {
    height: 36,
    paddingHorizontal: 14,
  },
});
