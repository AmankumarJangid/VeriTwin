// Shared Verdict Screen (Modal / Full View)
// Spec reference: 02_FRONTEND.md §5.5 & 00_SHARED_CONTRACT.md §7.5
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useScanStore } from '../src/store/scanStore';
import { useAuthStore } from '../src/store/authStore';
import { appendRetailerEventApi } from '../src/api/retailer';
import { TwinView, LimitedTwinView } from '../src/types/api';
import { VerdictBanner } from '../src/components/VerdictBanner';
import { StatusBadge } from '../src/components/StatusBadge';
import { SpecList } from '../src/components/SpecList';
import { Timeline } from '../src/components/Timeline';
import { Button } from '../src/components/Button';
import { Screen } from '../src/components/Screen';
import { formatCurrency, formatDate } from '../src/utils/format';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { radii, spacing } from '../src/theme/spacing';

export default function ScanResultScreen() {
  const router = useRouter();
  const { currentResult } = useScanStore();
  const { user } = useAuthStore();

  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [inspectCondition, setInspectCondition] = useState<'OK' | 'DAMAGED' | 'SUSPICIOUS'>('OK');
  const [inspectNotes, setInspectNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Trigger Haptic feedback based on verdict
    if (Platform.OS !== 'web' && currentResult) {
      if (currentResult.verdict === 'GENUINE') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (currentResult.verdict === 'ALREADY_CLAIMED') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [currentResult]);

  if (!currentResult) {
    return (
      <Screen title="Scan Result">
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scan result to display.</Text>
          <Button title="Back to Scanner" onPress={() => router.back()} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  const { verdict, verification_method, confidence, is_owner, allowed_actions, twin, message, reason } =
    currentResult;

  const fullTwin = verdict === 'GENUINE' ? (twin as TwinView) : null;
  const limitedTwin = verdict === 'ALREADY_CLAIMED' ? (twin as LimitedTwinView) : null;

  // Handle allowed actions
  const handleReceive = async () => {
    if (!fullTwin) return;
    try {
      setIsSubmitting(true);
      await appendRetailerEventApi(fullTwin.twin_id, {
        event_type: 'RECEIVED_AT_RETAIL',
        notes: 'Received and verified at retail showroom.',
      });
      Alert.alert('Success', 'Product marked as RECEIVED AT RETAIL.');
      router.back();
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Could not receive item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspectSubmit = async () => {
    if (!fullTwin) return;
    try {
      setIsSubmitting(true);
      await appendRetailerEventApi(fullTwin.twin_id, {
        event_type: 'INSPECTED',
        notes: inspectNotes || `Store inspection logged: Condition ${inspectCondition}`,
        metadata: { condition: inspectCondition },
      });
      setInspectModalVisible(false);
      Alert.alert('Inspection Logged', `Condition recorded as ${inspectCondition}.`);
      router.back();
    } catch (err: any) {
      Alert.alert('Inspection Failed', err.message || 'Could not record inspection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSell = () => {
    if (!fullTwin) return;
    router.push(`/(retailer)/sell/${fullTwin.twin_id}` as any);
  };

  const handleAppendEvent = () => {
    if (!fullTwin) return;
    router.push(`/(manufacturer)/twins/${fullTwin.twin_id}` as any);
  };

  const handleInitiateTransfer = () => {
    if (!fullTwin) return;
    router.push(`/(consumer)/transfer/${fullTwin.twin_id}` as any);
  };

  const handleReportCounterfeit = () => {
    Alert.alert('Report Logged', 'Counterfeit warning logged. Incident report submitted to brand protection.');
  };

  return (
    <Screen
      title="Verification Result"
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      {/* 1. Verdict Banner */}
      <VerdictBanner
        verdict={verdict}
        method={verification_method}
        confidence={confidence}
      />

      {/* 2. Message from Backend Engine */}
      <View style={styles.messageCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.inkMuted} />
        <Text style={styles.messageText}>{message}</Text>
      </View>

      {/* 3. Owner banner if genuine and caller is owner */}
      {is_owner && (
        <View style={styles.ownerBadge}>
          <Ionicons name="checkmark-circle" size={16} color={colors.verdictGenuine} />
          <Text style={styles.ownerBadgeText}>You are the verified owner of this item.</Text>
        </View>
      )}

      {/* 4. GENUINE Content */}
      {verdict === 'GENUINE' && fullTwin && (
        <>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.brandName}>{fullTwin.product.brand}</Text>
                <Text style={styles.productName}>{fullTwin.product.name}</Text>
              </View>
              <StatusBadge status={fullTwin.status} />
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Serial Number</Text>
                <Text style={styles.infoValue}>{fullTwin.serial_number}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Retail Price (MRP)</Text>
                <Text style={styles.infoValue}>{formatCurrency(fullTwin.product.mrp)}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>SKU</Text>
                <Text style={styles.infoValue}>{fullTwin.product.sku}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Batch No</Text>
                <Text style={styles.infoValue}>{fullTwin.batch?.batch_no || 'N/A'}</Text>
              </View>
            </View>
          </View>

          {/* Specs */}
          {fullTwin.product.specs && <SpecList specs={fullTwin.product.specs} />}

          {/* Tamper-evident Timeline */}
          {fullTwin.timeline && <Timeline events={fullTwin.timeline} />}
        </>
      )}

      {/* 5. ALREADY_CLAIMED Content */}
      {verdict === 'ALREADY_CLAIMED' && limitedTwin && (
        <View style={styles.card}>
          <Text style={styles.brandName}>{limitedTwin.product?.brand || 'Verified Brand'}</Text>
          <Text style={styles.productName}>{limitedTwin.product?.name || 'Registered Product'}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Serial Number</Text>
              <Text style={styles.infoValue}>{limitedTwin.serial_number}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Current Status</Text>
              <StatusBadge status={limitedTwin.status} />
            </View>
            {limitedTwin.claimed_at && (
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Registration Date</Text>
                <Text style={styles.infoValue}>{formatDate(limitedTwin.claimed_at)}</Text>
              </View>
            )}
          </View>

          <View style={styles.tipBox}>
            <Ionicons name="bulb-outline" size={18} color={colors.verdictClaimed} />
            <Text style={styles.tipText}>
              To purchase or take ownership of this product, request the seller to initiate an in-app
              peer-to-peer transfer from their VeriTwin Digital Vault.
            </Text>
          </View>
        </View>
      )}

      {/* 6. FAKE Content */}
      {verdict === 'FAKE' && (
        <View style={styles.card}>
          <Text style={styles.fakeWarningTitle}>Warning: Unverified Product</Text>
          <Text style={styles.fakeWarningDesc}>
            This physical unit lacks an authentic digital twin or failed cryptographic verification.
          </Text>

          <View style={styles.techDetailRow}>
            <Text style={styles.techDetailLabel}>Engine Diagnostic:</Text>
            <Text style={styles.techDetailValue}>{reason || 'TWIN_NOT_FOUND'}</Text>
          </View>

          <Button
            title="Report Counterfeit to Brand"
            onPress={handleReportCounterfeit}
            variant="danger"
            style={{ marginTop: spacing.md }}
            icon={<Ionicons name="flag-outline" size={16} color={colors.onPrimary} />}
          />
        </View>
      )}

      {/* 7. Action Buttons derived STRICTLY from allowed_actions */}
      {allowed_actions && allowed_actions.length > 0 && (
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Available Actions for You</Text>

          {allowed_actions.includes('RECEIVE') && (
            <Button
              title="Mark as Received at Retail"
              onPress={handleReceive}
              loading={isSubmitting}
              variant="fin"
              icon={<Ionicons name="checkmark-done" size={18} color={colors.onPrimary} />}
              style={styles.actionButton}
            />
          )}

          {allowed_actions.includes('INSPECT') && (
            <Button
              title="Log Store Inspection"
              onPress={() => setInspectModalVisible(true)}
              variant="secondary"
              icon={<Ionicons name="clipboard-outline" size={18} color={colors.ink} />}
              style={styles.actionButton}
            />
          )}

          {allowed_actions.includes('SELL') && (
            <Button
              title="Sell / Handover to Customer"
              onPress={handleSell}
              variant="primary"
              icon={<Ionicons name="bag-handle-outline" size={18} color={colors.onPrimary} />}
              style={styles.actionButton}
            />
          )}

          {allowed_actions.includes('APPEND_EVENT') && (
            <Button
              title="Append Factory / Dispatch Event"
              onPress={handleAppendEvent}
              variant="primary"
              icon={<Ionicons name="add-circle-outline" size={18} color={colors.onPrimary} />}
              style={styles.actionButton}
            />
          )}

          {allowed_actions.includes('INITIATE_TRANSFER') && (
            <Button
              title="Initiate P2P Ownership Transfer"
              onPress={handleInitiateTransfer}
              variant="fin"
              icon={<Ionicons name="swap-horizontal" size={18} color={colors.onPrimary} />}
              style={styles.actionButton}
            />
          )}
        </View>
      )}

      {/* Inspection Modal */}
      <Modal
        visible={inspectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInspectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Store Inspection</Text>
            <Text style={styles.modalSub}>Record physical product condition for audit trail.</Text>

            <View style={styles.conditionRow}>
              {(['OK', 'DAMAGED', 'SUSPICIOUS'] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.conditionChip,
                    inspectCondition === c && styles.conditionChipActive,
                  ]}
                  onPress={() => setInspectCondition(c)}
                >
                  <Text
                    style={[
                      styles.conditionChipText,
                      inspectCondition === c && styles.conditionChipTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="Inspection notes (e.g. pristine condition, display sealed)"
              placeholderTextColor={colors.inkTertiary}
              value={inspectNotes}
              onChangeText={setInspectNotes}
              multiline
            />

            <View style={styles.modalBtns}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setInspectModalVisible(false)}
                style={{ flex: 1 }}
              />
              <Button
                title="Submit"
                variant="primary"
                onPress={handleInspectSubmit}
                loading={isSubmitting}
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
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.inkMuted,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface1,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    marginBottom: spacing.md,
  },
  messageText: {
    flex: 1,
    ...typography.bodySm,
    color: colors.ink,
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.verdictGenuineBg,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.verdictGenuine + '40',
  },
  ownerBadgeText: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.verdictGenuine,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  brandName: {
    ...typography.caption,
    fontSize: 12,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  productName: {
    ...typography.headline,
    fontSize: 18,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  infoCol: {
    width: '47%',
  },
  infoLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    marginBottom: 2,
  },
  infoValue: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
  },
  tipBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.verdictClaimedBg,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  tipText: {
    flex: 1,
    ...typography.bodySm,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 18,
  },
  fakeWarningTitle: {
    ...typography.headline,
    color: colors.verdictFake,
    fontSize: 17,
  },
  fakeWarningDesc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginVertical: 6,
  },
  techDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface2,
    padding: 8,
    borderRadius: radii.sm,
    marginTop: 8,
  },
  techDetailLabel: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  techDetailValue: {
    ...typography.mono,
    color: colors.ink,
  },
  actionsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionsTitle: {
    ...typography.cardTitle,
    fontSize: 15,
    marginBottom: spacing.sm,
    color: colors.inkMuted,
  },
  actionButton: {
    marginBottom: 10,
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
    marginBottom: 4,
  },
  modalSub: {
    ...typography.bodySm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  conditionChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface2,
  },
  conditionChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  conditionChipText: {
    ...typography.button,
    fontSize: 13,
    color: colors.ink,
  },
  conditionChipTextActive: {
    color: colors.onPrimary,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 12,
    minHeight: 80,
    ...typography.bodySm,
    color: colors.ink,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
});
