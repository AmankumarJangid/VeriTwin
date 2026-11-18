export const colors = {
  // Brand & Background
  background: '#0B0F19',
  surface: '#111827',
  surfaceElevated: '#1F2937',
  surfaceBorder: '#374151',
  surfaceSubtle: '#1E293B',

  // Text
  text: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textInverse: '#0B0F19',

  // Verdict Colors (§4.4)
  verdict: {
    GENUINE: '#16A34A',
    GENUINE_BG: 'rgba(22, 163, 74, 0.15)',
    FAKE: '#DC2626',
    FAKE_BG: 'rgba(220, 38, 38, 0.15)',
    ALREADY_CLAIMED: '#D97706',
    ALREADY_CLAIMED_BG: 'rgba(217, 119, 6, 0.15)',
    LOW_CONFIDENCE: '#2563EB',
    LOW_CONFIDENCE_BG: 'rgba(37, 99, 235, 0.15)',
  },

  // Twin Status Colors (§4.4)
  status: {
    MANUFACTURED: '#64748B',
    MANUFACTURED_BG: 'rgba(100, 116, 139, 0.2)',
    QA_PASSED: '#2563EB',
    QA_PASSED_BG: 'rgba(37, 99, 235, 0.2)',
    IN_TRANSIT: '#7C3AED',
    IN_TRANSIT_BG: 'rgba(124, 58, 237, 0.2)',
    IN_RETAIL: '#0D9488',
    IN_RETAIL_BG: 'rgba(13, 148, 136, 0.2)',
    SOLD: '#16A34A',
    SOLD_BG: 'rgba(22, 163, 74, 0.2)',
  },

  // Role Accent Colors (§4.4)
  role: {
    MANUFACTURER: '#6366F1', // Indigo
    MANUFACTURER_LIGHT: '#818CF8',
    MANUFACTURER_BG: 'rgba(99, 102, 241, 0.15)',

    RETAILER: '#F97316', // Orange
    RETAILER_LIGHT: '#FB923C',
    RETAILER_BG: 'rgba(249, 115, 22, 0.15)',

    CONSUMER: '#14B8A6', // Teal
    CONSUMER_LIGHT: '#2DD4BF',
    CONSUMER_BG: 'rgba(20, 184, 166, 0.15)',
  },

  // UI Semantic
  primary: '#3B82F6',
  primaryDark: '#1D4ED8',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#06B6D4',
  divider: '#1F2937',
  overlay: 'rgba(0, 0, 0, 0.75)',
};

export type ThemeColors = typeof colors;
