// Consumer Starting Page after Login
// Requirements: Contains option such as 'owned_products' & at the bottom prominent button to open the scanner
// Spec reference: USER_REQUEST & DESIGN-intercom.md & 02_FRONTEND.md §6.4
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { ScannerView } from '../../src/components/ScannerView';
import { FallbackSheet } from '../../src/components/FallbackSheet';
import { EmptyState } from '../../src/components/EmptyState';
import { StatusBadge } from '../../src/components/StatusBadge';
import { Button } from '../../src/components/Button';
import { getConsumerVaultApi } from '../../src/api/consumer';
import { scanLogoApi, scanQrApi } from '../../src/api/scan';
import { useAuthStore } from '../../src/store/authStore';
import { useScanStore } from '../../src/store/scanStore';
import { formatCurrency, formatDate } from '../../src/utils/format';
import { appendImageToFormData } from '../../src/utils/files';
import { ApiError } from '../../src/types/api';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { radii, spacing } from '../../src/theme/spacing';

export default function ConsumerHomeScreen() {
  const router = useRouter();
  const { user, setDevMenu } = useAuthStore();
  const { setCurrentResult } = useScanStore();

  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanMode, setScanMode] = useState<'LOGO' | 'QR'>('LOGO');
  const [isScanning, setIsScanning] = useState(false);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Load Owned Products from Digital Vault
  const {
    data: vaultData,
    isLoading: isLoadingVault,
    refetch: refetchVault,
    isRefetching,
  } = useQuery({
    queryKey: ['consumerVault'],
    queryFn: () => getConsumerVaultApi(),
  });

  const ownedProducts = vaultData?.items || [];

  // Dual-mode Scan Handlers
  const handleLogoCaptured = async (uri: string) => {
    try {
      setIsScanning(true);
      const formData = new FormData();
      await appendImageToFormData(formData, 'image', uri, 'logo_scan.png');

      const result = await scanLogoApi(formData);
      setScannerVisible(false);
      setCurrentResult(result);
      router.push('/scan-result');
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'WATERMARK_LOW_CONFIDENCE') {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        if (attempts >= 2) {
          // Auto switch to QR after 2 failures
          Alert.alert('Auto-switching to QR', 'Switched to physical signed QR fallback mode.');
          setScanMode('QR');
        } else {
          setFallbackMessage(err.message);
          setServiceUnavailable(false);
          setFallbackVisible(true);
        }
      } else if (err instanceof ApiError && err.code === 'IMAGE_SERVICE_UNAVAILABLE') {
        setFallbackMessage('Logo recognition service is offline. Please scan QR.');
        setServiceUnavailable(true);
        setFallbackVisible(true);
      } else {
        Alert.alert('Verification Error', err.message || 'Scan could not be processed.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleQrScanned = async (payload: string) => {
    try {
      setIsScanning(true);
      const result = await scanQrApi(payload);
      setScannerVisible(false);
      setCurrentResult(result);
      router.push('/scan-result');
    } catch (err: any) {
      Alert.alert('QR Scan Error', err.message || 'Invalid or unrecognized QR code.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Screen
      title="Digital Twin Vault"
      subtitle={`Welcome, ${user?.full_name || 'Collector'}`}
      roleBadge={{ text: 'Consumer', color: colors.roleConsumer }}
      refreshing={isRefetching}
      onRefresh={refetchVault}
      bottomBar={
        /* Bottom scanner button requested explicitly by user */
        <View style={styles.bottomBarWrapper}>
          <TouchableOpacity
            style={styles.scannerOpenBtn}
            onPress={() => setScannerVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.scannerBtnIcon}>
              <Ionicons name="scan-outline" size={24} color={colors.onPrimary} />
            </View>
            <View style={styles.scannerBtnTextContainer}>
              <Text style={styles.scannerBtnTitle}>Open Product Scanner</Text>
              <Text style={styles.scannerBtnSub}>Verify watermarked logo or signed QR code</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      }
    >
      {/* 1. Value / Stats Summary Bar */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statNumber}>{ownedProducts.length}</Text>
          <Text style={styles.statLabel}>Owned Products</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNumber, { color: colors.verdictGenuine }]}>100%</Text>
          <Text style={styles.statLabel}>Authentic & Verified</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={[styles.statNumber, { color: colors.finOrange }]}>Ready</Text>
          <Text style={styles.statLabel}>P2P Resale Handshake</Text>
        </View>
      </View>

      {/* 2. Owned Products Section (As specifically required) */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Owned Products</Text>
          <Text style={styles.sectionSub}>Your tamper-evident digital certificates</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(consumer)/vault' as any)}>
          <Text style={styles.sectionLink}>View All ({ownedProducts.length})</Text>
        </TouchableOpacity>
      </View>

      {ownedProducts.length === 0 ? (
        <EmptyState
          icon="shield-outline"
          title="No Products in Your Vault Yet"
          description="When you purchase an authentic luxury item from an authorized retailer or claim via P2P transfer, your digital twin will appear here."
          actionTitle="Scan Product to Authenticate"
          onAction={() => setScannerVisible(true)}
        />
      ) : (
        <View style={styles.productsList}>
          {ownedProducts.map((item) => (
            <TouchableOpacity
              key={item.twin_id}
              style={styles.productCard}
              onPress={() => router.push(`/(consumer)/vault/${item.twin_id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.productCardTop}>
                <View style={styles.productBadge}>
                  <Ionicons name="shield-checkmark" size={14} color={colors.verdictGenuine} />
                  <Text style={styles.productBadgeText}>GENUINE TWIN</Text>
                </View>
                {item.has_active_transfer && (
                  <View style={styles.transferBadge}>
                    <Ionicons name="time-outline" size={12} color={colors.finOrange} />
                    <Text style={styles.transferBadgeText}>Transfer Active</Text>
                  </View>
                )}
              </View>

              <Text style={styles.brandText}>{item.product.brand}</Text>
              <Text style={styles.productTitle}>{item.product.name}</Text>

              <View style={styles.productDetailsRow}>
                <View>
                  <Text style={styles.detailLabel}>Serial Number</Text>
                  <Text style={styles.detailValue}>{item.serial_number}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailLabel}>Market Value (MRP)</Text>
                  <Text style={styles.detailValuePrice}>{formatCurrency(item.product.mrp)}</Text>
                </View>
              </View>

              <View style={styles.productCardFooter}>
                <Text style={styles.acquiredText}>
                  Acquired on {formatDate(item.acquired_at)} ({item.acquired_via})
                </Text>
                <View style={styles.cardActionLink}>
                  <Text style={styles.cardActionText}>Manage / Transfer</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.finOrange} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* 3. Quick Actions Grid */}
      <View style={styles.quickGrid}>
        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => router.push('/(consumer)/transfer' as any)}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.finOrangeLight }]}>
            <Ionicons name="qr-code-outline" size={20} color={colors.finOrange} />
          </View>
          <Text style={styles.quickActionTitle}>Claim P2P Transfer</Text>
          <Text style={styles.quickActionSub}>Scan seller QR code to receive product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          onPress={() => setDevMenu({ isOpen: true })}
          activeOpacity={0.8}
        >
          <View style={[styles.quickIconCircle, { backgroundColor: colors.surface2 }]}>
            <Ionicons name="options-outline" size={20} color={colors.ink} />
          </View>
          <Text style={styles.quickActionTitle}>Testing Scenarios</Text>
          <Text style={styles.quickActionSub}>Switch scan verdicts & accounts</Text>
        </TouchableOpacity>
      </View>

      {/* Full-Screen Dual-Mode Scanner Modal */}
      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => setScannerVisible(false)}
      >
        <Screen
          title="Authenticate Product"
          subtitle="Dual-Mode Watermark & QR Scanner"
          headerRight={
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setScannerVisible(false)}
            >
              <Ionicons name="close" size={22} color={colors.ink} />
            </TouchableOpacity>
          }
          scrollable={false}
        >
          <ScannerView
            mode={scanMode}
            onModeChange={setScanMode}
            onLogoCaptured={handleLogoCaptured}
            onQrScanned={handleQrScanned}
            busy={isScanning}
          />
        </Screen>

        {/* Fallback Bottom Sheet */}
        <FallbackSheet
          visible={fallbackVisible}
          message={fallbackMessage}
          isServiceUnavailable={serviceUnavailable}
          onRetryLogo={() => {
            setFallbackVisible(false);
          }}
          onSwitchToQr={() => {
            setFallbackVisible(false);
            setScanMode('QR');
          }}
          onClose={() => setFallbackVisible(false)}
        />
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: colors.hairlineSoft,
    alignSelf: 'center',
  },
  statNumber: {
    ...typography.headline,
    fontSize: 20,
    color: colors.ink,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
    fontSize: 18,
  },
  sectionSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  sectionLink: {
    ...typography.button,
    fontSize: 13,
    color: colors.finOrange,
  },
  productsList: {
    gap: 12,
    marginBottom: spacing.lg,
  },
  productCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  productCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.verdictGenuineBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.verdictGenuine + '30',
  },
  productBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.verdictGenuine,
  },
  transferBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.finOrangeLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  transferBadgeText: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '700',
    color: colors.finOrange,
  },
  brandText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  productTitle: {
    ...typography.cardTitle,
    fontSize: 17,
    marginTop: 1,
    marginBottom: spacing.xs,
  },
  productDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    padding: 10,
    marginVertical: spacing.xs,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.inkMuted,
    fontSize: 10,
  },
  detailValue: {
    ...typography.mono,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  detailValuePrice: {
    ...typography.bodySm,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 2,
  },
  productCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  acquiredText: {
    ...typography.caption,
    color: colors.inkSubtle,
    fontSize: 11,
  },
  cardActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.finOrange,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.md,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surface1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionTitle: {
    ...typography.cardTitle,
    fontSize: 14,
  },
  quickActionSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 14,
  },
  bottomBarWrapper: {
    paddingVertical: 2,
  },
  scannerOpenBtn: {
    backgroundColor: colors.finOrange,
    borderRadius: radii.xl,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: colors.finOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  scannerBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scannerBtnTextContainer: {
    flex: 1,
  },
  scannerBtnTitle: {
    ...typography.button,
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  scannerBtnSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
});
