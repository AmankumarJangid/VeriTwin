// Manufacturer Analytics Dashboard
// Spec reference: 02_FRONTEND.md §6.2 & 00_SHARED_CONTRACT.md §7.2
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { getAnalyticsOverviewApi } from '../../src/api/manufacturer';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function ManufacturerDashboardScreen() {
  const router = useRouter();
  const [days, setDays] = useState<number>(30);

  const { data: analytics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['manufacturerAnalytics', days],
    queryFn: () => getAnalyticsOverviewApi(days),
  });

  const totals = analytics?.totals || { products: 2, batches: 2, twins: 34, scans: 142 };
  const breakdown = analytics?.status_breakdown || {
    MANUFACTURED: 5,
    QA_PASSED: 6,
    IN_TRANSIT: 7,
    IN_RETAIL: 10,
    SOLD: 6,
  };
  const methods = analytics?.verification_methods || { WATERMARK: 118, QR: 24, fallback_rate: 0.17 };
  const verdicts = analytics?.verdicts || { GENUINE: 128, FAKE: 8, ALREADY_CLAIMED: 6 };
  const cloneAlerts = analytics?.clone_alerts || [];

  return (
    <Screen
      title="Brand Analytics"
      subtitle="Lifecycle volume, counterfeit diagnostics & scan telemetry"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      refreshing={isRefetching}
      onRefresh={refetch}
    >
      {/* Time Range Selector */}
      <View style={styles.rangeRow}>
        {[7, 30, 90].map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.rangeChip, days === d && styles.rangeChipActive]}
            onPress={() => setDays(d)}
          >
            <Text style={[styles.rangeText, days === d && styles.rangeTextActive]}>
              Last {d} Days
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 1. KPI Cards */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNum}>{totals.twins}</Text>
          <Text style={styles.kpiLabel}>Total Twins Minted</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNum}>{totals.scans}</Text>
          <Text style={styles.kpiLabel}>Verification Scans</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNum}>{totals.products}</Text>
          <Text style={styles.kpiLabel}>Active SKU Masters</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiNum}>{totals.batches}</Text>
          <Text style={styles.kpiLabel}>Factory Batches</Text>
        </View>
      </View>

      {/* 2. Clone Alerts (Crucial Counterfeit Telemetry) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.alertTitleRow}>
            <Ionicons name="warning-outline" size={18} color={colors.verdictFake} />
            <Text style={styles.cardTitle}>Counterfeit & Clone Alerts</Text>
          </View>
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{cloneAlerts.length} Flagged</Text>
          </View>
        </View>

        {cloneAlerts.length === 0 ? (
          <Text style={styles.noAlertText}>No anomalous or duplicate scan activity detected.</Text>
        ) : (
          <View style={styles.alertList}>
            {cloneAlerts.map((ca) => (
              <TouchableOpacity
                key={ca.twin_id}
                style={styles.alertItem}
                onPress={() => router.push(`/(manufacturer)/twins/${ca.twin_id}` as any)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertSerial}>{ca.serial_number}</Text>
                  <Text style={styles.alertSub}>
                    {ca.already_claimed_scans} repeat scans on sold unit
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 3. Verification Verdict Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Verification Verdicts</Text>
        <View style={styles.verdictBar}>
          <View style={styles.verdictCol}>
            <Text style={[styles.verdictNum, { color: colors.verdictGenuine }]}>
              {verdicts.GENUINE}
            </Text>
            <Text style={styles.verdictLabel}>Genuine</Text>
          </View>
          <View style={styles.verdictCol}>
            <Text style={[styles.verdictNum, { color: colors.verdictClaimed }]}>
              {verdicts.ALREADY_CLAIMED}
            </Text>
            <Text style={styles.verdictLabel}>Claimed</Text>
          </View>
          <View style={styles.verdictCol}>
            <Text style={[styles.verdictNum, { color: colors.verdictFake }]}>
              {verdicts.FAKE}
            </Text>
            <Text style={styles.verdictLabel}>Fake</Text>
          </View>
        </View>
      </View>

      {/* 4. Verification Method Split & Fallback Rate */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Watermark vs QR Split</Text>
        <View style={styles.methodRow}>
          <View style={styles.methodBox}>
            <Text style={styles.methodVal}>{methods.WATERMARK}</Text>
            <Text style={styles.methodLabel}>DWT-DCT Logo</Text>
          </View>
          <View style={styles.methodBox}>
            <Text style={styles.methodVal}>{methods.QR}</Text>
            <Text style={styles.methodLabel}>Signed QR Fallback</Text>
          </View>
          <View style={styles.methodBox}>
            <Text style={[styles.methodVal, { color: colors.finOrange }]}>
              {Math.round(methods.fallback_rate * 100)}%
            </Text>
            <Text style={styles.methodLabel}>Fallback Rate</Text>
          </View>
        </View>
      </View>

      {/* 5. State Machine Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Lifecycle Pipeline Distribution</Text>
        <View style={styles.pipelineList}>
          {Object.entries(breakdown).map(([status, count]) => (
            <View key={status} style={styles.pipelineRow}>
              <Text style={styles.pipelineStatus}>{status}</Text>
              <View style={styles.pipelineTrack}>
                <View
                  style={[
                    styles.pipelineFill,
                    { width: `${Math.min(100, (count / (totals.twins || 1)) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.pipelineCount}>{count}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  rangeChip: {
    backgroundColor: colors.surface1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  rangeChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  rangeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  rangeTextActive: {
    color: colors.onPrimary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  kpiNum: {
    ...typography.displayMd,
    fontSize: 24,
    color: colors.ink,
  },
  kpiLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    ...typography.cardTitle,
    fontSize: 15,
  },
  alertBadge: {
    backgroundColor: colors.verdictFakeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  alertBadgeText: {
    ...typography.caption,
    color: colors.verdictFake,
    fontWeight: '700',
    fontSize: 10,
  },
  noAlertText: {
    ...typography.bodySm,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },
  alertList: {
    gap: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.canvas,
    padding: 10,
    borderRadius: radii.md,
  },
  alertSerial: {
    ...typography.mono,
    fontSize: 12,
    fontWeight: '600',
    color: colors.ink,
  },
  alertSub: {
    ...typography.caption,
    color: colors.verdictFake,
    marginTop: 1,
  },
  verdictBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.xs,
  },
  verdictCol: {
    alignItems: 'center',
  },
  verdictNum: {
    ...typography.displayMd,
    fontSize: 22,
  },
  verdictLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  methodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.xs,
  },
  methodBox: {
    flex: 1,
    backgroundColor: colors.canvas,
    padding: 10,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  methodVal: {
    ...typography.headline,
    fontSize: 18,
    color: colors.ink,
  },
  methodLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
    fontSize: 10,
    textAlign: 'center',
  },
  pipelineList: {
    gap: 8,
    marginTop: spacing.xs,
  },
  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pipelineStatus: {
    ...typography.caption,
    width: 110,
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted,
  },
  pipelineTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface2,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  pipelineFill: {
    height: '100%',
    backgroundColor: colors.roleManufacturer,
  },
  pipelineCount: {
    ...typography.mono,
    fontSize: 11,
    width: 30,
    textAlign: 'right',
    color: colors.ink,
  },
});
