import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  roleColor?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  roleColor,
}) => {
  const isDisabled = disabled || loading;

  const getBackgroundColor = () => {
    if (isDisabled && variant !== 'ghost' && variant !== 'outline') {
      return colors.surfaceBorder;
    }
    if (roleColor && variant === 'primary') {
      return roleColor;
    }
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.surfaceElevated;
      case 'destructive':
        return colors.danger;
      case 'success':
        return colors.verdict.GENUINE;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') {
      return isDisabled ? colors.surfaceBorder : roleColor || colors.primary;
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (isDisabled) {
      return colors.textMuted;
    }
    switch (variant) {
      case 'outline':
      case 'ghost':
        return roleColor || colors.primary;
      case 'secondary':
        return colors.text;
      case 'destructive':
      case 'primary':
      case 'success':
      default:
        return '#FFFFFF';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 38;
      case 'lg':
        return 52;
      case 'md':
      default:
        return 46; // min 44px accessible touch target
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          minHeight: getHeight(),
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.base,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
          <Text
            style={[
              typography.bodyBold,
              styles.text,
              { color: getTextColor(), fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14 },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIconContainer: {
    marginRight: spacing.sm,
  },
  rightIconContainer: {
    marginLeft: spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
});
