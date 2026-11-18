import React, { useEffect, useState, useRef } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { QRCodeCard } from '../../../src/components/QRCodeCard';
import { CountdownRing } from '../../../src/components/CountdownRing';
import { Button } from '../../../src/components/Button';
import { consumerApi } from '../../../src/api/consumer';
import { CreateTransferResponseData, TransferStatus } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { getErrorMessage } from '../../../src/utils/errors';

export default function ConsumerTransferSellerScreen() {
  const { twinId } = useLocalSearchParams<{ twinId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  useKeepAwake(); // Keep screen awake while displaying transfer QR (§9)

  const [transferData, setTransferData] = useState<CreateTransferResponseData | null>(null);
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('PENDING');
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTransfer = async () => {
    setLoading(true);
    setTransferStatus('PENDING');
    try {
      const data = await consumerApi.createTransfer(twinId);
      setTransferData(data);
    } catch (err) {
      Alert.alert('Transfer Initialization Failed', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransfer();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [twinId]);

  // Active Polling every 2s (§6.4)
  useEffect(() => {
    if (!transferData?.transfer_id || transferStatus !== 'PENDING') return;

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await consumerApi.getTransferStatus(transferData.transfer_id);
        if (res.status !== 'PENDING') {
          setTransferStatus(res.status);
          if (res.status === 'CLAIMED') {
            queryClient.invalidateQueries({ queryKey: ['consumer-vault'] });
          }
        }
      } catch {
        // Silent poll error
      }
    }, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [transferData?.transfer_id, transferStatus]);

  const handleCancel = async () => {
    if (!transferData?.transfer_id) return;
    setCancelling(true);
    try {
      await consumerApi.cancelTransfer(transferData.transfer_id);
      setTransferStatus('CANCELLED');
      Alert.alert('Transfer Cancelled', 'The transfer session has been safely voided.');
      router.back();
    } catch (err) {
      Alert.alert('Cancel Failed', getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Screen
      scrollable
      title="Peer-to-Peer Transfer"
      subtitle="Cryptographic single-use ownership handover"
      roleAccent={colors.role.CONSUMER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* CLAIMED SUCCESS STATE (§6.4) */}
        {transferStatus === 'CLAIMED' ? (
          <View style={styles.stateCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-done-circle" size={56} color={colors.success} />
            </View>
            <Text style={[typography.h1, styles.stateTitle]}>Ownership Handover Complete!</Text>
            <Text style={[typography.body, styles.stateSubtitle]}>
              The buyer scanned and claimed your product twin. The tamper-evident provenance log has
              been appended with a RESOLD block.
            </Text>

            <Button
              title="Return to My Vault"
              onPress={() => router.replace('/(consumer)/vault')}
              roleColor={colors.role.CONSUMER}
              size="lg"
              style={{ marginTop: spacing.lg }}
            />
          </View>
        ) : transferStatus === 'EXPIRED' ? (
          /* EXPIRED STATE (§6.4) */
          <View style={styles.stateCard}>
            <Ionicons name="time-outline" size={54} color={colors.danger} />
            <Text style={[typography.h2, styles.stateTitle]}>Transfer Code Expired</Text>
            <Text style={[typography.body, styles.stateSubtitle]}>
              For security, VeriTwin transfer QR codes expire after 120 seconds. Please generate a
              fresh session.
            </Text>

            <Button
              title="Generate New Transfer QR"
              onPress={startTransfer}
              roleColor={colors.role.CONSUMER}
              size="lg"
              style={{ marginTop: spacing.lg }}
              leftIcon={<Ionicons name="refresh" size={20} color="#FFFFFF" />}
            />
          </View>
        ) : loading || !transferData ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.role.CONSUMER} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              Signing transfer session with cryptographic nonce…
            </Text>
          </View>
        ) : (
          /* ACTIVE PENDING TRANSFER VIEW */
          <View>
            <View style={styles.instructionsBox}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.role.CONSUMER_LIGHT} />
              <Text style={[typography.body, styles.instructionText]}>
                Have the buyer open VeriTwin and tap <Text style={{ fontWeight: '700' }}>Claim P2P</Text> to scan this QR code.
              </Text>
            </View>

            {/* Countdown Ring (§7) */}
            <CountdownRing
              expiresAt={transferData.expires_at}
              totalSeconds={transferData.ttl_seconds || 120}
              onExpire={() => setTransferStatus('EXPIRED')}
            />

            {/* Large High-Density QR Code (§7) */}
            <QRCodeCard
              value={transferData.qr_payload}
              size={260}
              title="Scan to Claim Ownership"
              subtitle="Single-use cryptographically signed transfer token"
            />

            {/* Live Polling Status Indicator */}
            <View style={styles.pollIndicatorRow}>
              <ActivityIndicator size="small" color={colors.role.CONSUMER_LIGHT} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Waiting for buyer to scan… (live auto-sync)
              </Text>
            </View>

            {/* Cancel Button */}
            <Button
              title="Cancel Transfer Session"
              onPress={handleCancel}
              loading={cancelling}
              variant="outline"
              size="md"
              style={styles.cancelBtn}
              textStyle={{ color: colors.danger }}
            />
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
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
    marginBottom: spacing.base,
  },
  instructionText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  pollIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  cancelBtn: {
    borderColor: colors.surfaceBorder,
    marginTop: spacing.xs,
  },
  stateCard: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  successIconCircle: {
    marginBottom: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  stateSubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    maxWidth: 290,
  },
});
