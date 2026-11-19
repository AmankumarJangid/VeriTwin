// Intercom-inspired color system for VeriTwin
// Spec reference: DESIGN-intercom.md & 02_FRONTEND.md

export const colors = {
  // Editorial Canvas & Surfaces
  canvas: '#f5f1ec',        // Soft cream-white ground
  surface1: '#ffffff',      // Pure white tile
  surface2: '#ebe7e1',      // Soft muted neutral surface
  surfaceElevated: '#ffffff',

  // Ink Typography
  ink: '#111111',           // Deep charcoal primary type
  inkMuted: '#626260',      // Secondary text
  inkSubtle: '#7b7b78',     // Minor metadata, captions
  inkTertiary: '#9c9fa5',   // Disabled / placeholder
  onPrimary: '#ffffff',     // Text on primary buttons

  // Borders & Dividers
  hairline: '#d3cec6',      // 1px clean card/tile borders
  hairlineSoft: '#ebe7e1',  // Subtle list separators

  // Brand & Fin Accents
  finOrange: '#ff5600',     // Intercom signature Fin Orange
  finOrangeLight: '#fff2eb',
  brandBlue: '#0007cb',

  // Semantic & Verdicts
  verdictGenuine: '#16A34A',      // Crisp genuine green
  verdictGenuineBg: '#ecfdf5',
  verdictFake: '#DC2626',         // Counterfeit red
  verdictFakeBg: '#fef2f2',
  verdictClaimed: '#D97706',      // Already claimed amber
  verdictClaimedBg: '#fffbeb',
  verdictLowConfidence: '#2563EB',// Blue / neutral
  verdictLowConfidenceBg: '#eff6ff',

  // Twin Status Colors
  statusManufactured: '#6B7280',  // Grey
  statusQaPassed: '#2563EB',      // Blue
  statusInTransit: '#7C3AED',     // Purple
  statusInRetail: '#0D9488',      // Teal
  statusSold: '#16A34A',          // Green

  // Role Accent Colors (Distinct header and pill highlights)
  roleManufacturer: '#4F46E5',    // Indigo
  roleRetailer: '#EA580C',        // Warm Orange
  roleConsumer: '#0D9488',        // Teal
};
