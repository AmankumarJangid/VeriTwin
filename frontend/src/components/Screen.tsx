import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ViewStyle,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { useAuthStore } from '../store/authStore';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  headerLeft?: React.ReactNode;
  roleAccent?: string;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  title,
  subtitle,
  headerRight,
  headerLeft,
  roleAccent,
}) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const activeRoleColor =
    roleAccent ||
    (user?.role === 'MANUFACTURER'
      ? colors.role.MANUFACTURER
      : user?.role === 'RETAILER'
      ? colors.role.RETAILER
      : colors.role.CONSUMER);

  return (
    <SafeAreaView style={[styles.container, style]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header if title is provided */}
      {title && (
        <View style={styles.header}>
          <View style={styles.headerLeftContainer}>
            {headerLeft}
            <View>
              <View style={styles.titleRow}>
                <View style={[styles.roleDot, { backgroundColor: activeRoleColor }]} />
                <Text style={[typography.h2, styles.title]}>{title}</Text>
              </View>
              {subtitle && <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text>}
            </View>
          </View>
          {headerRight && <View style={styles.headerRightContainer}>{headerRight}</View>}
        </View>
      )}

      {/* Content */}
      {scrollable ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            contentContainerStyle,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={activeRoleColor}
                colors={[activeRoleColor]}
              />
            ) : undefined
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentContainerStyle, { paddingBottom: insets.bottom }]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  headerLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    color: colors.text,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
  },
  content: {
    flex: 1,
    padding: spacing.base,
  },
});
