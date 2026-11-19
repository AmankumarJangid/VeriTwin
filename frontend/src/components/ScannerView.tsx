// Dual-mode scanner: Guided Logo Capture (DWT-DCT watermark) + Signed QR Code scanner
// Spec reference: 02_FRONTEND.md §5
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { radii, spacing } from '../theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GUIDE_SIZE = Math.round(SCREEN_WIDTH * 0.72);

interface ScannerViewProps {
  mode: 'LOGO' | 'QR';
  onModeChange: (mode: 'LOGO' | 'QR') => void;
  onLogoCaptured: (uri: string) => void;
  onQrScanned: (payload: string) => void;
  busy?: boolean;
  hint?: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  mode,
  onModeChange,
  onLogoCaptured,
  onQrScanned,
  busy = false,
  hint,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // QR Debounce & Scan Handler
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (mode !== 'QR' || busy || isProcessing) return;

    const now = Date.now();
    if (now - lastScanTime < 2500) return; // 2.5s debounce

    setLastScanTime(now);
    onQrScanned(data);
  };

  // Logo Capture & Crop to Guide
  const handleCaptureLogo = async () => {
    if (busy || isProcessing) return;

    try {
      setIsProcessing(true);

      if (cameraRef.current && Platform.OS !== 'web') {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          skipProcessing: false,
        });
        const imgWidth = photo.width || 1000;
        const imgHeight = photo.height || 1000;

        // Compute centered square crop for camera photos
        const side = Math.min(imgWidth, imgHeight) * 0.72;
        const originX = (imgWidth - side) / 2;
        const originY = (imgHeight - side) / 2;

        const manipulated = await ImageManipulator.manipulateAsync(
          photo.uri,
          [
            {
              crop: {
                originX: Math.round(originX),
                originY: Math.round(originY),
                width: Math.round(side),
                height: Math.round(side),
              },
            },
            { resize: { width: 1024, height: 1024 } },
          ],
          { compress: 1.0, format: ImageManipulator.SaveFormat.PNG }
        );
        onLogoCaptured(manipulated.uri);
      } else {
        // Web / simulator: pick image directly (preserve full watermark without lossy crop)
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 1,
        });
        if (!res.canceled && res.assets && res.assets[0]) {
          onLogoCaptured(res.assets[0].uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Capture Error', err.message || 'Failed to capture or crop image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Pick from Gallery
  const handlePickGallery = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        onLogoCaptured(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err.message || 'Could not pick image.');
    }
  };

  // Manual QR input fallback for web or devices without live camera scanning
  const handleManualQrInput = () => {
    if (Platform.OS === 'web') {
      const input = window.prompt(
        'Paste signed QR payload (e.g. VT1.<twin_id>.<sig> or VTX1.<token>):',
        ''
      );
      if (input && input.trim()) {
        onQrScanned(input.trim());
      }
    } else {
      Alert.prompt(
        'Enter QR Payload',
        'Enter signed QR payload string:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Verify',
            onPress: (text) => {
              if (text && text.trim()) onQrScanned(text.trim());
            },
          },
        ]
      );
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={colors.ink} />
      </View>
    );
  }

  if (!permission.granted && Platform.OS !== 'web') {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={48} color={colors.inkMuted} />
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permDesc}>
          VeriTwin needs camera access to inspect watermarked product logos and scan verification QR codes.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryFallbackBtn} onPress={handlePickGallery}>
          <Text style={styles.galleryFallbackText}>Upload photo from gallery instead</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode Switcher Tabs */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'LOGO' && styles.tabActive]}
          onPress={() => onModeChange('LOGO')}
          disabled={busy || isProcessing}
        >
          <Ionicons
            name="scan-outline"
            size={16}
            color={mode === 'LOGO' ? colors.onPrimary : colors.ink}
          />
          <Text style={[styles.tabText, mode === 'LOGO' && styles.tabTextActive]}>
            Logo Mark (Primary)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, mode === 'QR' && styles.tabActive]}
          onPress={() => onModeChange('QR')}
          disabled={busy || isProcessing}
        >
          <Ionicons
            name="qr-code-outline"
            size={16}
            color={mode === 'QR' ? colors.onPrimary : colors.ink}
          />
          <Text style={[styles.tabText, mode === 'QR' && styles.tabTextActive]}>
            QR Code (Fallback)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Live Camera View */}
      <View style={styles.cameraWrapper}>
        {Platform.OS === 'web' ? (
          <View style={[StyleSheet.absoluteFillObject, styles.webCameraPlaceholder]}>
            <Ionicons name="camera-outline" size={40} color={colors.inkTertiary} />
            <Text style={styles.webCameraTitle}>Web Camera Preview</Text>
            <Text style={styles.webCameraSub}>
              On physical mobile phones, the live camera feed is active. On web, tap Capture or Pick from Gallery below.
            </Text>
          </View>
        ) : (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={mode === 'QR' ? handleBarcodeScanned : undefined}
          />
        )}

        {/* Square Alignment Guide */}
        <View style={styles.overlay}>
          <View style={styles.guideSquare}>
            {/* Corner Brackets */}
            <View style={[styles.bracket, styles.bracketTL]} />
            <View style={[styles.bracket, styles.bracketTR]} />
            <View style={[styles.bracket, styles.bracketBL]} />
            <View style={[styles.bracket, styles.bracketBR]} />

            {mode === 'LOGO' ? (
              <View style={styles.guideCenterContent}>
                <Ionicons name="sparkles" size={24} color={colors.finOrange} />
                <Text style={styles.guideText}>
                  {hint || 'Align the product logo inside this frame'}
                </Text>
              </View>
            ) : (
              <View style={styles.guideCenterContent}>
                <Ionicons name="scan" size={24} color="#65b5ff" />
                <Text style={styles.guideText}>Point camera at VeriTwin QR code</Text>
              </View>
            )}
          </View>
        </View>

        {/* Analyzing / Busy Indicator */}
        {(busy || isProcessing) && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color={colors.finOrange} />
            <Text style={styles.busyText}>
              {mode === 'LOGO'
                ? 'Extracting DWT-DCT watermark & matching twin…'
                : 'Verifying cryptographic QR signature…'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Camera Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.galleryBtn}
          onPress={handlePickGallery}
          disabled={busy || isProcessing}
        >
          <Ionicons name="images-outline" size={22} color={colors.ink} />
          <Text style={styles.actionBtnLabel}>Gallery</Text>
        </TouchableOpacity>

        {mode === 'LOGO' ? (
          <TouchableOpacity
            style={[styles.captureBtn, (busy || isProcessing) && styles.captureBtnDisabled]}
            onPress={handleCaptureLogo}
            disabled={busy || isProcessing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.qrManualBtn}
            onPress={handleManualQrInput}
            disabled={busy || isProcessing}
          >
            <Ionicons name="keypad-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.qrManualBtnText}>Paste / Enter QR</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.galleryBtn}
          onPress={() => onModeChange(mode === 'LOGO' ? 'QR' : 'LOGO')}
          disabled={busy || isProcessing}
        >
          <Ionicons
            name={mode === 'LOGO' ? 'qr-code' : 'image'}
            size={22}
            color={colors.ink}
          />
          <Text style={styles.actionBtnLabel}>
            {mode === 'LOGO' ? 'Use QR' : 'Use Logo'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permTitle: {
    ...typography.cardTitle,
    fontSize: 18,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  permDesc: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  permBtn: {
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  permBtnText: {
    ...typography.button,
    color: colors.onPrimary,
  },
  galleryFallbackBtn: {
    padding: 10,
  },
  galleryFallbackText: {
    ...typography.button,
    fontSize: 13,
    color: colors.finOrange,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface1,
    padding: 6,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radii.pill,
    gap: 6,
  },
  tabActive: {
    backgroundColor: colors.ink,
  },
  tabText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  tabTextActive: {
    color: colors.onPrimary,
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    marginTop: spacing.xs,
  },
  webCameraPlaceholder: {
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  webCameraTitle: {
    ...typography.cardTitle,
    color: colors.surface1,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  webCameraSub: {
    ...typography.caption,
    color: colors.inkTertiary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  guideSquare: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.surface1,
  },
  bracketTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  bracketTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bracketBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bracketBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  guideCenterContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  guideText: {
    ...typography.caption,
    color: colors.surface1,
    textAlign: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.xs,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 20,
  },
  busyText: {
    ...typography.bodySm,
    color: colors.surface1,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '500',
  },
  actionBar: {
    height: 90,
    backgroundColor: colors.surface1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  galleryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  actionBtnLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 3,
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: colors.finOrange,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface1,
  },
  captureBtnDisabled: {
    opacity: 0.4,
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.finOrange,
  },
  qrAutoScanNote: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrAutoScanText: {
    ...typography.caption,
    color: colors.inkMuted,
    fontStyle: 'italic',
  },
  qrManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.full,
    gap: 6,
  },
  qrManualBtnText: {
    ...typography.button,
    color: colors.onPrimary,
    fontSize: 12,
  },
});
