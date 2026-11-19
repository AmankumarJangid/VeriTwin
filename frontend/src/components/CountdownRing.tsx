// Countdown timer derived strictly from expires_at timestamp
// Spec reference: 02_FRONTEND.md §7
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface CountdownRingProps {
  expiresAt: string;
  totalSeconds?: number;
  onExpire?: () => void;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({
  expiresAt,
  totalSeconds = 120,
  onExpire,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    return remaining;
  });

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        onExpire?.();
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  const progressPercent = Math.min(100, Math.max(0, (secondsLeft / totalSeconds) * 100));
  const isExpiringSoon = secondsLeft <= 20;

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.circle,
          isExpiringSoon && styles.circleWarning,
        ]}
      >
        <Text
          style={[
            styles.timeText,
            isExpiringSoon && styles.timeWarning,
          ]}
        >
          {formatMinSec(secondsLeft)}
        </Text>
        <Text style={styles.labelText}>
          {secondsLeft > 0 ? 'valid for' : 'expired'}
        </Text>
      </View>

      {/* Progress Bar representation */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${progressPercent}%` },
            isExpiringSoon && styles.barFillWarning,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: colors.finOrange,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface1,
    marginBottom: spacing.xs,
  },
  circleWarning: {
    borderColor: colors.verdictFake,
  },
  timeText: {
    ...typography.displayMd,
    fontSize: 22,
    color: colors.ink,
  },
  timeWarning: {
    color: colors.verdictFake,
  },
  labelText: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  barTrack: {
    width: 140,
    height: 4,
    backgroundColor: colors.hairline,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.finOrange,
  },
  barFillWarning: {
    backgroundColor: colors.verdictFake,
  },
});
