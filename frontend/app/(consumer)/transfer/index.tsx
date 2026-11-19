// P2P Transfer Hub Screen
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { getConsumerVaultApi } from '../../../src/api/consumer';
import { formatCurrency } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function TransferIndexScreen() {
  const router = useRouter();

  const { data: vaultData } = useQuery({
    queryKey: ['consumerVault'],
    queryFn: () => getConsumerVaultApi(),
  });

  const ownedItems = vaultData?.items || [];

  return (
    <Screen
      title="Peer-to-Peer Transfer"
      subtitle="Encrypted handshakes between buyers & sellers"
    >
      {/* 1. Receive / Claim Action Card */}
      <View style={styles.cardFeatured}>
        <View style={styles.cardFeaturedIcon}>
          <Ionicons name="qr-code" size={28} color={colors.onPrimary} />
        </View>
        <Text style={styles.cardFeaturedTitle}>Receiving a Luxury Product?</Text>
        <Text style={styles.cardFeaturedDesc}>
          Scan the seller's single-use 120-second dynamic transfer QR to claim certificate ownership.
        </Text>
        <Button
          title="Scan Transfer QR as Buyer"
          onPress={() => router.push('/(consumer)/transfer/claim' as any)}
          variant="fin"
          icon={<Ionicons name="scan-outline" size={18} color={colors.onPrimary} />}
          style={{ width: '100%', marginTop: spacing.md }}
        />
      </View>

      {/* 2. Send / Transfer an Owned Item */}
      <Text style={styles.sectionTitle}>Sell or Transfer Your Items</Text>
      <Text style={styles.sectionSub}>Select an item from your vault to generate a transfer QR</Text>

      {ownedItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>You don't have any items in your vault to transfer.</Text>
        </View>
      ) : (
        <View style={styles.itemsList}>
          {ownedItems.map((item) => (
            <TouchableOpacity
              key={item.twin_id}
              style={styles.itemCard}
              onPress={() => router.push(`/(consumer)/transfer/${item.twin_id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemBrand}>{item.product.brand}</Text>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemSerial}>Serial: {item.serial_number}</Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemPrice}>{formatCurrency(item.product.mrp)}</Text>
                <View style={styles.transferPill}>
                  <Text style={styles.transferPillText}>Transfer</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.finOrange} />
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
  cardFeatured: {
    backgroundColor: colors.ink,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardFeaturedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.finOrange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  cardFeaturedTitle: {
    ...typography.headline,
    color: colors.onPrimary,
    fontSize: 18,
    textAlign: 'center',
  },
  cardFeaturedDesc: {
    ...typography.bodySm,
    color: colors.hairline,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  sectionTitle: {
    ...typography.headline,
    fontSize: 17,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  emptyBox: {
    backgroundColor: colors.surface1,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.inkMuted,
  },
  itemsList: {
    gap: 10,
    marginBottom: spacing.xl,
  },
  itemCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemBrand: {
    ...typography.caption,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  itemName: {
    ...typography.cardTitle,
    fontSize: 15,
    marginTop: 1,
  },
  itemSerial: {
    ...typography.mono,
    fontSize: 11,
    color: colors.inkSubtle,
    marginTop: 2,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemPrice: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
  },
  transferPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.finOrangeLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  transferPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.finOrange,
  },
});
