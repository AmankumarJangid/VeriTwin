// Manufacturer Factory Scanner Screen
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

export default function ManufacturerScanScreen() {
  const router = useRouter();
  const { setCurrentResult } = useScanStore();

  const [mode, setMode] = useState<'LOGO' | 'QR'>('LOGO');
  const [busy, setBusy] = useState(false);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

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
        setFallbackMessage(err.message);
        setServiceUnavailable(false);
        setFallbackVisible(true);
      } else if (err instanceof ApiError && err.code === 'IMAGE_SERVICE_UNAVAILABLE') {
        setFallbackMessage('Image processing service offline. Use QR.');
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
      title="Factory Scanner"
      subtitle="Inspect physical watermark or signed fallback QR"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
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
