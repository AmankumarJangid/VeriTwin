import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { devSettings } from '../api/mocks/mockDatabase';
import { useAuthStore } from '../store/authStore';
import { UserRole } from '../types/api';
import { useRouter } from 'expo-router';

interface DevMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DevMenuModal: React.FC<DevMenuModalProps> = ({ visible, onClose }) => {
  const { user, switchDemoUser } = useAuthStore();
  const router = useRouter();
  const [, setRerender] = useState({});

  const forceUpdate = () => setRerender({});

  const handleRoleSwap = async (role: UserRole) => {
    await switchDemoUser(role);
    onClose();
    if (role === 'MANUFACTURER') router.replace('/(manufacturer)');
    else if (role === 'RETAILER') router.replace('/(retailer)');
    else router.replace('/(consumer)');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="construct-outline" size={22} color={colors.warning} />
              <Text style={[typography.h3, styles.title]}>VeriTwin Dev Tools</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Quick Role Impersonation */}
            <Text style={[typography.captionBold, styles.sectionTitle]}>
              SWITCH ACTIVE DEMO ACCOUNT (§8)
            </Text>
            <View style={styles.buttonGrid}>
              <TouchableOpacity
                style={[
                  styles.choiceBtn,
                  user?.role === 'MANUFACTURER' && {
                    borderColor: colors.role.MANUFACTURER,
                    backgroundColor: colors.role.MANUFACTURER_BG,
                  },
                ]}
                onPress={() => handleRoleSwap('MANUFACTURER')}
              >
                <Text style={[typography.bodyBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                  🏭 Manufacturer
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  maker@veritwin.dev
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choiceBtn,
                  user?.role === 'RETAILER' && {
                    borderColor: colors.role.RETAILER,
                    backgroundColor: colors.role.RETAILER_BG,
                  },
                ]}
                onPress={() => handleRoleSwap('RETAILER')}
              >
                <Text style={[typography.bodyBold, { color: colors.role.RETAILER_LIGHT }]}>
                  🏬 Retailer
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  retail@veritwin.dev
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.choiceBtn,
                  user?.email === 'riya@veritwin.dev' && {
                    borderColor: colors.role.CONSUMER,
                    backgroundColor: colors.role.CONSUMER_BG,
                  },
                ]}
                onPress={() => handleRoleSwap('CONSUMER')}
              >
                <Text style={[typography.bodyBold, { color: colors.role.CONSUMER_LIGHT }]}>
                  🛍️ Consumer (Riya)
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  riya@veritwin.dev
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scan Outcome Simulation */}
            <Text style={[typography.captionBold, styles.sectionTitle]}>
              FORCE SCAN OUTCOME (§5 & §8)
            </Text>
            <View style={styles.chipsRow}>
              {(['AUTO', 'GENUINE', 'ALREADY_CLAIMED', 'FAKE', 'LOW_CONFIDENCE', 'SERVICE_DOWN'] as const).map(
                (outcome) => (
                  <TouchableOpacity
                    key={outcome}
                    style={[
                      styles.chip,
                      devSettings.scanScenario === outcome && styles.chipActive,
                    ]}
                    onPress={() => {
                      devSettings.scanScenario = outcome;
                      forceUpdate();
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        styles.chipText,
                        devSettings.scanScenario === outcome && styles.chipTextActive,
                      ]}
                    >
                      {outcome}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Transfer Scenario */}
            <Text style={[typography.captionBold, styles.sectionTitle]}>
              P2P TRANSFER SIMULATION (§7.4)
            </Text>
            <View style={styles.chipsRow}>
              {(['NORMAL', 'CLAIMED_AFTER_5S', 'EXPIRES', 'ALREADY_USED'] as const).map(
                (mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.chip,
                      devSettings.transferScenario === mode && styles.chipActive,
                    ]}
                    onPress={() => {
                      devSettings.transferScenario = mode;
                      forceUpdate();
                    }}
                  >
                    <Text
                      style={[
                        typography.captionBold,
                        styles.chipText,
                        devSettings.transferScenario === mode && styles.chipTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Network Latency */}
            <Text style={[typography.captionBold, styles.sectionTitle]}>
              SIMULATED NETWORK DELAY
            </Text>
            <View style={styles.chipsRow}>
              {[0, 400, 1200].map((delay) => (
                <TouchableOpacity
                  key={delay}
                  style={[
                    styles.chip,
                    devSettings.simulatedLatency === delay && styles.chipActive,
                  ]}
                  onPress={() => {
                    devSettings.simulatedLatency = delay;
                    forceUpdate();
                  }}
                >
                  <Text
                    style={[
                      typography.captionBold,
                      styles.chipText,
                      devSettings.simulatedLatency === delay && styles.chipTextActive,
                    ]}
                  >
                    {delay === 0 ? 'Instant (0ms)' : `${delay}ms`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.base,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  scrollContent: {
    marginBottom: spacing.base,
  },
  sectionTitle: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  buttonGrid: {
    gap: spacing.sm,
  },
  choiceBtn: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipActive: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});
