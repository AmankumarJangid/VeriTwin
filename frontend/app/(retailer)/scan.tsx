// Retailer Store Scanner Screen
import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { ScannerView } from '../../src/components/ScannerView';
import { FallbackSheet } from '../../src/components/FallbackSheet';
import { scanLogoApi, scanQrApi } from '../../src/api/scan';
import { useScanStore } from '../../src/store/scanStore';
import { ApiError } from '../../src/types/api';
import { appendImageToFormData } from '../../src/utils/files';
import { colors } from '../../src/theme/colors';

export default function RetailerScanScreen() {
  const router = useRouter();
  const { setCurrentResult } = useScanStore();

  const [mode, setMode] = useState<'LOGO' | 'QR'>('LOGO');
  const [busy, setBusy] = useState(false);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const handleLogoCaptured = async (uri: string) => {
    try {
      setBusy(true);
      const formData = new FormData();
      await appendImageToFormData(formData, 'image', uri, 'logo_scan.png');

      const result = await scanLogoApi(formData);
      setCurrentResult(result);
      router.push('/scan-result');
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'WATERMARK_LOW_CONFIDENCE') {
        const failures = consecutiveFailures + 1;
        setConsecutiveFailures(failures);
        if (failures >= 2) {
          Alert.alert('Auto-switching to QR', 'Switched to fallback QR mode after 2 failed attempts.');
          setMode('QR');
        } else {
          setFallbackMessage(err.message);
          setServiceUnavailable(false);
          setFallbackVisible(true);
        }
      } else if (err instanceof ApiError && err.code === 'IMAGE_SERVICE_UNAVAILABLE') {
        setFallbackMessage('Image processing service is offline. Please use QR.');
        setServiceUnavailable(true);
        setFallbackVisible(true);
      } else {
        Alert.alert('Scan Failed', err.message || 'Could not verify product.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleQrScanned = async (payload: string) => {
    try {
      setBusy(true);
      const result = await scanQrApi(payload);
      setCurrentResult(result);
      router.push('/scan-result');
    } catch (err: any) {
      Alert.alert('QR Scan Error', err.message || 'Invalid QR code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title="Store Scanner"
      subtitle="Inspect incoming units or verify authenticity before handover"
      roleBadge={{ text: 'Retailer', color: colors.roleRetailer }}
      scrollable={false}
    >
      <View style={styles.scannerContainer}>
        <ScannerView
          mode={mode}
          onModeChange={setMode}
          onLogoCaptured={handleLogoCaptured}
          onQrScanned={handleQrScanned}
          busy={busy}
        />
      </View>

      <FallbackSheet
        visible={fallbackVisible}
        message={fallbackMessage}
        isServiceUnavailable={serviceUnavailable}
        onRetryLogo={() => setFallbackVisible(false)}
        onSwitchToQr={() => {
          setFallbackVisible(false);
          setMode('QR');
        }}
        onClose={() => setFallbackVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scannerContainer: {
    flex: 1,
  },
});
