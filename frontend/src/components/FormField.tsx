// Form field with label, clean Intercom hairline input, and error display
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  isPassword?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  helperText,
  isPassword = false,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.inkTertiary}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.inkMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    height: 48,
  },
  inputFocused: {
    borderColor: colors.ink,
  },
  inputError: {
    borderColor: colors.verdictFake,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.ink,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  errorText: {
    ...typography.caption,
    color: colors.verdictFake,
    marginTop: 4,
  },
  helperText: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 4,
  },
});
