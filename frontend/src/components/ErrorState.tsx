import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';
import { getErrorMessage } from '../utils/errors';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry, style }) => {
  const message = getErrorMessage(error);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
      </View>
      <Text style={[typography.h3, styles.title]}>Something went wrong</Text>
      <Text style={[typography.body, styles.message]}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          leftIcon={<Ionicons name="refresh-outline" size={16} color={colors.text} />}
          style={styles.retryBtn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: spacing.base,
  },
  retryBtn: {
    marginTop: spacing.xs,
  },
});
