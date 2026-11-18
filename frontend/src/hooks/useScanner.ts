import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { scanApi } from '../api/scan';
import { ScanResponseData } from '../types/api';
import { ApiError } from '../utils/errors';
import { ScannerMode } from '../components/ScannerView';

export function useScanner() {
  const router = useRouter();
  const [mode, setMode] = useState<ScannerMode>('LOGO');
  const [busy, setBusy] = useState(false);
  const [fallbackVisible, setFallbackVisible] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string>('');
  const [fallbackConfidence, setFallbackConfidence] = useState<number | undefined>();
  const [isServiceDown, setIsServiceDown] = useState(false);
  const [lowConfidenceCount, setLowConfidenceCount] = useState(0);

  const handleLogoScan = async (imageUri: string) => {
    setBusy(true);
    try {
      const result = await scanApi.scanLogo(imageUri);
      setLowConfidenceCount(0);
      navigateToResult(result);
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'WATERMARK_LOW_CONFIDENCE') {
          const nextCount = lowConfidenceCount + 1;
          setLowConfidenceCount(nextCount);

          if (nextCount >= 2) {
            // Auto switch to QR mode after 2 consecutive failures (§5.4)
            setMode('QR');
            Alert.alert(
              'Switched to QR Mode',
              'Multiple watermark read attempts failed. Camera is now set to Fallback QR scanning.'
            );
          } else {
            setFallbackMessage(err.message);
            setFallbackConfidence(err.details?.confidence as number);
            setIsServiceDown(false);
            setFallbackVisible(true);
          }
          return;
        }

        if (err.code === 'IMAGE_SERVICE_UNAVAILABLE') {
          setIsServiceDown(true);
          setFallbackMessage(err.message);
          setFallbackVisible(true);
          return;
        }
      }

      Alert.alert('Scan Failed', err.message || 'Unable to analyze image.');
    } finally {
      setBusy(false);
    }
  };

  const handleQrScan = async (payload: string) => {
    setBusy(true);
    try {
      const result = await scanApi.scanQr(payload);
      navigateToResult(result);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'INVALID_QR_FORMAT') {
        if (err.details?.hint === 'TRANSFER_QR') {
          Alert.alert(
            'Transfer QR Detected',
            "This is a P2P ownership transfer QR code. Please use 'Scan Transfer' in the Consumer tab to claim it."
          );
          return;
        }
      }
      Alert.alert('Invalid QR Code', err.message || 'Not a valid VeriTwin code.');
    } finally {
      setBusy(false);
    }
  };

  const navigateToResult = (data: ScanResponseData) => {
    // Store in global or pass encoded
    (global as any).__VERITWIN_SCAN_RESULT__ = data;
    router.push({
      pathname: '/scan-result',
      params: { scan_id: data.scan_id },
    });
  };

  return {
    mode,
    setMode,
    busy,
    fallbackVisible,
    fallbackMessage,
    fallbackConfidence,
    isServiceDown,
    handleLogoScan,
    handleQrScan,
    closeFallback: () => setFallbackVisible(false),
    switchToQrFromFallback: () => {
      setFallbackVisible(false);
      setMode('QR');
    },
  };
}
