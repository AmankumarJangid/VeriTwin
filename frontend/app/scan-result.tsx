import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/Screen';
import { VerdictBanner } from '../src/components/VerdictBanner';
import { StatusBadge } from '../src/components/StatusBadge';
import { SpecList } from '../src/components/SpecList';
import { Timeline } from '../src/components/Timeline';
import { Button } from '../src/components/Button';
import { ScanResponseData, TwinView, LimitedTwinView } from '../src/types/api';
import { colors } from '../src/theme/colors';
import { spacing, borderRadius } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';
import { formatCurrency, formatDateTime } from '../src/utils/format';
import { retailerApi } from '../src/api/retailer';

export default function ScanResultScreen() {
  const router = useRouter();
  const scanData: ScanResponseData = (global as any).__VERITWIN_SCAN_RESULT__;

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (!scanData) {
    return (
      <Screen title="Verification Result">
        <View style={styles.errorContainer}>
          <Text style={[typography.h3, { color: colors.textSecondary }]}>
            No scan record available.
          </Text>
          <Button
            title="Return Home"
            onPress={() => router.replace('/')}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </Screen>
    );
  }

  const { verdict, verification_method, confidence, is_owner, allowed_actions, twin, message, reason } =
    scanData;
  const isFullView = twin && 'timeline' in twin;
  const fullTwin = isFullView ? (twin as TwinView) : null;
  const limitedTwin = !isFullView && twin ? (twin as LimitedTwinView) : null;

  // Handle Retailer RECEIVE action (§5.5)
  const handleReceive = async () => {
    if (!fullTwin) return;
    setActionLoading(true);
    try {
      await retailerApi.appendEvent(fullTwin.twin_id, {
        event_type: 'RECEIVED_AT_RETAIL',
        notes: 'Verified and received at retail inventory via scanner.',
        metadata: { condition: 'OK' },
      });
      Alert.alert('Unit Received', 'This digital twin is now registered in your retail inventory.');
      router.replace('/(retailer)');
    } catch (err: any) {
      Alert.alert('Action Failed', err.message || 'Unable to receive item.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Retailer INSPECT action (§5.5)
  const handleInspect = async (condition: 'OK' | 'DAMAGED' | 'SUSPICIOUS') => {
    if (!fullTwin) return;
    setActionLoading(true);
    try {
      await retailerApi.appendEvent(fullTwin.twin_id, {
        event_type: 'INSPECTED',
        notes: `Physical verification check: Condition ${condition}`,
        metadata: { condition },
      });
      setInspectModalOpen(false);
      Alert.alert('Inspection Logged', `Condition recorded as ${condition} on the hash chain.`);
    } catch (err: any) {
      Alert.alert('Inspection Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Screen
      scrollable
      title="Verification Result"
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Verdict Banner (§5.5) */}
        <VerdictBanner
          verdict={verdict}
          method={verification_method}
          confidence={confidence}
          message={message}
          isOwner={is_owner}
        />

        {/* FAKE VERDICT VIEW */}
        {verdict === 'FAKE' && (
          <View style={styles.card}>
            <View style={styles.fakeDetailRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                Failure Reason:
              </Text>
              <Text style={[typography.code, { color: colors.danger }]}>
                {reason || 'TAMPERED_OR_UNKNOWN_SIGNATURE'}
              </Text>
            </View>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
              The scanned product failed cryptographic validation. No record exists in the authorized
              manufacturer registry.
            </Text>

            <Button
              title="Report Suspicious Product"
              onPress={() =>
                Alert.alert(
                  'Counterfeit Report Submitted',
                  'Incident logged. VeriTwin Brand Protection department has been notified.'
                )
              }
              variant="destructive"
              style={{ marginTop: spacing.lg }}
              leftIcon={<Ionicons name="flag-outline" size={18} color="#FFFFFF" />}
            />
          </View>
        )}

        {/* ALREADY CLAIMED VIEW (§5.5) */}
        {verdict === 'ALREADY_CLAIMED' && limitedTwin && (
          <View style={styles.card}>
            <View style={styles.headerInfo}>
              <Text style={[typography.captionBold, { color: colors.verdict.ALREADY_CLAIMED }]}>
                REGISTERED ASSET
              </Text>
              <Text style={[typography.h2, styles.prodTitle]}>{limitedTwin.product.name}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {limitedTwin.product.brand} • SKU {limitedTwin.product.sku}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Serial:</Text>
              <Text style={[typography.code, { color: colors.text }]}>
                {limitedTwin.serial_number}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                Initial Claimed Date:
              </Text>
              <Text style={[typography.body, { color: colors.text }]}>
                {formatDateTime(limitedTwin.claimed_at)}
              </Text>
            </View>

            <View style={styles.advisoryBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
              <Text style={[typography.body, styles.advisoryText]}>
                This luxury item is bound to another user's vault. To legally purchase it second-hand,
                ask the current owner to tap "Sell / Transfer" in their VeriTwin app to generate an
                authenticated P2P transfer code.
              </Text>
            </View>
          </View>
        )}

        {/* GENUINE VERDICT FULL VIEW (§5.5) */}
        {verdict === 'GENUINE' && fullTwin && (
          <>
            {/* Product Summary Card */}
            <View style={styles.card}>
              <View style={styles.productTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.captionBold, { color: colors.primary }]}>
                    {fullTwin.product.brand.toUpperCase()}
                  </Text>
                  <Text style={[typography.h2, styles.prodTitle]}>{fullTwin.product.name}</Text>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    SKU {fullTwin.product.sku} • {fullTwin.product.category}
                  </Text>
                </View>
                <StatusBadge status={fullTwin.status} />
              </View>

              <View style={styles.priceRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  ORIGINAL MRP
                </Text>
                <Text style={[typography.h2, { color: colors.success }]}>
                  {formatCurrency(fullTwin.product.mrp)}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Serial Number:
                </Text>
                <Text style={[typography.code, { color: colors.text }]}>
                  {fullTwin.serial_number}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Batch No:
                </Text>
                <Text style={[typography.body, { color: colors.text }]}>
                  {fullTwin.batch.batch_no} ({fullTwin.batch.factory_location})
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>
                  Material:
                </Text>
                <Text style={[typography.body, { color: colors.text }]}>
                  {fullTwin.product.material}
                </Text>
              </View>
            </View>

            {/* Allowed Actions Section (§5.5) */}
            {allowed_actions && allowed_actions.length > 0 && (
              <View style={styles.actionCard}>
                <Text style={[typography.captionBold, styles.actionTitle]}>
                  AUTHORIZED WORKFLOW ACTIONS
                </Text>

                <View style={styles.actionButtonStack}>
                  {allowed_actions.includes('RECEIVE') && (
                    <Button
                      title="Mark as Received at Retail"
                      onPress={handleReceive}
                      loading={actionLoading}
                      variant="primary"
                      roleColor={colors.role.RETAILER}
                      leftIcon={<Ionicons name="storefront-outline" size={18} color="#FFFFFF" />}
                    />
                  )}

                  {allowed_actions.includes('INSPECT') && (
                    <Button
                      title="Log Retail Inspection"
                      onPress={() => setInspectModalOpen(true)}
                      variant="secondary"
                      leftIcon={<Ionicons name="search-outline" size={18} color={colors.text} />}
                    />
                  )}

                  {allowed_actions.includes('SELL') && (
                    <Button
                      title="Sell Unit (POS Handover)"
                      onPress={() =>
                        router.push({
                          pathname: '/(retailer)/sell/[twinId]',
                          params: { twinId: fullTwin.twin_id },
                        })
                      }
                      variant="primary"
                      roleColor={colors.role.RETAILER}
                      leftIcon={<Ionicons name="card-outline" size={18} color="#FFFFFF" />}
                    />
                  )}

                  {allowed_actions.includes('APPEND_EVENT') && (
                    <Button
                      title="Manage Twin & Lifecycle"
                      onPress={() =>
                        router.push({
                          pathname: '/(manufacturer)/twins/[id]',
                          params: { id: fullTwin.twin_id },
                        })
                      }
                      variant="primary"
                      roleColor={colors.role.MANUFACTURER}
                      leftIcon={<Ionicons name="construct-outline" size={18} color="#FFFFFF" />}
                    />
                  )}

                  {allowed_actions.includes('INITIATE_TRANSFER') && (
                    <Button
                      title="Initiate Resale / Transfer"
                      onPress={() =>
                        router.push({
                          pathname: '/(consumer)/transfer/[twinId]',
                          params: { twinId: fullTwin.twin_id },
                        })
                      }
                      variant="primary"
                      roleColor={colors.role.CONSUMER}
                      leftIcon={<Ionicons name="swap-horizontal-outline" size={18} color="#FFFFFF" />}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Inspection Condition Selector */}
            {inspectModalOpen && (
              <View style={styles.conditionCard}>
                <Text style={[typography.captionBold, { color: colors.warning }]}>
                  SELECT INSPECTION CONDITION
                </Text>
                <View style={styles.conditionRow}>
                  <Button
                    title="OK (Pristine)"
                    onPress={() => handleInspect('OK')}
                    variant="success"
                    size="sm"
                    loading={actionLoading}
                  />
                  <Button
                    title="Damaged"
                    onPress={() => handleInspect('DAMAGED')}
                    variant="secondary"
                    size="sm"
                    loading={actionLoading}
                  />
                  <Button
                    title="Suspicious"
                    onPress={() => handleInspect('SUSPICIOUS')}
                    variant="destructive"
                    size="sm"
                    loading={actionLoading}
                  />
                </View>
              </View>
            )}

            {/* Specifications */}
            <Text style={[typography.captionBold, styles.sectionHeader]}>
              TECHNICAL SPECIFICATIONS
            </Text>
            <SpecList specs={fullTwin.product.specs} />

            {/* Hash-Chained Timeline (§7) */}
            <Text style={[typography.captionBold, styles.sectionHeader]}>
              IMMUTABLE LIFECYCLE TIMELINE
            </Text>
            <Timeline events={fullTwin.timeline} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.base,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
    marginVertical: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  actionCard: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.base,
  },
  actionTitle: {
    color: colors.textMuted,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  actionButtonStack: {
    gap: spacing.sm,
  },
  conditionCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.base,
  },
  conditionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  advisoryBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  advisoryText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  fakeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    marginBottom: spacing.md,
  },
});
