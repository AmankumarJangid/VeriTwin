import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

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
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      const sec = Math.max(0, Math.floor(diffMs / 1000));
      setRemaining(sec);

      if (sec === 0 && onExpire) {
        onExpire();
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const progress = Math.min(1, Math.max(0, remaining / totalSeconds));
  const isCritical = remaining <= 20;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <View style={styles.container}>
      {/* Outer Glow Ring */}
      <View
        style={[
          styles.ringContainer,
          {
            borderColor: isCritical ? colors.danger : colors.primary,
            backgroundColor: isCritical
              ? 'rgba(239, 68, 68, 0.1)'
              : 'rgba(59, 130, 246, 0.1)',
          },
        ]}
      >
        <Text
          style={[
            typography.h2,
            styles.timeText,
            { color: isCritical ? colors.danger : colors.text },
          ]}
        >
          {timeFormatted}
        </Text>
        <Text style={[typography.caption, styles.label]}>
          {remaining > 0 ? 'Code expires in' : 'Code expired'}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.round(progress * 100)}%`,
              backgroundColor: isCritical ? colors.danger : colors.primary,
            },
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
  ringContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  timeText: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  label: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressBarTrack: {
    width: 200,
    height: 6,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
