// Typography styles matching Intercom editorial aesthetic
// Spec reference: DESIGN-intercom.md

import { TextStyle } from 'react-native';
import { colors } from './colors';

export const typography: Record<string, TextStyle> = {
  displayLg: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  displayMd: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkMuted,
    lineHeight: 20,
  },
  bodyLg: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.ink,
    lineHeight: 20,
  },
  bodySm: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.inkMuted,
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.inkSubtle,
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  mono: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
    color: colors.ink,
  },
};
