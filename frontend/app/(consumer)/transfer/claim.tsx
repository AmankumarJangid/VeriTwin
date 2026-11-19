// Buyer P2P Transfer Claim Screen
// Spec reference: 02_FRONTEND.md §6.4 & 00_SHARED_CONTRACT.md §7.4
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { ScannerView } from '../../../src/components/ScannerView';
import { Button } from '../../../src/components/Button';
import { claimTransferApi } from '../../../src/api/consumer';
import { TransferClaimResponse } from '../../../src/types/api';
import { getErrorMessage } from '../../../src/utils/errors';
import { formatCurrency } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function ClaimTransferScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<TransferClaimResponse | null>(null);

  const handleQrScanned = async (payload: string) => {
    if (isClaiming || claimSuccess) return;

    try {
      setIsClaiming(true);
      const res = await claimTransferApi(payload);
      setClaimSuccess(res);
      queryClient.invalidateQueries({ queryKey: ['consumerVault'] });
      queryClient.invalidateQueries({ queryKey: ['consumerVaultList'] });
    } catch (err) {
      Alert.alert('Transfer Claim Failed', getErrorMessage(err));
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Screen
      title="Claim P2P Transfer"
      subtitle="Point camera at the seller's active transfer QR code"
      scrollable={!!claimSuccess}
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      {claimSuccess ? (
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="gift-outline" size={48} color={colors.verdictGenuine} />
          </View>
          <Text style={styles.successTitle}>Ownership Transferred to You!</Text>
          <Text style={styles.successDesc}>
            The tamper-evident digital certificate for{' '}
            <Text style={{ fontWeight: '700', color: colors.ink }}>
              {claimSuccess.twin.product.name}
            </Text>{' '}
            has been transferred into your Digital Vault.
          </Text>

          <View style={styles.twinSummary}>
            <Text style={styles.twinSerial}>Serial: {claimSuccess.twin.serial_number}</Text>
            <Text style={styles.twinPrice}>
              Value: {formatCurrency(claimSuccess.twin.product.mrp)}
            </Text>
          </View>

          <Button
            title="View Product in Vault"
            onPress={() => router.replace(`/(consumer)/vault/${claimSuccess.twin.twin_id}` as any)}
            variant="fin"
            style={{ marginTop: spacing.md, width: '100%' }}
          />
        </View>
      ) : (
        <View style={styles.scannerContainer}>
          <ScannerView
            mode="QR"
            onModeChange={() => {}} // QR-only mode
            onLogoCaptured={() => {}}
            onQrScanned={handleQrScanned}
            busy={isClaiming}
            hint="Scan the seller's VeriTwin transfer QR"
          />
        </View>
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
  scannerContainer: {
    flex: 1,
    height: 520,
    borderRadius: radii.xl,
    overflow: 'hidden',
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
  successIconCircle: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.headline,
    fontSize: 20,
    color: colors.verdictGenuine,
    marginBottom: 4,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginVertical: spacing.sm,
  },
  twinSummary: {
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  twinSerial: {
    ...typography.mono,
    color: colors.ink,
  },
  twinPrice: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
});
