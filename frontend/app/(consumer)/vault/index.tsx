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
import { consumerApi } from '../../../src/api/consumer';
import { ConsumerVaultItem } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatCurrency, formatDateTime } from '../../../src/utils/format';

export default function ConsumerVaultScreen() {
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['consumer-vault'],
    queryFn: () => consumerApi.getVault(),
  });

  const items: ConsumerVaultItem[] = data?.data?.items || [];

  return (
    <Screen
      title="My Luxury Vault"
      subtitle="Cryptographically verified authentic possessions"
      roleAccent={colors.role.CONSUMER}
      onRefresh={refetch}
      refreshing={isLoading}
    >
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.CONSUMER} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title="Your Vault is Empty"
          description="Scan and purchase products from authorized retailers or claim a transfer from another collector."
          actionTitle="Scan Product to Verify"
          onAction={() => router.push('/(consumer)')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.twin_id}
          refreshing={isLoading}
          onRefresh={refetch}
          contentContainerStyle={{ paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                router.push({
                  pathname: '/(consumer)/vault/[twinId]',
                  params: { twinId: item.twin_id },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.captionBold, { color: colors.role.CONSUMER_LIGHT }]}>
                    {item.product.brand.toUpperCase()}
                  </Text>
                  <Text style={[typography.h3, styles.prodName]}>{item.product.name}</Text>
                  <Text style={[typography.code, styles.serialText]}>{item.serial_number}</Text>
                </View>

                {item.has_active_transfer && (
                  <View style={styles.transferBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.warning} />
                    <Text style={[typography.captionBold, { color: colors.warning, fontSize: 10 }]}>
                      TRANSFER PENDING
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardFooter}>
                <View>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Acquired via {item.acquired_via === 'RESOLD' ? 'P2P Handover' : 'Authorized Retail'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {formatDateTime(item.acquired_at)}
                  </Text>
                </View>

                <View style={styles.arrowRow}>
                  <Text style={[typography.h3, { color: colors.success }]}>
                    {formatCurrency(item.product.mrp)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prodName: {
    color: colors.text,
    marginTop: 2,
  },
  serialText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  transferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: spacing.md,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
