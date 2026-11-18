import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { retailerApi } from '../../../src/api/retailer';
import { scanApi } from '../../../src/api/scan';
import { ConsumerLookupResponseData, TwinView } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatCurrency } from '../../../src/utils/format';
import { getErrorMessage } from '../../../src/utils/errors';

export default function RetailerSellScreen() {
  const { twinId } = useLocalSearchParams<{ twinId: string }>();
  const router = useRouter();

  // Consumer lookup state
  const [consumerEmail, setConsumerEmail] = useState('riya@veritwin.dev');
  const [lookingUp, setLookingUp] = useState(false);
  const [foundConsumer, setFoundConsumer] = useState<
    ConsumerLookupResponseData['consumer'] | null
  >(null);

  // Sale form state
  const [salePrice, setSalePrice] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('Standard 5-year luxury manufacturer warranty card provided.');
  const [selling, setSelling] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<any | null>(null);

  // Fetch twin details
  const { data: twinData, isLoading } = useQuery({
    queryKey: ['retailer-twin-to-sell', twinId],
    queryFn: () => scanApi.getScannedTwin(twinId),
  });

  const twin = twinData?.twin as TwinView | undefined;

  const handleLookupConsumer = async () => {
    if (!consumerEmail.trim()) {
      Alert.alert('Required', 'Please enter consumer email.');
      return;
    }
    setLookingUp(true);
    try {
      const consumer = await retailerApi.lookupConsumer(consumerEmail.trim());
      setFoundConsumer(consumer);
    } catch (err) {
      Alert.alert('Lookup Notice', getErrorMessage(err));
      setFoundConsumer(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirmSale = async () => {
    if (!foundConsumer) {
      Alert.alert('Consumer Required', 'Please find and select a registered consumer buyer first.');
      return;
    }

    Alert.alert(
      'Confirm First-Hand POS Handover',
      `Complete digital twin ownership transfer to ${foundConsumer.full_name} for ${formatCurrency(
        salePrice || twin?.product.mrp
      )}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Sale',
          style: 'default',
          onPress: async () => {
            setSelling(true);
            try {
              const res = await retailerApi.sellTwin(twinId, {
                consumer_id: foundConsumer.user_id,
                sale_price: parseFloat(salePrice || String(twin?.product.mrp || 0)),
                invoice_no: invoiceNo.trim(),
                notes: notes.trim(),
              });
              setSaleSuccess(res);
            } catch (err) {
              Alert.alert('Sale Transaction Failed', getErrorMessage(err));
            } finally {
              setSelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen
      scrollable
      title="POS Sale Handover"
      subtitle="First-hand retail sale & blockchain transfer"
      roleAccent={colors.role.RETAILER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* SALE SUCCESS SCREEN (§6.3) */}
        {saleSuccess ? (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={54} color={colors.success} />
            </View>
            <Text style={[typography.h1, styles.successTitle]}>Sale Complete!</Text>
            <Text style={[typography.body, styles.successSubtitle]}>
              Digital Twin ownership has officially transferred to {saleSuccess.owner.full_name}.
              The unit is now locked to their private vault.
            </Text>

            <View style={styles.receiptBox}>
              <View style={styles.receiptRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Invoice Number
                </Text>
                <Text style={[typography.code, { color: colors.text }]}>{invoiceNo}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Serial Number
                </Text>
                <Text style={[typography.code, { color: colors.text }]}>{twin?.serial_number}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Registered Owner
                </Text>
                <Text style={[typography.bodyBold, { color: colors.role.CONSUMER_LIGHT }]}>
                  {saleSuccess.owner.full_name}
                </Text>
              </View>
            </View>

            <Button
              title="Scan Next Customer Item"
              onPress={() => router.replace('/(retailer)/scan')}
              variant="primary"
              roleColor={colors.role.RETAILER}
              size="lg"
              style={{ marginTop: spacing.lg }}
              leftIcon={<Ionicons name="scan-outline" size={20} color="#FFFFFF" />}
            />

            <Button
              title="Return to Inventory"
              onPress={() => router.replace('/(retailer)')}
              variant="ghost"
              size="md"
              style={{ marginTop: spacing.sm }}
            />
          </View>
        ) : isLoading || !twin ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.role.RETAILER} />
          </View>
        ) : (
          /* POS Handover Form */
          <View>
            {/* Product Summary Card (§6.3) */}
            <View style={styles.card}>
              <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.captionBold, { color: colors.role.RETAILER_LIGHT }]}>
                    {twin.product.brand.toUpperCase()}
                  </Text>
                  <Text style={[typography.h3, styles.prodTitle]}>{twin.product.name}</Text>
                  <Text style={[typography.code, { color: colors.textMuted }]}>
                    {twin.serial_number}
                  </Text>
                </View>
                <StatusBadge status={twin.status} />
              </View>

              <View style={styles.priceRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  RECOMMENDED MRP
                </Text>
                <Text style={[typography.h2, { color: colors.success }]}>
                  {formatCurrency(twin.product.mrp)}
                </Text>
              </View>
            </View>

            {/* Consumer Buyer Lookup (§6.3) */}
            <View style={styles.card}>
              <Text style={[typography.captionBold, styles.cardTitle]}>
                CUSTOMER ACCOUNT LOOKUP
              </Text>
              <View style={styles.lookupInputRow}>
                <FormField
                  label="Customer Email"
                  placeholder="e.g. riya@veritwin.dev"
                  value={consumerEmail}
                  onChangeText={setConsumerEmail}
                  autoCapitalize="none"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
                />
                <Button
                  title="Find"
                  onPress={handleLookupConsumer}
                  loading={lookingUp}
                  variant="secondary"
                  size="md"
                  style={styles.findBtn}
                />
              </View>

              {foundConsumer && (
                <View style={styles.foundConsumerBox}>
                  <Ionicons name="person-circle" size={32} color={colors.role.CONSUMER} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>
                      {foundConsumer.full_name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      Masked Email: {foundConsumer.email_masked}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
              )}
            </View>

            {/* POS Transaction Details */}
            <View style={styles.card}>
              <Text style={[typography.captionBold, styles.cardTitle]}>BILLING & INVOICE</Text>

              <FormField
                label="Final Sale Price (₹ INR)"
                placeholder={String(twin.product.mrp)}
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="decimal-pad"
                helperText="Pre-filled with MRP. Adjust if discount applies."
              />

              <FormField
                label="Invoice Number"
                placeholder="INV-90214"
                value={invoiceNo}
                onChangeText={setInvoiceNo}
                required
              />

              <FormField
                label="Sale Notes / Warranty Reference"
                placeholder="Notes for the digital twin ledger..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />

              <Button
                title="Complete Sale & Transfer Twin"
                onPress={handleConfirmSale}
                loading={selling}
                roleColor={colors.role.RETAILER}
                size="lg"
                style={{ marginTop: spacing.base }}
                leftIcon={<Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />}
              />
            </View>
          </View>
        )}
      </ScrollView>
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
  cardTitle: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prodTitle: {
    color: colors.text,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  lookupInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  findBtn: {
    height: 48,
    minWidth: 70,
  },
  foundConsumerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  successCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  successIconCircle: {
    marginBottom: spacing.md,
  },
  successTitle: {
    color: colors.text,
    textAlign: 'center',
  },
  successSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  receiptBox: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
