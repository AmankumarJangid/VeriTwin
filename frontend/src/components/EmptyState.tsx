// Intercom-styled EmptyState and ErrorState
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionTitle?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'cube-outline',
  title,
  description,
  actionTitle,
  onAction,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={32} color={colors.inkMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.desc}>{description}</Text>
      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="secondary"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
};

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <View style={[styles.card, styles.errorCard]}>
      <View style={[styles.iconContainer, styles.errorIcon]}>
        <Ionicons name="alert-circle-outline" size={32} color={colors.verdictFake} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.desc}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="outline"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  errorCard: {
    borderColor: colors.verdictFake + '40',
    backgroundColor: '#fffcfc',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  errorIcon: {
    backgroundColor: colors.verdictFakeBg,
  },
  title: {
    ...typography.cardTitle,
    marginBottom: 4,
    textAlign: 'center',
  },
  desc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing.md,
    height: 40,
    paddingHorizontal: 16,
  },
});
