// Seller Handshake Screen: Transfer QR Generator + Countdown + Polling
// Spec reference: 02_FRONTEND.md §6.4 & 00_SHARED_CONTRACT.md §5.6
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { QRCodeCard } from '../../../src/components/QRCodeCard';
import { CountdownRing } from '../../../src/components/CountdownRing';
import { Button } from '../../../src/components/Button';
import {
  initiateTransferApi,
  pollTransferApi,
  cancelTransferApi,
} from '../../../src/api/consumer';
import { TransferInitiateResponse, TransferStatus } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function TransferSellerScreen() {
  const { twinId } = useLocalSearchParams<{ twinId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [transfer, setTransfer] = useState<TransferInitiateResponse | null>(null);
  const [status, setStatus] = useState<TransferStatus>('PENDING');
  const [isLoading, setIsLoading] = useState(true);

  // Generate transfer token on mount
  const generateTransfer = async () => {
    try {
      setIsLoading(true);
      setStatus('PENDING');
      const res = await initiateTransferApi(twinId!);
      setTransfer(res);
      setStatus(res.status);
    } catch (err: any) {
      Alert.alert('Transfer Error', err.message || 'Could not initiate transfer.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (twinId) {
      generateTransfer();
    }
  }, [twinId]);

  // Poll transfer status every 2 seconds while PENDING
  useEffect(() => {
    if (!transfer || status !== 'PENDING') return;

    const interval = setInterval(async () => {
      try {
        const pollRes = await pollTransferApi(transfer.transfer_id);
        setStatus(pollRes.status);

        if (pollRes.status === 'CLAIMED') {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['consumerVault'] });
          queryClient.invalidateQueries({ queryKey: ['consumerVaultList'] });
        } else if (pollRes.status === 'EXPIRED') {
          clearInterval(interval);
        }
      } catch (err) {
        // Polling error silently handled
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [transfer, status]);

  const handleCancel = async () => {
    if (!transfer) return;
    try {
      await cancelTransferApi(transfer.transfer_id);
      setStatus('CANCELLED');
      Alert.alert('Cancelled', 'Transfer token cancelled.');
      router.back();
    } catch (err: any) {
      Alert.alert('Cancel Failed', err.message || 'Could not cancel transfer.');
    }
  };

  if (isLoading || !transfer) {
    return (
      <Screen title="Generating Transfer Token…">
        <Text style={styles.loadingText}>Creating encrypted, single-use P2P handshake…</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Transfer Ownership"
      subtitle="Show this encrypted QR code to the new owner"
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      {/* 1. Status View: CLAIMED SUCCESS */}
      {status === 'CLAIMED' ? (
        <View style={styles.successCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-done-circle" size={48} color={colors.verdictGenuine} />
          </View>
          <Text style={styles.successTitle}>Ownership Transferred!</Text>
          <Text style={styles.successDesc}>
            The buyer has successfully claimed this digital twin. The cryptographic certificate and
            timeline have been transferred to their vault.
          </Text>
          <Button
            title="Return to Vault"
            onPress={() => router.replace('/(consumer)/vault' as any)}
            variant="primary"
            style={{ marginTop: spacing.md, width: '100%' }}
          />
        </View>
      ) : status === 'EXPIRED' ? (
        /* 2. Status View: EXPIRED */
        <View style={styles.expiredCard}>
          <Ionicons name="time-outline" size={40} color={colors.verdictClaimed} />
          <Text style={styles.expiredTitle}>Transfer Token Expired</Text>
          <Text style={styles.expiredDesc}>
            For security, P2P transfer tokens expire in 120 seconds.
          </Text>
          <Button
            title="Generate Fresh Transfer QR"
            onPress={generateTransfer}
            variant="fin"
            style={{ marginTop: spacing.md, width: '100%' }}
          />
        </View>
      ) : (
        /* 3. Status View: PENDING Handshake */
        <View style={styles.handshakeContainer}>
          {/* Instructions banner */}
          <View style={styles.instructionBox}>
            <Ionicons name="shield-checkmark" size={16} color={colors.finOrange} />
            <Text style={styles.instructionText}>
              Ask the buyer to open the "Scan Transfer" tab on their phone to scan this QR code.
            </Text>
          </View>

          {/* QR Code */}
          <QRCodeCard
            payload={transfer.qr_payload}
            size={240}
            title="Encrypted P2P Resale Token"
            subtitle="Single-use cryptographic signature"
          />

          {/* Countdown Ring derived from expires_at */}
          <CountdownRing
            expiresAt={transfer.expires_at}
            totalSeconds={transfer.ttl_seconds || 120}
            onExpire={() => setStatus('EXPIRED')}
          />

          <Button
            title="Cancel Transfer"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelBtn}
          />
        </View>
      )}
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
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  handshakeContainer: {
    alignItems: 'center',
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.finOrangeLight,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.finOrange + '30',
    marginBottom: spacing.sm,
  },
  instructionText: {
    flex: 1,
    ...typography.bodySm,
    fontSize: 12,
    color: colors.ink,
  },
  cancelBtn: {
    width: '100%',
    marginTop: spacing.sm,
    borderColor: colors.verdictFake + '40',
  },
  successCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.verdictGenuine + '40',
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  successIconCircle: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.headline,
    fontSize: 22,
    color: colors.verdictGenuine,
    marginBottom: 6,
    textAlign: 'center',
  },
  successDesc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  expiredCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  expiredTitle: {
    ...typography.headline,
    fontSize: 20,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  expiredDesc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
