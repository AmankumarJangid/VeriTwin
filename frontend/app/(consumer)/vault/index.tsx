// Consumer Vault List
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { EmptyState } from '../../../src/components/EmptyState';
import { getConsumerVaultApi } from '../../../src/api/consumer';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function VaultIndexScreen() {
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['consumerVaultList'],
    queryFn: () => getConsumerVaultApi(),
  });

  const items = data?.items || [];

  return (
    <Screen
      title="My Digital Vault"
      subtitle="Cryptographic proof of luxury product ownership"
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {items.length === 0 ? (
        <EmptyState
          icon="shield-outline"
          title="Vault Empty"
          description="You currently hold no digital twins. Purchase an authentic item or claim via P2P transfer."
          actionTitle="Verify Product"
          onAction={() => router.push('/(consumer)')}
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.twin_id}
              style={styles.card}
              onPress={() => router.push(`/(consumer)/vault/${item.twin_id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.brand}>{item.product.brand}</Text>
                <View style={styles.genuineBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={colors.verdictGenuine} />
                  <Text style={styles.genuineText}>VERIFIED</Text>
                </View>
              </View>

              <Text style={styles.name}>{item.product.name}</Text>

              <View style={styles.row}>
                <View>
                  <Text style={styles.label}>Serial Number</Text>
                  <Text style={styles.val}>{item.serial_number}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.label}>Retail MRP</Text>
                  <Text style={styles.price}>{formatCurrency(item.product.mrp)}</Text>
                </View>
              </View>

              <View style={styles.footer}>
                <Text style={styles.date}>Acquired {formatDate(item.acquired_at)}</Text>
                <View style={styles.viewLink}>
                  <Text style={styles.viewLinkText}>View Certificate</Text>
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
    marginBottom: 4,
  },
  brand: {
    ...typography.caption,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  genuineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.verdictGenuineBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  genuineText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.verdictGenuine,
  },
  name: {
    ...typography.cardTitle,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    padding: 10,
    borderRadius: radii.md,
    marginBottom: 8,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  val: {
    ...typography.mono,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  price: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
  viewLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.finOrange,
  },
});
