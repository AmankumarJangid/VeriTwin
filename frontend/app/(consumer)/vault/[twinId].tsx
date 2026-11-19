// Consumer Vault Item Detail Screen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { SpecList } from '../../../src/components/SpecList';
import { Timeline } from '../../../src/components/Timeline';
import { Button } from '../../../src/components/Button';
import { getConsumerVaultItemApi } from '../../../src/api/consumer';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function VaultItemDetailScreen() {
  const { twinId } = useLocalSearchParams<{ twinId: string }>();
  const router = useRouter();

  const { data: twin, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['vaultItem', twinId],
    queryFn: () => getConsumerVaultItemApi(twinId!),
    enabled: !!twinId,
  });

  if (isLoading || !twin) {
    return (
      <Screen title="Loading Certificate…">
        <Text style={styles.loadingText}>Fetching cryptographic twin record…</Text>
      </Screen>
    );
  }

  const handleStartTransfer = () => {
    router.push(`/(consumer)/transfer/${twin.twin_id}` as any);
  };

  return (
    <Screen
      title="Digital Certificate"
      subtitle="Proof of Authenticity & Ownership"
      refreshing={isRefetching}
      onRefresh={refetch}
      headerRight={
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
      bottomBar={
        <Button
          title="Sell / Transfer to Another Person"
          onPress={handleStartTransfer}
          variant="fin"
          icon={<Ionicons name="swap-horizontal" size={18} color={colors.onPrimary} />}
        />
      }
    >
      {/* Product Summary Tile */}
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <Text style={styles.brand}>{twin.product.brand}</Text>
          <StatusBadge status={twin.status} />
        </View>

        <Text style={styles.title}>{twin.product.name}</Text>
        <Text style={styles.desc}>{twin.product.description}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Serial Number</Text>
            <Text style={styles.metaVal}>{twin.serial_number}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Retail Value</Text>
            <Text style={styles.metaPrice}>{formatCurrency(twin.product.mrp)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Material Composition</Text>
            <Text style={styles.metaVal}>{twin.product.material}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Factory Batch</Text>
            <Text style={styles.metaVal}>{twin.batch?.batch_no || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {/* Dynamic Specs */}
      {twin.product.specs && <SpecList specs={twin.product.specs} />}

      {/* Read-Only Masked Timeline */}
      <Timeline events={twin.timeline} />
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
  backBtn: {
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
    marginBottom: spacing.sm,
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
  title: {
    ...typography.headline,
    fontSize: 20,
    marginTop: 2,
  },
  desc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginVertical: 6,
    lineHeight: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 12,
    marginTop: spacing.sm,
  },
  metaCol: {
    width: '47%',
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
  metaPrice: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
});
