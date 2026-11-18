import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { ScannerView } from '../../../src/components/ScannerView';
import { Button } from '../../../src/components/Button';
import { consumerApi } from '../../../src/api/consumer';
import { ClaimTransferResponseData } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { getErrorMessage } from '../../../src/utils/errors';

export default function ConsumerClaimTransferScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<ClaimTransferResponseData | null>(null);

  const handleQrScanned = async (payload: string) => {
    if (busy || claimSuccess) return;

    if (!payload.startsWith('VTX1.')) {
      Alert.alert(
        'Invalid Transfer Code',
        "This is not a VeriTwin transfer QR code. Transfer codes begin with 'VTX1.'."
      );
      return;
    }

    setBusy(true);
    try {
      const res = await consumerApi.claimTransfer(payload);
      setClaimSuccess(res);
      queryClient.invalidateQueries({ queryKey: ['consumer-vault'] });
    } catch (err) {
      Alert.alert('Claim Failed', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (claimSuccess) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="shield-checkmark" size={54} color={colors.success} />
          </View>
          <Text style={[typography.h1, styles.successTitle]}>Claimed Successfully!</Text>
          <Text style={[typography.body, styles.successSubtitle]}>
            You are now the certified, registered owner of{' '}
            <Text style={{ fontWeight: '700', color: colors.text }}>
              {claimSuccess.twin.product.name}
            </Text>
            .
          </Text>

          <View style={styles.twinCertBox}>
            <Text style={[typography.captionBold, { color: colors.role.CONSUMER_LIGHT }]}>
              DIGITAL CERTIFICATE OF AUTHENTICITY
            </Text>
            <Text style={[typography.code, { color: colors.text, marginTop: 4 }]}>
              Serial: {claimSuccess.twin.serial_number}
            </Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Batch: {claimSuccess.twin.batch.batch_no}
            </Text>
          </View>

          <Button
            title="Open in My Vault"
            onPress={() => router.replace('/(consumer)/vault')}
            roleColor={colors.role.CONSUMER}
            size="lg"
            style={{ marginTop: spacing.xl, width: '100%' }}
            leftIcon={<Ionicons name="wallet-outline" size={20} color="#FFFFFF" />}
          />

          <Button
            title="Scan Another Transfer"
            onPress={() => setClaimSuccess(null)}
            variant="ghost"
            size="md"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* QR-Only Scanner */}
      <ScannerView
        mode="QR"
        onModeChange={() => {}}
        onLogoCaptured={() => {}}
        onQrScanned={handleQrScanned}
        busy={busy}
        roleAccent={colors.role.CONSUMER}
        hint="Scan the seller's active P2P transfer QR code"
      />

      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={colors.role.CONSUMER} />
          <Text style={[typography.h3, styles.busyText]}>
            Verifying cryptographic token & claiming ownership…
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 99,
  },
  busyText: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.base,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.base,
    justifyContent: 'center',
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
  twinCertBox: {
    width: '100%',
    backgroundColor: colors.surfaceElevated,
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
