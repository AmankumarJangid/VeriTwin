import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, ScanOutcomeScenario, TransferScenario } from '../store/authStore';
import { loginApi } from '../api/auth';
import { SEED_USERS } from '../api/mocks/mockData';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

export const DevMenu: React.FC = () => {
  const router = useRouter();
  const { devMenu, setDevMenu, setAuth } = useAuthStore();

  if (!devMenu.isOpen) return null;

  const outcomes: ScanOutcomeScenario[] = [
    'GENUINE',
    'ALREADY_CLAIMED',
    'FAKE',
    'LOW_CONFIDENCE',
    'SERVICE_DOWN',
  ];

  const transferModes: TransferScenario[] = [
    'CLAIMED_AFTER_5S',
    'EXPIRES',
    'ALREADY_USED',
  ];

  const latencies = [0, 300, 800, 2000];

  const passwords: Record<string, string> = {
    maker: 'Maker@123',
    retailer: 'Retail@123',
    riya: 'Riya@123',
    arjun: 'Arjun@123',
    consumer_owner: 'Riya@123',
    consumer_buyer: 'Arjun@123',
  };

  const handleSwitchUser = async (userKey: string) => {
    const user = SEED_USERS[userKey];
    if (!user) return;
    const pass = passwords[userKey] || (user.role === 'MANUFACTURER' ? 'Maker@123' : user.role === 'RETAILER' ? 'Retail@123' : 'Riya@123');
    try {
      // Attempt real backend authentication first
      const data = await loginApi(user.email, pass);
      await setAuth(data.user, data.tokens);
      setDevMenu({ isOpen: false });
      switch (data.user.role) {
        case 'MANUFACTURER':
          router.replace('/(manufacturer)');
          break;
        case 'RETAILER':
          router.replace('/(retailer)');
          break;
        case 'CONSUMER':
          router.replace('/(consumer)');
          break;
      }
    } catch {
      // Fallback for offline / mock mode
      await setAuth(user, {
        access_token: `mock_jwt_access_${user.user_id}`,
        refresh_token: `mock_jwt_refresh_${user.user_id}`,
        expires_in: 900,
      });
      setDevMenu({ isOpen: false });
      switch (user.role) {
        case 'MANUFACTURER':
          router.replace('/(manufacturer)');
          break;
        case 'RETAILER':
          router.replace('/(retailer)');
          break;
        case 'CONSUMER':
          router.replace('/(consumer)');
          break;
      }
    }
  };

  return (
    <Modal
      visible={devMenu.isOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setDevMenu({ isOpen: false })}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="construct-outline" size={20} color={colors.finOrange} />
              <Text style={styles.title}>Developer Test Menu</Text>
            </View>
            <TouchableOpacity
              onPress={() => setDevMenu({ isOpen: false })}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Quick Impersonate */}
            <Text style={styles.sectionTitle}>Impersonate Seed User</Text>
            <View style={styles.chipRow}>
              {(Object.keys(SEED_USERS) as Array<keyof typeof SEED_USERS>).map((k) => (
                <TouchableOpacity
                  key={k}
                  style={styles.chip}
                  onPress={() => handleSwitchUser(k)}
                >
                  <Text style={styles.chipText}>{SEED_USERS[k].role}</Text>
                  <Text style={styles.chipSub}>{SEED_USERS[k].full_name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Scan Outcome */}
            <Text style={styles.sectionTitle}>Mock Scan Outcome</Text>
            <View style={styles.chipRow}>
              {outcomes.map((out) => {
                const isSelected = devMenu.scanOutcome === out;
                return (
                  <TouchableOpacity
                    key={out}
                    style={[styles.scenarioChip, isSelected && styles.scenarioChipSelected]}
                    onPress={() => setDevMenu({ scanOutcome: out })}
                  >
                    <Text
                      style={[
                        styles.scenarioChipText,
                        isSelected && styles.scenarioChipTextSelected,
                      ]}
                    >
                      {out}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* P2P Transfer Simulation */}
            <Text style={styles.sectionTitle}>P2P Transfer Handshake Behavior</Text>
            <View style={styles.chipRow}>
              {transferModes.map((tm) => {
                const isSelected = devMenu.transferBehavior === tm;
                return (
                  <TouchableOpacity
                    key={tm}
                    style={[styles.scenarioChip, isSelected && styles.scenarioChipSelected]}
                    onPress={() => setDevMenu({ transferBehavior: tm })}
                  >
                    <Text
                      style={[
                        styles.scenarioChipText,
                        isSelected && styles.scenarioChipTextSelected,
                      ]}
                    >
                      {tm}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Simulated Latency */}
            <Text style={styles.sectionTitle}>Simulated Network Latency</Text>
            <View style={styles.chipRow}>
              {latencies.map((lat) => {
                const isSelected = devMenu.latencyMs === lat;
                return (
                  <TouchableOpacity
                    key={lat}
                    style={[styles.scenarioChip, isSelected && styles.scenarioChipSelected]}
                    onPress={() => setDevMenu({ latencyMs: lat })}
                  >
                    <Text
                      style={[
                        styles.scenarioChipText,
                        isSelected && styles.scenarioChipTextSelected,
                      ]}
                    >
                      {lat} ms
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface1,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.md,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairlineSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    ...typography.headline,
    fontSize: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  content: {
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    color: colors.inkMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: colors.surface2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipText: {
    ...typography.button,
    fontSize: 12,
    color: colors.ink,
  },
  chipSub: {
    ...typography.caption,
    color: colors.inkSubtle,
  },
  scenarioChip: {
    backgroundColor: colors.surface1,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  scenarioChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  scenarioChipText: {
    ...typography.button,
    fontSize: 12,
    color: colors.ink,
  },
  scenarioChipTextSelected: {
    color: colors.onPrimary,
  },
});
