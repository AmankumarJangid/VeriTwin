import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimelineEvent, LifecycleEventType } from '../types/api';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatDateTime, formatRelativeDate, formatShortHash } from '../utils/format';

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const [expandedHashes, setExpandedHashes] = useState<Record<string, boolean>>({});

  const toggleHash = (eventId: string) => {
    setExpandedHashes((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const getEventIcon = (type: LifecycleEventType) => {
    switch (type) {
      case 'MANUFACTURED':
        return 'cube-outline';
      case 'QA_PASSED':
        return 'checkbox-outline';
      case 'DISPATCHED_TO_RETAIL':
        return 'paper-plane-outline';
      case 'RECEIVED_AT_RETAIL':
        return 'storefront-outline';
      case 'INSPECTED':
        return 'search-outline';
      case 'FIRST_SALE':
        return 'card-outline';
      case 'RESOLD':
        return 'swap-horizontal-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getRoleColor = (role?: string) => {
    if (role === 'MANUFACTURER') return colors.role.MANUFACTURER;
    if (role === 'RETAILER') return colors.role.RETAILER;
    return colors.role.CONSUMER;
  };

  if (!events || events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          No lifecycle events recorded.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const isLatest = index === events.length - 1;
        const roleColor = getRoleColor(event.actor?.role);
        const isExpanded = !!expandedHashes[event.event_id];

        return (
          <View key={event.event_id} style={styles.eventRow}>
            {/* Timeline Line & Node */}
            <View style={styles.leftColumn}>
              <View
                style={[
                  styles.nodeCircle,
                  {
                    backgroundColor: isLatest ? roleColor : colors.surfaceElevated,
                    borderColor: roleColor,
                  },
                ]}
              >
                <Ionicons
                  name={getEventIcon(event.event_type)}
                  size={14}
                  color={isLatest ? '#FFFFFF' : roleColor}
                />
              </View>
              {index < events.length - 1 && <View style={styles.verticalLine} />}
            </View>

            {/* Event Details Card */}
            <View style={[styles.card, isLatest && styles.cardLatest]}>
              <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                  <Text style={[typography.captionBold, styles.typeText]}>
                    {event.event_type.replace(/_/g, ' ')}
                  </Text>
                </View>
                <Text style={[typography.caption, styles.timeText]}>
                  {formatRelativeDate(event.created_at)}
                </Text>
              </View>

              {/* Actor */}
              <View style={styles.actorRow}>
                <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                <Text style={[typography.bodyBold, styles.actorDisplay]}>
                  {event.actor?.display || 'Authorized Agent'}
                </Text>
                <View style={[styles.rolePill, { backgroundColor: `${roleColor}25` }]}>
                  <Text style={[typography.captionBold, { color: roleColor, fontSize: 10 }]}>
                    {event.actor?.role || 'SYSTEM'}
                  </Text>
                </View>
              </View>

              {/* Notes */}
              {event.notes ? (
                <Text style={[typography.body, styles.notes]}>{event.notes}</Text>
              ) : null}

              {/* Timestamp Details */}
              <Text style={[typography.caption, styles.timestampDetail]}>
                {formatDateTime(event.created_at)}
              </Text>

              {/* Hash Chain Lock */}
              <TouchableOpacity
                style={styles.hashRow}
                onPress={() => toggleHash(event.event_id)}
                activeOpacity={0.7}
              >
                <Ionicons name="lock-closed" size={12} color={colors.success} />
                <Text style={[typography.code, styles.hashText]}>
                  {isExpanded ? event.event_hash : formatShortHash(event.event_hash)}
                </Text>
                <Ionicons
                  name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={12}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  leftColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
    width: 28,
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.surfaceBorder,
    marginTop: -2,
    marginBottom: -2,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardLatest: {
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: colors.surfaceSubtle,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: borderRadius.xs,
  },
  typeText: {
    color: colors.textSecondary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  timeText: {
    color: colors.textMuted,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actorDisplay: {
    color: colors.text,
    fontSize: 13,
  },
  rolePill: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: borderRadius.full,
    marginLeft: 4,
  },
  notes: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  timestampDetail: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  hashText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
