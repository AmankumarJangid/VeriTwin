import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { manufacturerApi } from '../../src/api/manufacturer';
import { colors } from '../../src/theme/colors';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';
import { formatDateTime } from '../../src/utils/format';

export default function ManufacturerDashboard() {
  const router = useRouter();
  const [days, setDays] = useState<number>(30);

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['manufacturer-analytics', days],
    queryFn: () => manufacturerApi.getAnalyticsOverview(days),
  });

  return (
    <Screen
      scrollable
      title="Manufacturer Hub"
      subtitle="Aurelia Brand Intelligence & Twins"
      roleAccent={colors.role.MANUFACTURER}
      onRefresh={refetch}
      refreshing={isLoading}
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/(manufacturer)/audit')}
          style={styles.auditIconBtn}
        >
          <Ionicons name="newspaper-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      }
    >
      {/* Time Range Toggle */}
      <View style={styles.rangeRow}>
        <Text style={[typography.captionBold, { color: colors.textSecondary }]}>TIMEFRAME</Text>
        <View style={styles.rangePill}>
          {[7, 30, 90].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.rangeTab, days === d && styles.rangeTabActive]}
              onPress={() => setDays(d)}
            >
              <Text
                style={[
                  typography.captionBold,
                  styles.rangeTabText,
                  days === d && styles.rangeTabTextActive,
                ]}
              >
                {d}D
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Navigation Cards */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(manufacturer)/products')}
        >
          <Ionicons name="pricetags-outline" size={20} color={colors.role.MANUFACTURER_LIGHT} />
          <Text style={[typography.captionBold, styles.navCardText]}>Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(manufacturer)/batches')}
        >
          <Ionicons name="layers-outline" size={20} color={colors.role.MANUFACTURER_LIGHT} />
          <Text style={[typography.captionBold, styles.navCardText]}>Batches</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navCard}
          onPress={() => router.push('/(manufacturer)/audit')}
        >
          <Ionicons name="shield-outline" size={20} color={colors.role.MANUFACTURER_LIGHT} />
          <Text style={[typography.captionBold, styles.navCardText]}>Audit Feed</Text>
        </TouchableOpacity>
      </View>

      {isLoading || !analytics ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : (
        <>
          {/* KPI Cards (§6.2) */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={[typography.captionBold, styles.kpiLabel]}>PRODUCTS</Text>
              <Text style={[typography.h1, styles.kpiValue]}>{analytics.totals.products}</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={[typography.captionBold, styles.kpiLabel]}>BATCHES</Text>
              <Text style={[typography.h1, styles.kpiValue]}>{analytics.totals.batches}</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={[typography.captionBold, styles.kpiLabel]}>DIGITAL TWINS</Text>
              <Text style={[typography.h1, styles.kpiValue, { color: colors.role.MANUFACTURER_LIGHT }]}>
                {analytics.totals.twins}
              </Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={[typography.captionBold, styles.kpiLabel]}>TOTAL SCANS</Text>
              <Text style={[typography.h1, styles.kpiValue, { color: colors.primary }]}>
                {analytics.totals.scans}
              </Text>
            </View>
          </View>

          {/* Clone Alerts (§6.2) */}
          {analytics.clone_alerts && analytics.clone_alerts.length > 0 && (
            <View style={styles.cloneAlertCard}>
              <View style={styles.alertHeaderRow}>
                <Ionicons name="warning" size={20} color={colors.verdict.ALREADY_CLAIMED} />
                <Text style={[typography.h3, { color: colors.verdict.ALREADY_CLAIMED }]}>
                  Counterfeit / Clone Alert
                </Text>
              </View>
              <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
                Multiple conflicting claims detected for the following registered serials:
              </Text>

              {analytics.clone_alerts.map((alert) => (
                <TouchableOpacity
                  key={alert.twin_id}
                  style={styles.alertItem}
                  onPress={() =>
                    router.push({
                      pathname: '/(manufacturer)/twins/[id]',
                      params: { id: alert.twin_id },
                    })
                  }
                >
                  <View>
                    <Text style={[typography.bodyBold, { color: colors.text }]}>
                      {alert.serial_number}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      Last scan: {formatDateTime(alert.last_seen)}
                    </Text>
                  </View>
                  <View style={styles.alertBadge}>
                    <Text style={[typography.captionBold, { color: colors.danger }]}>
                      {alert.already_claimed_scans} Suspicious Scans
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Verification Method Split & Fallback Rate */}
          <View style={styles.card}>
            <Text style={[typography.captionBold, styles.cardTitle]}>
              VERIFICATION METHOD DISTRIBUTION (§6.2)
            </Text>
            <View style={styles.splitRow}>
              <View style={styles.splitItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Watermark Scans
                </Text>
                <Text style={[typography.h2, { color: colors.primary }]}>
                  {analytics.verification_methods.WATERMARK}
                </Text>
              </View>

              <View style={styles.splitItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  QR Fallback Scans
                </Text>
                <Text style={[typography.h2, { color: colors.text }]}>
                  {analytics.verification_methods.QR}
                </Text>
              </View>

              <View style={styles.splitItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Fallback Rate
                </Text>
                <Text style={[typography.h2, { color: colors.warning }]}>
                  {Math.round(analytics.verification_methods.fallback_rate * 100)}%
                </Text>
              </View>
            </View>
          </View>

          {/* Verdicts Breakdown */}
          <View style={styles.card}>
            <Text style={[typography.captionBold, styles.cardTitle]}>VERDICT OUTCOMES</Text>
            <View style={styles.verdictRow}>
              <View style={[styles.verdictPill, { borderColor: colors.verdict.GENUINE }]}>
                <Text style={[typography.captionBold, { color: colors.verdict.GENUINE }]}>
                  GENUINE: {analytics.verdicts.GENUINE}
                </Text>
              </View>
              <View style={[styles.verdictPill, { borderColor: colors.verdict.ALREADY_CLAIMED }]}>
                <Text style={[typography.captionBold, { color: colors.verdict.ALREADY_CLAIMED }]}>
                  ALREADY CLAIMED: {analytics.verdicts.ALREADY_CLAIMED}
                </Text>
              </View>
              <View style={[styles.verdictPill, { borderColor: colors.verdict.FAKE }]}>
                <Text style={[typography.captionBold, { color: colors.verdict.FAKE }]}>
                  FAKE: {analytics.verdicts.FAKE}
                </Text>
              </View>
            </View>
          </View>

          {/* State Machine Status Distribution */}
          <View style={styles.card}>
            <Text style={[typography.captionBold, styles.cardTitle]}>
              DIGITAL TWIN STATUS PIPELINE
            </Text>
            <View style={styles.statusList}>
              {Object.entries(analytics.status_breakdown).map(([status, count]) => (
                <View key={status} style={styles.statusRow}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>{status}</Text>
                  <Text style={[typography.bodyBold, { color: colors.text }]}>{count} units</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  auditIconBtn: {
    padding: spacing.xs,
  },
  rangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rangePill: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  rangeTab: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  rangeTabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  rangeTabText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  rangeTabTextActive: {
    color: colors.text,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  navCard: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    gap: 4,
  },
  navCardText: {
    color: colors.text,
    fontSize: 11,
  },
  loaderContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  kpiLabel: {
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  kpiValue: {
    color: colors.text,
    marginTop: 4,
  },
  cloneAlertCard: {
    backgroundColor: 'rgba(217, 119, 6, 0.1)',
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(217, 119, 6, 0.4)',
    marginBottom: spacing.base,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  alertBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
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
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  splitItem: {
    alignItems: 'center',
  },
  verdictRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  verdictPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  statusList: {
    gap: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
});
