// Intercom-styled Button component
// Spec reference: DESIGN-intercom.md
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii } from '../theme/spacing';

export type ButtonVariant = 'primary' | 'fin' | 'secondary' | 'danger' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getContainerStyle = () => {
    switch (variant) {
      case 'fin':
        return styles.btnFin;
      case 'secondary':
        return styles.btnSecondary;
      case 'danger':
        return styles.btnDanger;
      case 'outline':
        return styles.btnOutline;
      case 'primary':
      default:
        return styles.btnPrimary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.textSecondary;
      case 'outline':
        return styles.textOutline;
      case 'danger':
      case 'fin':
      case 'primary':
      default:
        return styles.textPrimary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getContainerStyle(),
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' ? colors.ink : colors.onPrimary}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[styles.textBase, getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: colors.ink,
  },
  btnFin: {
    backgroundColor: colors.finOrange,
  },
  btnSecondary: {
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  btnDanger: {
    backgroundColor: colors.verdictFake,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    ...typography.button,
  },
  textPrimary: {
    color: colors.onPrimary,
  },
  textSecondary: {
    color: colors.ink,
  },
  textOutline: {
    color: colors.ink,
  },
});
