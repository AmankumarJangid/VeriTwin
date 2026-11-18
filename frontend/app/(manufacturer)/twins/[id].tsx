import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { Timeline } from '../../../src/components/Timeline';
import { SpecList } from '../../../src/components/SpecList';
import { Button } from '../../../src/components/Button';
import { FormField } from '../../../src/components/FormField';
import { QRCodeCard } from '../../../src/components/QRCodeCard';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatCurrency, formatDateTime } from '../../../src/utils/format';
import { saveAssetToGallery, shareAsset } from '../../../src/utils/files';
import { getErrorMessage } from '../../../src/utils/errors';

export default function ManufacturerTwinDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [appendModalOpen, setAppendModalOpen] = useState(false);
  const [selectedEventType, setSelectedEventType] = useState<'QA_PASSED' | 'DISPATCHED_TO_RETAIL'>('QA_PASSED');
  const [selectedRetailerId, setSelectedRetailerId] = useState('');
  const [eventNotes, setEventNotes] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Queries
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mfg-twin-detail', id],
    queryFn: () => manufacturerApi.getTwinDetail(id),
  });

  const { data: retailersData } = useQuery({
    queryKey: ['mfg-retailers-list'],
    queryFn: () => manufacturerApi.getRetailers(),
    enabled: appendModalOpen,
  });

  const twin = data?.twin;
  const assets = data?.assets;
  const retailers = retailersData || [];

  // Cryptographic Integrity Check (§6.2 & §7.2)
  const handleCheckIntegrity = async () => {
    if (!twin) return;
    try {
      const res = await manufacturerApi.checkIntegrity(twin.twin_id);
      if (res.valid) {
        Alert.alert(
          'Cryptographic Integrity Verified ✅',
          `All ${res.events_checked} lifecycle events verified with continuous SHA-256 block hash integrity. Zero tampering detected.`
        );
      } else {
        Alert.alert(
          'Integrity Compromised ❌',
          `Tampering detected at event ID: ${res.broken_at_event_id}. The hash chain has been severed!`
        );
      }
    } catch (err) {
      Alert.alert('Integrity Check Failed', getErrorMessage(err));
    }
  };

  const handleAppendEvent = async () => {
    if (!twin) return;

    if (selectedEventType === 'DISPATCHED_TO_RETAIL' && !selectedRetailerId && retailers.length > 0) {
      Alert.alert('Retailer Required', 'Please select an authorized destination retailer.');
      return;
    }

    setSubmittingEvent(true);
    try {
      await manufacturerApi.appendTwinEvent(twin.twin_id, {
        event_type: selectedEventType,
        notes: eventNotes.trim() || undefined,
        metadata:
          selectedEventType === 'DISPATCHED_TO_RETAIL'
            ? { retailer_id: selectedRetailerId || retailers[0]?.user_id }
            : undefined,
      });

      setAppendModalOpen(false);
      setEventNotes('');
      refetch();
      Alert.alert('Event Appended', `New block mined: ${selectedEventType.replace(/_/g, ' ')}`);
    } catch (err) {
      Alert.alert('Failed to Append Event', getErrorMessage(err));
    } finally {
      setSubmittingEvent(false);
    }
  };

  return (
    <Screen
      scrollable
      title={twin?.serial_number || 'Twin Details'}
      subtitle={twin?.product.name}
      roleAccent={colors.role.MANUFACTURER}
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
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header Card */}
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                  {twin.product.brand.toUpperCase()}
                </Text>
                <Text style={[typography.h2, styles.title]}>{twin.product.name}</Text>
                <Text style={[typography.code, styles.twinCode]}>Twin Code: {twin.twin_code}</Text>
              </View>
              <StatusBadge status={twin.status} />
            </View>

            <View style={styles.priceRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                ORIGINAL MRP
              </Text>
              <Text style={[typography.h3, { color: colors.success }]}>
                {formatCurrency(twin.product.mrp)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Batch Lot:</Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {twin.batch.batch_no} ({twin.batch.factory_location})
              </Text>
            </View>

            {twin.current_retailer && (
              <View style={styles.metaRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Assigned Store:
                </Text>
                <Text style={[typography.bodyBold, { color: colors.role.RETAILER_LIGHT }]}>
                  {twin.current_retailer.organization_name}
                </Text>
              </View>
            )}

            {twin.owner && (
              <View style={styles.metaRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Registered Owner:
                </Text>
                <Text style={[typography.bodyBold, { color: colors.role.CONSUMER_LIGHT }]}>
                  {twin.owner.full_name}
                </Text>
              </View>
            )}
          </View>

          {/* Action Row: Verify Integrity & Append Event (§6.2) */}
          <View style={styles.actionButtonsRow}>
            <Button
              title="Verify Integrity ✅"
              onPress={handleCheckIntegrity}
              variant="secondary"
              size="md"
              style={{ flex: 1 }}
              leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />}
            />

            {(twin.status === 'MANUFACTURED' || twin.status === 'QA_PASSED') && (
              <Button
                title="Append Event"
                onPress={() => setAppendModalOpen(true)}
                variant="primary"
                roleColor={colors.role.MANUFACTURER}
                size="md"
                style={{ flex: 1 }}
                leftIcon={<Ionicons name="git-commit-outline" size={18} color="#FFFFFF" />}
              />
            )}
          </View>

          {/* Physical Assets Section (Watermarked Logo + Signed QR) */}
          {assets && (
            <View style={styles.card}>
              <Text style={[typography.captionBold, styles.cardTitle]}>
                AUTHENTICATION ARTIFACTS (§7.2)
              </Text>

              <View style={styles.assetPreviewRow}>
                <View style={styles.assetColumn}>
                  <Text style={[typography.caption, styles.assetLabel]}>Watermarked Logo</Text>
                  <Image source={{ uri: assets.watermarked_logo_url }} style={styles.assetImg} />
                  <Button
                    title="Save"
                    onPress={() => saveAssetToGallery(assets.watermarked_logo_url, `wm_${twin.serial_number}.png`)}
                    variant="secondary"
                    size="sm"
                    style={{ marginTop: 6 }}
                  />
                </View>

                <View style={styles.assetColumn}>
                  <Text style={[typography.caption, styles.assetLabel]}>Signed QR Key</Text>
                  <QRCodeCard value={assets.fallback_qr_payload} size={110} />
                  <Button
                    title="Save"
                    onPress={() => saveAssetToGallery(assets.fallback_qr_url, `qr_${twin.serial_number}.png`)}
                    variant="secondary"
                    size="sm"
                    style={{ marginTop: 6 }}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Specifications */}
          <Text style={[typography.captionBold, styles.sectionHeader]}>SPECIFICATIONS</Text>
          <SpecList specs={twin.product.specs} />

          {/* Lifecycle Hash Chain Timeline */}
          <Text style={[typography.captionBold, styles.sectionHeader]}>
            APPEND-ONLY HASH CHAIN LOG
          </Text>
          <Timeline events={twin.timeline} />

          {/* Append Event Sheet Modal */}
          <Modal visible={appendModalOpen} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={[typography.h3, { color: colors.text }]}>Append Lifecycle Event</Text>
                  <TouchableOpacity onPress={() => setAppendModalOpen(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Event Type Picker */}
                <Text style={[typography.captionBold, styles.modalLabel]}>EVENT TYPE</Text>
                <View style={styles.typeRow}>
                  {twin.status === 'MANUFACTURED' && (
                    <TouchableOpacity
                      style={[
                        styles.typeChoice,
                        selectedEventType === 'QA_PASSED' && styles.typeChoiceActive,
                      ]}
                      onPress={() => setSelectedEventType('QA_PASSED')}
                    >
                      <Text
                        style={[
                          typography.captionBold,
                          { color: selectedEventType === 'QA_PASSED' ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        QA_PASSED
                      </Text>
                    </TouchableOpacity>
                  )}

                  {twin.status === 'QA_PASSED' && (
                    <TouchableOpacity
                      style={[
                        styles.typeChoice,
                        selectedEventType === 'DISPATCHED_TO_RETAIL' && styles.typeChoiceActive,
                      ]}
                      onPress={() => setSelectedEventType('DISPATCHED_TO_RETAIL')}
                    >
                      <Text
                        style={[
                          typography.captionBold,
                          {
                            color:
                              selectedEventType === 'DISPATCHED_TO_RETAIL'
                                ? '#FFFFFF'
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        DISPATCHED_TO_RETAIL
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Retailer Picker if Dispatch */}
                {selectedEventType === 'DISPATCHED_TO_RETAIL' && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={[typography.captionBold, styles.modalLabel]}>
                      ASSIGN DESTINATION RETAILER
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                      {retailers.map((r) => {
                        const active = (selectedRetailerId || retailers[0]?.user_id) === r.user_id;
                        return (
                          <TouchableOpacity
                            key={r.user_id}
                            style={[styles.retailerChoice, active && styles.retailerChoiceActive]}
                            onPress={() => setSelectedRetailerId(r.user_id)}
                          >
                            <Text
                              style={[
                                typography.captionBold,
                                { color: active ? '#FFFFFF' : colors.text },
                              ]}
                            >
                              {r.organization_name}
                            </Text>
                            <Text
                              style={[
                                typography.caption,
                                { color: active ? '#E0E7FF' : colors.textMuted },
                              ]}
                            >
                              {r.email}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <FormField
                  label="Block Notes"
                  placeholder="e.g. Shipment airway bill #AWB-9024..."
                  value={eventNotes}
                  onChangeText={setEventNotes}
                  containerStyle={{ marginTop: spacing.md }}
                />

                <Button
                  title="Sign & Append Block"
                  onPress={handleAppendEvent}
                  loading={submittingEvent}
                  roleColor={colors.role.MANUFACTURER}
                  size="lg"
                  style={{ marginTop: spacing.base }}
                />
              </View>
            </View>
          </Modal>
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
  cardTitle: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    color: colors.text,
    marginTop: 2,
  },
  twinCode: {
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
    marginVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  assetPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
  },
  assetColumn: {
    alignItems: 'center',
    flex: 1,
  },
  assetLabel: {
    color: colors.textSecondary,
    marginBottom: 6,
  },
  assetImg: {
    width: 110,
    height: 110,
    borderRadius: borderRadius.md,
  },
  sectionHeader: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalLabel: {
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  typeChoice: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeChoiceActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  retailerChoice: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.sm,
    minWidth: 140,
  },
  retailerChoiceActive: {
    backgroundColor: colors.role.RETAILER,
    borderColor: colors.role.RETAILER_LIGHT,
  },
});
