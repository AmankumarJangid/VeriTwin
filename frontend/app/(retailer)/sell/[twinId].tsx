// Retailer POS Sell Handover Screen
// Spec reference: 02_FRONTEND.md §6.3 & 00_SHARED_CONTRACT.md §7.3
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { lookupConsumerApi, sellTwinApi, getRetailerInventoryApi } from '../../../src/api/retailer';
import { ConsumerLookupResult } from '../../../src/types/api';
import { formatCurrency } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function RetailerSellScreen() {
  const { twinId } = useLocalSearchParams<{ twinId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Find twin from cache or load inventory
  const { data: invData } = useQuery({
    queryKey: ['retailerInventory', 'IN_RETAIL'],
    queryFn: () => getRetailerInventoryApi({ status: 'IN_RETAIL' }),
  });

  const twin = invData?.twins.find((t) => t.twin_id === twinId) || {
    twin_id: twinId,
    serial_number: 'VT-WCH-2026-000123',
    status: 'IN_RETAIL' as const,
    product: {
      name: 'Chrono Classic 42',
      sku: 'WCH-CHR-001',
      mrp: 24999.0,
    },
    dispatched_at: null,
    received_at: null,
  };

  const [consumerEmail, setConsumerEmail] = useState('riya@veritwin.dev');
  const [consumer, setConsumer] = useState<ConsumerLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [salePrice, setSalePrice] = useState(String(twin.product.mrp || 24999));
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-4)}`);
  const [notes, setNotes] = useState('Warranty booklet and certificate handed to buyer.');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<any | null>(null);

  const handleLookup = async () => {
    if (!consumerEmail.trim()) {
      Alert.alert('Required', 'Please enter consumer email.');
      return;
    }

    try {
      setIsLookingUp(true);
      const res = await lookupConsumerApi(consumerEmail.trim());
      setConsumer(res);
    } catch (err: any) {
      Alert.alert('Consumer Not Found', err.message || 'No registered consumer found with that email.');
      setConsumer(null);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleConfirmSale = () => {
    if (!consumer) {
      Alert.alert('Consumer Required', 'Please look up and verify the buyer before handover.');
      return;
    }

    Alert.alert(
      'Confirm First-Hand Sale',
      `Execute sale of ${twin.product.name} (Serial: ${twin.serial_number}) to ${consumer.full_name} for ${formatCurrency(Number(salePrice))}? This will permanently bind ownership to their digital vault.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Sale',
          style: 'default',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const res = await sellTwinApi(twin.twin_id, {
                consumer_id: consumer.user_id,
                sale_price: Number(salePrice),
                invoice_no: invoiceNo,
                notes,
              });
              setSaleSuccess(res);
              queryClient.invalidateQueries({ queryKey: ['retailerInventory'] });
              queryClient.invalidateQueries({ queryKey: ['retailerSales'] });
            } catch (err: any) {
              Alert.alert('Sale Handover Failed', err.message || 'Could not complete sale.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen
      title="POS Product Handover"
      subtitle="Bind digital twin ownership to customer at point of sale"
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      {saleSuccess ? (
        <View style={styles.successCard}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-done" size={48} color={colors.verdictGenuine} />
          </View>
          <Text style={styles.successTitle}>First-Hand Sale Completed!</Text>
          <Text style={styles.successDesc}>
            Product status is now <Text style={{ fontWeight: '700' }}>SOLD</Text>. The digital twin
            certificate has been minted directly into{' '}
            <Text style={{ fontWeight: '700' }}>{saleSuccess.owner.full_name}'s</Text> Digital
            Vault.
          </Text>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryItem}>Serial: {saleSuccess.twin_id}</Text>
            <Text style={styles.summaryItem}>Invoice: {invoiceNo}</Text>
            <Text style={styles.summaryPrice}>Price Paid: {formatCurrency(Number(salePrice))}</Text>
          </View>

          <Button
            title="Scan Next Unit"
            onPress={() => router.replace('/(retailer)/scan')}
            variant="fin"
            style={{ width: '100%', marginTop: spacing.md }}
          />

          <Button
            title="Back to Inventory"
            onPress={() => router.replace('/(retailer)')}
            variant="outline"
            style={{ width: '100%', marginTop: spacing.xs }}
          />
        </View>
      ) : (
        <>
          {/* 1. Product Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>UNIT BEING SOLD</Text>
            <Text style={styles.productName}>{twin.product.name}</Text>
            <Text style={styles.serialText}>Serial: {twin.serial_number}</Text>
            <Text style={styles.mrpText}>Standard MRP: {formatCurrency(twin.product.mrp)}</Text>
          </View>

          {/* 2. Customer Lookup Section */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>BUYER VERIFICATION</Text>
            <View style={styles.lookupRow}>
              <View style={{ flex: 1 }}>
                <FormField
                  label="Registered Consumer Email"
                  placeholder="consumer@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={consumerEmail}
                  onChangeText={(val) => {
                    setConsumerEmail(val);
                    setConsumer(null);
                  }}
                />
              </View>
              <Button
                title="Lookup"
                onPress={handleLookup}
                loading={isLookingUp}
                variant="secondary"
                style={styles.lookupBtn}
              />
            </View>

            {consumer && (
              <View style={styles.consumerVerifiedBox}>
                <Ionicons name="person-circle" size={32} color={colors.verdictGenuine} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.consumerName}>{consumer.full_name}</Text>
                  <Text style={styles.consumerMasked}>{consumer.email_masked}</Text>
                </View>
                <View style={styles.verifiedPill}>
                  <Text style={styles.verifiedPillText}>Verified Buyer</Text>
                </View>
              </View>
            )}
          </View>

          {/* 3. Transaction Details */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>INVOICE & PRICING</Text>
            <FormField
              label="Final Sale Price (INR)"
              keyboardType="numeric"
              value={salePrice}
              onChangeText={setSalePrice}
            />

            <FormField
              label="Invoice Number"
              placeholder="INV-001"
              value={invoiceNo}
              onChangeText={setInvoiceNo}
            />

            <FormField
              label="Handover Notes"
              placeholder="e.g. Serial verified against receipt"
              value={notes}
              onChangeText={setNotes}
            />

            <Button
              title="Confirm First Sale & Handover"
              onPress={handleConfirmSale}
              loading={isSubmitting}
              variant="fin"
              icon={<Ionicons name="bag-check-outline" size={18} color={colors.onPrimary} />}
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.inkMuted,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  productName: {
    ...typography.headline,
    fontSize: 18,
  },
  serialText: {
    ...typography.mono,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 2,
  },
  mrpText: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.finOrange,
    marginTop: 4,
  },
  lookupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  lookupBtn: {
    marginTop: 24,
    height: 48,
  },
  consumerVerifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.verdictGenuineBg,
    padding: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.verdictGenuine + '30',
    marginTop: spacing.xs,
  },
  consumerName: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.ink,
  },
  consumerMasked: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  verifiedPill: {
    backgroundColor: colors.verdictGenuine,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  verifiedPillText: {
    ...typography.caption,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 9,
  },
  successCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.verdictGenuine + '40',
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  successIcon: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.headline,
    fontSize: 20,
    color: colors.verdictGenuine,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: spacing.sm,
  },
  summaryBox: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    gap: 2,
  },
  summaryItem: {
    ...typography.mono,
    fontSize: 12,
    color: colors.ink,
  },
  summaryPrice: {
    ...typography.cardTitle,
    fontSize: 16,
    color: colors.finOrange,
    marginTop: 4,
  },
});
