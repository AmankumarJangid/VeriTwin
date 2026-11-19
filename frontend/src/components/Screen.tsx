// Intercom-styled base Screen container with safe-area, scroll & pull-to-refresh
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  roleBadge?: { text: string; color: string };
  headerRight?: React.ReactNode;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  bottomBar?: React.ReactNode;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  title,
  subtitle,
  roleBadge,
  headerRight,
  scrollable = true,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  bottomBar,
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {(title || headerRight || roleBadge) && (
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              {roleBadge && (
                <View style={[styles.roleBadge, { backgroundColor: roleBadge.color + '15' }]}>
                  <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>
                    {roleBadge.text}
                  </Text>
                </View>
              )}
              {title && <Text style={styles.title}>{title}</Text>}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            </View>
            {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
          </View>
        )}

        {scrollable ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.ink}
                  colors={[colors.finOrange]}
                />
              ) : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fixedContent, contentContainerStyle]}>{children}</View>
        )}

        {bottomBar && <View style={styles.bottomBarContainer}>{bottomBar}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.canvas,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  headerTitleContainer: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginBottom: 4,
  },
  roleBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    ...typography.headline,
    fontSize: 22,
  },
  subtitle: {
    ...typography.subhead,
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.section,
  },
  fixedContent: {
    flex: 1,
    padding: spacing.md,
  },
  bottomBarContainer: {
    backgroundColor: colors.surface1,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    padding: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
  },
});
