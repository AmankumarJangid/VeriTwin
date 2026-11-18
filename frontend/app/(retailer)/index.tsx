import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { retailerApi } from '../../src/api/retailer';
import { RetailerInventoryItem } from '../../src/types/api';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { formatCurrency, formatRelativeDate } from '../../src/utils/format';

export default function RetailerInventoryScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'IN_TRANSIT' | 'IN_RETAIL'>('IN_RETAIL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['retailer-inventory', activeTab],
    queryFn: () => retailerApi.getInventory({ status: activeTab }),
  });

  const twins: RetailerInventoryItem[] = data?.data?.twins || [];
  const counts = data?.data?.counts || { IN_TRANSIT: 0, IN_RETAIL: 0 };

  const handleReceive = async (twinId: string) => {
    setActionLoadingId(twinId);
    try {
      await retailerApi.appendEvent(twinId, {
        event_type: 'RECEIVED_AT_RETAIL',
        notes: 'Tamper seal intact. Received and registered into store inventory.',
        metadata: { condition: 'OK' },
      });
      refetch();
      Alert.alert('Stock Received', 'Unit is now registered in your active store inventory.');
    } catch (err: any) {
      Alert.alert('Receive Failed', err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <Screen
      title="Store Inventory"
      subtitle="TimeHouse Retail Authorized Stock"
      roleAccent={colors.role.RETAILER}
      onRefresh={refetch}
      refreshing={isLoading}
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(retailer)/scan')}
          style={styles.scanHeaderBtn}
        >
          <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      }
    >
      {/* Segmented Control (§6.3) */}
      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'IN_RETAIL' && styles.segmentTabActive]}
          onPress={() => setActiveTab('IN_RETAIL')}
        >
          <Text
            style={[
              typography.captionBold,
              styles.segmentText,
              activeTab === 'IN_RETAIL' && styles.segmentTextActive,
            ]}
          >
            In Store ({counts.IN_RETAIL})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentTab, activeTab === 'IN_TRANSIT' && styles.segmentTabActive]}
          onPress={() => setActiveTab('IN_TRANSIT')}
        >
          <Text
            style={[
              typography.captionBold,
              styles.segmentText,
              activeTab === 'IN_TRANSIT' && styles.segmentTextActive,
            ]}
          >
            Incoming Dispatch ({counts.IN_TRANSIT})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inventory List */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.RETAILER} />
        </View>
      ) : twins.length === 0 ? (
        <EmptyState
          icon={activeTab === 'IN_TRANSIT' ? 'airplane-outline' : 'cube-outline'}
          title={activeTab === 'IN_TRANSIT' ? 'No Dispatches in Transit' : 'No Store Inventory'}
          description={
            activeTab === 'IN_TRANSIT'
              ? 'Units dispatched from the manufacturer will appear here for verification and receipt.'
              : 'Scan incoming units or receive dispatches to stock luxury units for sale.'
          }
        />
      ) : (
        <FlatList
          data={twins}
          keyExtractor={(item) => item.twin_id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, styles.prodName]}>{item.product.name}</Text>
                  <Text style={[typography.code, styles.serialText]}>{item.serial_number}</Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>

              <View style={styles.infoRow}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  SKU: {item.product.sku}
                </Text>
                <Text style={[typography.h3, { color: colors.success }]}>
                  {formatCurrency(item.product.mrp)}
                </Text>
              </View>

              <View style={styles.actionRow}>
                {item.status === 'IN_TRANSIT' ? (
                  <Button
                    title="Mark Received"
                    onPress={() => handleReceive(item.twin_id)}
                    loading={actionLoadingId === item.twin_id}
                    variant="primary"
                    roleColor={colors.role.RETAILER}
                    size="sm"
                    style={{ flex: 1 }}
                    leftIcon={<Ionicons name="checkbox-outline" size={16} color="#FFFFFF" />}
                  />
                ) : (
                  <Button
                    title="Sell Unit (POS)"
                    onPress={() =>
                      router.push({
                        pathname: '/(retailer)/sell/[twinId]',
                        params: { twinId: item.twin_id },
                      })
                    }
                    variant="primary"
                    roleColor={colors.role.RETAILER}
                    size="sm"
                    style={{ flex: 1 }}
                    leftIcon={<Ionicons name="card-outline" size={16} color="#FFFFFF" />}
                  />
                )}
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanHeaderBtn: {
    backgroundColor: colors.role.RETAILER,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.base,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  segmentTabActive: {
    backgroundColor: colors.role.RETAILER,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  actionRow: {
    marginTop: spacing.md,
  },
});
