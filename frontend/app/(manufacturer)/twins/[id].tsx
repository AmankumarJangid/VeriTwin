// Manufacturer Twin Detail & Cryptographic Integrity Screen
// Spec reference: 02_FRONTEND.md §6.2 & 00_SHARED_CONTRACT.md §7.2
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { Timeline } from '../../../src/components/Timeline';
import { SpecList } from '../../../src/components/SpecList';
import { Button } from '../../../src/components/Button';
import { FormField } from '../../../src/components/FormField';
import { QRCodeCard } from '../../../src/components/QRCodeCard';
import { AuthImage } from '../../../src/components/AuthImage';
import {
  getTwinApi,
  getTwinIntegrityApi,
  appendTwinEventApi,
  getRetailersApi,
} from '../../../src/api/manufacturer';
import { downloadAndSaveAsset, shareAsset } from '../../../src/utils/files';
import { useAuthStore } from '../../../src/store/authStore';
import { formatCurrency, formatDate } from '../../../src/utils/format';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function ManufacturerTwinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<{
    valid: boolean;
    events_checked: number;
    broken_at_event_id: string | null;
  } | null>(null);

  const [appendSheetVisible, setAppendSheetVisible] = useState(false);
  const [eventType, setEventType] = useState<'QA_PASSED' | 'DISPATCHED_TO_RETAIL'>('QA_PASSED');
  const [eventNotes, setEventNotes] = useState('');
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [isAppending, setIsAppending] = useState(false);

  // Load twin details
  const { data: twinData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerTwinDetail', id],
    queryFn: () => getTwinApi(id!),
    enabled: !!id,
  });

  // Load retailers list for dispatch
  const { data: retailerData } = useQuery({
    queryKey: ['manufacturerRetailers'],
    queryFn: () => getRetailersApi(),
  });

  const twin = twinData?.twin;
  const assets = twinData?.assets;
  const retailers = retailerData?.retailers || [];

  const handleVerifyIntegrity = async () => {
    if (!id) return;
    try {
      setIsVerifyingIntegrity(true);
      const res = await getTwinIntegrityApi(id);
      setIntegrityResult(res);
      if (res.valid) {
        Alert.alert(
          'Cryptographic Integrity Verified ✅',
          `Full hash-chain intact. All ${res.events_checked} lifecycle events verified without tampering.`
        );
      } else {
        Alert.alert(
          'Integrity Violation ❌',
          `Hash-chain broken at event #${res.broken_at_event_id}. Tampering detected.`
        );
      }
    } catch (err: any) {
      Alert.alert('Verification Failed', err.message || 'Could not verify hash chain.');
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  const handleAppendEvent = async () => {
    if (!id) return;
    if (eventType === 'DISPATCHED_TO_RETAIL') {
      const retId = selectedRetailerId || (retailers[0] ? retailers[0].user_id : '');
      if (!retId) {
        Alert.alert('Retailer Required', 'Please select a destination retailer.');
        return;
      }
    }

    try {
      setIsAppending(true);
      await appendTwinEventApi(id, {
        event_type: eventType,
        notes: eventNotes || `Factory event: ${eventType}`,
        metadata:
          eventType === 'DISPATCHED_TO_RETAIL'
            ? { retailer_id: selectedRetailerId || retailers[0]?.user_id }
            : undefined,
      });

      setAppendSheetVisible(false);
      Alert.alert('Event Logged', `Lifecycle event ${eventType} appended to hash chain.`);
      queryClient.invalidateQueries({ queryKey: ['manufacturerTwinDetail', id] });
      queryClient.invalidateQueries({ queryKey: ['manufacturerTwins'] });
    } catch (err: any) {
      Alert.alert('Event Error', err.message || 'Could not append event.');
    } finally {
      setIsAppending(false);
    }
  };

  if (isLoading || !twin) {
    return (
      <Screen title="Loading Twin…">
        <Text style={styles.loadingText}>Reading digital certificate and chain…</Text>
      </Screen>
    );
  }

  return (
    <Screen
      title="Digital Twin Record"
      subtitle={`Serial: ${twin.serial_number}`}
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      {/* 1. Twin Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.brandText}>{twin.product.brand}</Text>
          <StatusBadge status={twin.status} />
        </View>

        <Text style={styles.prodTitle}>{twin.product.name}</Text>
        <Text style={styles.twinCode}>Twin Code: {twin.twin_code || '9F3A27C1'}</Text>

        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.label}>Retail MRP</Text>
            <Text style={styles.price}>{formatCurrency(twin.product.mrp)}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Factory Batch</Text>
            <Text style={styles.val}>{twin.batch?.batch_no || 'N/A'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Assigned Retailer</Text>
            <Text style={styles.val}>
              {twin.current_retailer?.organization_name || 'Not Dispatched'}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Consumer Owner</Text>
            <Text style={styles.val}>{twin.owner?.full_name || 'Unsold / In Channel'}</Text>
          </View>
        </View>

        {/* Action Buttons: Integrity & Append Event */}
        <View style={styles.twinActionRow}>
          <Button
            title="Verify Chain Integrity"
            onPress={handleVerifyIntegrity}
            loading={isVerifyingIntegrity}
            variant="secondary"
            icon={<Ionicons name="shield-checkmark" size={16} color={colors.verdictGenuine} />}
            style={{ flex: 1 }}
          />

          {twin.status !== 'SOLD' && (
            <Button
              title="Append Event"
              onPress={() => setAppendSheetVisible(true)}
              variant="fin"
              icon={<Ionicons name="add" size={18} color={colors.onPrimary} />}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </View>

      {/* 2. Physical Link Assets */}
      <View style={styles.card}>
        <Text style={styles.cardHeaderTitle}>Physical Link Assets</Text>
        <Text style={styles.cardHeaderSub}>Watermarked logo mark & cryptographic QR code</Text>

        {assets && (
          <View style={styles.assetsGrid}>
            <View style={styles.assetBlock}>
              <Text style={styles.assetLabel}>Watermarked Logo</Text>
              <AuthImage
                uri={assets.watermarked_logo_url}
                token={accessToken}
                style={styles.assetThumb}
                resizeMode="cover"
                fallbackIcon="shield-outline"
                fallbackText="Logo Protected"
              />
              <Button
                title="Download Logo"
                icon={<Ionicons name="download-outline" size={13} color={colors.ink} />}
                onPress={() =>
                  downloadAndSaveAsset(
                    assets.watermarked_logo_url,
                    `${twin.serial_number}-logo.png`,
                    accessToken
                  )
                }
                variant="outline"
                style={{ height: 34, marginTop: 6 }}
              />
            </View>

            <View style={styles.assetBlock}>
              <Text style={styles.assetLabel}>Fallback QR</Text>
              <AuthImage
                uri={assets.fallback_qr_url}
                token={accessToken}
                style={styles.assetThumb}
                resizeMode="contain"
                fallbackIcon="qr-code-outline"
                fallbackText="QR Protected"
              />
              <Button
                title="Download QR"
                icon={<Ionicons name="download-outline" size={13} color={colors.ink} />}
                onPress={() =>
                  downloadAndSaveAsset(
                    assets.fallback_qr_url,
                    `${twin.serial_number}-qr.png`,
                    accessToken
                  )
                }
                variant="outline"
                style={{ height: 34, marginTop: 6 }}
              />
            </View>
          </View>
        )}

        {assets?.fallback_qr_payload && (
          <View style={styles.payloadBox}>
            <View style={styles.payloadHeader}>
              <Ionicons name="key-outline" size={14} color={colors.inkMuted} />
              <Text style={styles.payloadTitle}>Cryptographic Signed QR Payload:</Text>
            </View>
            <Text style={styles.payloadText} numberOfLines={2} selectable>
              {assets.fallback_qr_payload}
            </Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={async () => {
                if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
                  await navigator.clipboard.writeText(assets.fallback_qr_payload);
                  Alert.alert('Copied!', 'Signed QR payload copied to clipboard. You can paste it into the scanner.');
                } else {
                  shareAsset(assets.fallback_qr_payload);
                }
              }}
            >
              <Ionicons name="copy-outline" size={14} color={colors.finOrange} />
              <Text style={styles.copyBtnText}>Copy Payload for Scanner</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. Specs List */}
      {twin.product.specs && <SpecList specs={twin.product.specs} />}

      {/* 4. Tamper-evident Timeline */}
      <Timeline events={twin.timeline} />

      {/* Append Event Modal */}
      <Modal
        visible={appendSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAppendSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Append Factory Event</Text>
            <Text style={styles.modalSub}>
              Append a new tamper-evident state transition block to the lifecycle chain.
            </Text>

            {/* Event Type Selector */}
            <View style={styles.typeRow}>
              {(['QA_PASSED', 'DISPATCHED_TO_RETAIL'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, eventType === t && styles.typeChipActive]}
                  onPress={() => setEventType(t)}
                >
                  <Text style={[styles.typeText, eventType === t && styles.typeTextActive]}>
                    {t === 'QA_PASSED' ? 'Factory QA Passed' : 'Dispatch to Retailer'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* If Dispatch, pick retailer */}
            {eventType === 'DISPATCHED_TO_RETAIL' && (
              <View style={styles.retailerSection}>
                <Text style={styles.retailerTitle}>Select Destination Retailer:</Text>
                {retailers.map((r) => {
                  const isSelected =
                    (selectedRetailerId || retailers[0]?.user_id) === r.user_id;
                  return (
                    <TouchableOpacity
                      key={r.user_id}
                      style={[styles.retChip, isSelected && styles.retChipActive]}
                      onPress={() => setSelectedRetailerId(r.user_id)}
                    >
                      <Text style={[styles.retName, isSelected && styles.retNameActive]}>
                        {r.organization_name}
                      </Text>
                      <Text style={[styles.retEmail, isSelected && styles.retEmailActive]}>
                        {r.email}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <FormField
              label="Audit Notes"
              placeholder="e.g. Shipment waybill #WB-2026-99"
              value={eventNotes}
              onChangeText={setEventNotes}
            />

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setAppendSheetVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Append to Chain"
                variant="primary"
                onPress={handleAppendEvent}
                loading={isAppending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    ...typography.cardTitle,
    fontSize: 16,
  },
  cardHeaderSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  brandText: {
    ...typography.caption,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  prodTitle: {
    ...typography.headline,
    fontSize: 18,
    marginTop: 2,
  },
  twinCode: {
    ...typography.mono,
    fontSize: 11,
    color: colors.roleManufacturer,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    marginTop: spacing.sm,
  },
  col: {
    width: '47%',
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  val: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.ink,
    marginTop: 1,
  },
  price: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 1,
  },
  twinActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  assetsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  assetBlock: {
    flex: 1,
    alignItems: 'center',
  },
  assetLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 4,
  },
  assetThumb: {
    width: '100%',
    height: 110,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  modalTitle: {
    ...typography.headline,
    fontSize: 18,
    marginBottom: 2,
  },
  modalSub: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface2,
  },
  typeChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  typeText: {
    ...typography.button,
    fontSize: 12,
    color: colors.ink,
  },
  typeTextActive: {
    color: colors.onPrimary,
  },
  retailerSection: {
    marginBottom: spacing.md,
  },
  retailerTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  retChip: {
    backgroundColor: colors.canvas,
    padding: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 6,
  },
  retChipActive: {
    backgroundColor: colors.roleManufacturer + '15',
    borderColor: colors.roleManufacturer,
  },
  retName: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
  },
  retNameActive: {
    color: colors.roleManufacturer,
  },
  retEmail: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  retEmailActive: {
    color: colors.roleManufacturer,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
  },
  payloadBox: {
    marginTop: spacing.md,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  payloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  payloadTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.inkMuted,
  },
  payloadText: {
    ...typography.caption,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.ink,
    fontSize: 11,
    marginBottom: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  copyBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.finOrange,
  },
});
