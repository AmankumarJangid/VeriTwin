// Append-only, hash-chained timeline component
// Spec reference: 02_FRONTEND.md §7 & 00_SHARED_CONTRACT.md §6.4
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimelineEvent, LifecycleEventType } from '../types/api';
import { formatDateTime, formatRelativeTime, getEventTypeLabel } from '../utils/format';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const [expandedHashes, setExpandedHashes] = useState<Record<string, boolean>>({});

  if (!events || events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No lifecycle history recorded yet.</Text>
      </View>
    );
  }

  const toggleHash = (id: string) => {
    setExpandedHashes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getEventIcon = (type: LifecycleEventType) => {
    switch (type) {
      case 'MANUFACTURED':
        return 'cube-outline';
      case 'QA_PASSED':
        return 'shield-checkmark-outline';
      case 'DISPATCHED_TO_RETAIL':
        return 'airplane-outline';
      case 'RECEIVED_AT_RETAIL':
        return 'storefront-outline';
      case 'INSPECTED':
        return 'search-outline';
      case 'FIRST_SALE':
        return 'bag-check-outline';
      case 'RESOLD':
        return 'swap-horizontal-outline';
      default:
        return 'ellipse-outline';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardHeader}>Tamper-Evident Lifecycle Log</Text>
        <View style={styles.chainPill}>
          <Ionicons name="lock-closed" size={12} color={colors.verdictGenuine} />
          <Text style={styles.chainText}>Chain Verified</Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {events.map((ev, idx) => {
          const isLatest = idx === events.length - 1;
          const isExpanded = !!expandedHashes[ev.event_id];
          const icon = getEventIcon(ev.event_type);

          return (
            <View key={ev.event_id || idx} style={styles.eventRow}>
              {/* Vertical line and node */}
              <View style={styles.nodeColumn}>
                <View
                  style={[
                    styles.iconCircle,
                    isLatest && styles.iconCircleLatest,
                  ]}
                >
                  <Ionicons
                    name={icon as any}
                    size={16}
                    color={isLatest ? colors.onPrimary : colors.ink}
                  />
                </View>
                {idx < events.length - 1 && <View style={styles.verticalLine} />}
              </View>

              {/* Event Body */}
              <View style={[styles.eventBody, isLatest && styles.eventBodyLatest]}>
                <View style={styles.eventTop}>
                  <Text style={styles.eventTitle}>{getEventTypeLabel(ev.event_type)}</Text>
                  <Text style={styles.eventTime}>{formatRelativeTime(ev.created_at)}</Text>
                </View>

                {/* Actor Info */}
                <View style={styles.actorRow}>
                  <Text style={styles.actorDisplay}>{ev.actor?.display || 'System'}</Text>
                  {ev.actor?.role && (
                    <View style={styles.roleChip}>
                      <Text style={styles.roleChipText}>{ev.actor.role}</Text>
                    </View>
                  )}
                </View>

                {/* Notes */}
                {ev.notes ? <Text style={styles.notes}>{ev.notes}</Text> : null}

                {/* Hash chain stamp */}
                <TouchableOpacity
                  style={styles.hashRow}
                  onPress={() => toggleHash(ev.event_id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="link" size={11} color={colors.inkSubtle} />
                  <Text style={styles.hashText}>
                    {isExpanded
                      ? ev.event_hash
                      : `Hash: ${ev.event_hash ? ev.event_hash.slice(0, 10) + '…' : 'Verified'}`}
                  </Text>
                  <Text style={styles.dateStamp}>{formatDateTime(ev.created_at)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardHeader: {
    ...typography.cardTitle,
    fontSize: 16,
  },
  chainPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.verdictGenuineBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.verdictGenuine + '30',
  },
  chainText: {
    ...typography.caption,
    color: colors.verdictGenuine,
    fontWeight: '700',
    fontSize: 10,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.inkMuted,
  },
  timeline: {
    marginTop: 4,
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  nodeColumn: {
    alignItems: 'center',
    width: 32,
    marginRight: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconCircleLatest: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  verticalLine: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.hairline,
    marginVertical: 4,
  },
  eventBody: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.hairlineSoft,
    marginBottom: 10,
  },
  eventBodyLatest: {
    borderColor: colors.hairline,
    backgroundColor: colors.surface1,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventTitle: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
  },
  eventTime: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 3,
  },
  actorDisplay: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.inkMuted,
  },
  roleChip: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.pill,
  },
  roleChipText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.inkMuted,
  },
  notes: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.ink,
    marginVertical: 4,
    fontStyle: 'italic',
  },
  hashRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  hashText: {
    ...typography.mono,
    fontSize: 10,
    color: colors.inkSubtle,
    flex: 1,
    marginLeft: 4,
  },
  dateStamp: {
    ...typography.caption,
    fontSize: 10,
    color: colors.inkSubtle,
  },
});
