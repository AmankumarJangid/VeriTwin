import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { SpecList } from '../../../src/components/SpecList';
import { Timeline } from '../../../src/components/Timeline';
import { Button } from '../../../src/components/Button';
import { consumerApi } from '../../../src/api/consumer';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatCurrency, formatDateTime } from '../../../src/utils/format';

export default function ConsumerVaultItemDetailScreen() {
  const { twinId } = useLocalSearchParams<{ twinId: string }>();
  const router = useRouter();

  const { data: twin, isLoading, refetch } = useQuery({
    queryKey: ['consumer-vault-item', twinId],
    queryFn: () => consumerApi.getVaultItem(twinId),
  });

  return (
    <Screen
      scrollable
      title={twin?.product.name || 'Vault Asset'}
      subtitle={twin?.serial_number}
      roleAccent={colors.role.CONSUMER}
      onRefresh={refetch}
      refreshing={isLoading}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      {isLoading || !twin ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.CONSUMER} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Item Card */}
          <View style={styles.card}>
            <View style={styles.topRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, { color: colors.role.CONSUMER_LIGHT }]}>
                  {twin.product.brand.toUpperCase()}
                </Text>
                <Text style={[typography.h2, styles.title]}>{twin.product.name}</Text>
                <Text style={[typography.code, styles.serialText]}>{twin.serial_number}</Text>
              </View>
              <StatusBadge status={twin.status} />
            </View>

            <View style={styles.priceRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                VALUATION (MRP)
              </Text>
              <Text style={[typography.h2, { color: colors.success }]}>
                {formatCurrency(twin.product.mrp)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Material:</Text>
              <Text style={[typography.body, { color: colors.text }]}>{twin.product.material}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                Registered Since:
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {formatDateTime(twin.claimed_at)}
              </Text>
            </View>
          </View>

          {/* Primary CTA: P2P Transfer */}
          <Button
            title="Sell or Transfer Ownership (P2P Handover)"
            onPress={() =>
              router.push({
                pathname: '/(consumer)/transfer/[twinId]',
                params: { twinId: twin.twin_id },
              })
            }
            roleColor={colors.role.CONSUMER}
            size="lg"
            leftIcon={<Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />}
            style={{ marginBottom: spacing.base }}
          />

          {/* Product Specifications */}
          <Text style={[typography.captionBold, styles.sectionHeader]}>
            TECHNICAL SPECIFICATIONS
          </Text>
          <SpecList specs={twin.product.specs} />

          {/* Read-Only Masked Timeline (§6.4) */}
          <Text style={[typography.captionBold, styles.sectionHeader]}>
            IMMUTABLE PROVENANCE TIMELINE
          </Text>
          <Timeline events={twin.timeline} />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
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
    marginBottom: spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: colors.text,
    marginTop: 2,
  },
  serialText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  sectionHeader: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
});
