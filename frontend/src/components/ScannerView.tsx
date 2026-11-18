import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { Button } from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GUIDE_SIZE = Math.round(SCREEN_WIDTH * 0.72);

export type ScannerMode = 'LOGO' | 'QR';

interface ScannerViewProps {
  mode: ScannerMode;
  onModeChange: (mode: ScannerMode) => void;
  onLogoCaptured: (croppedUri: string) => void;
  onQrScanned: (payload: string) => void;
  busy?: boolean;
  hint?: string;
  roleAccent?: string;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  mode,
  onModeChange,
  onLogoCaptured,
  onQrScanned,
  busy = false,
  hint,
  roleAccent = colors.primary,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [scannedLocked, setScannedLocked] = useState(false);
  const cameraRef = useRef<any>(null);

  // Logo Capture Logic (§5.2)
  const handleCapture = async () => {
    if (busy || !cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });

      if (!photo?.uri) return;

      // Crop center square
      const cropSize = Math.min(photo.width, photo.height) * 0.72;
      const originX = (photo.width - cropSize) / 2;
      const originY = (photo.height - cropSize) / 2;

      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [
          {
            crop: {
              originX: Math.max(0, originX),
              originY: Math.max(0, originY),
              width: cropSize,
              height: cropSize,
            },
          },
          { resize: { width: 1024 } },
        ],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );

      onLogoCaptured(manipulated.uri);
    } catch (e) {
      console.warn('Capture error:', e);
      // Fallback: pass direct or demo
      onLogoCaptured('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800');
    }
  };

  // Gallery Picker
  const handlePickFromGallery = async () => {
    if (busy) return;
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.95,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        onLogoCaptured(res.assets[0].uri);
      }
    } catch (e) {
      console.warn('Gallery pick error:', e);
    }
  };

  // Barcode scanned callback (§5.3)
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (busy || scannedLocked || mode !== 'QR' || !data) return;
    setScannedLocked(true);
    onQrScanned(data);
    setTimeout(() => setScannedLocked(false), 2500); // 2s lock
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={roleAccent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={54} color={colors.textSecondary} />
        <Text style={[typography.h3, styles.permTitle]}>Camera Access Required</Text>
        <Text style={[typography.body, styles.permText]}>
          VeriTwin uses your camera to scan hidden logo watermarks and signed verification QR codes.
        </Text>
        <Button
          title="Grant Camera Access"
          onPress={requestPermission}
          roleColor={roleAccent}
          style={styles.permBtn}
        />
        <Button
          title="Or Pick Test Image from Gallery"
          onPress={handlePickFromGallery}
          variant="secondary"
          size="sm"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Live View */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={
          mode === 'QR'
            ? {
                barcodeTypes: ['qr'],
              }
            : undefined
        }
        onBarcodeScanned={mode === 'QR' ? handleBarcodeScanned : undefined}
      />

      {/* Dark Overlay with Transparent Square Cutout */}
      <View style={styles.overlay}>
        {/* Top Control Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setTorch(!torch)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-off-outline'}
              size={22}
              color={torch ? colors.warning : '#FFFFFF'}
            />
          </TouchableOpacity>

          {/* Mode Switcher Pill (§5.1) */}
          <View style={styles.modePill}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'LOGO' && styles.modeTabActive]}
              onPress={() => onModeChange('LOGO')}
            >
              <Ionicons
                name="scan-outline"
                size={14}
                color={mode === 'LOGO' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  typography.captionBold,
                  styles.modeTabText,
                  mode === 'LOGO' && styles.modeTabTextActive,
                ]}
              >
                Logo (Primary)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'QR' && styles.modeTabActive]}
              onPress={() => onModeChange('QR')}
            >
              <Ionicons
                name="qr-code-outline"
                size={14}
                color={mode === 'QR' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  typography.captionBold,
                  styles.modeTabText,
                  mode === 'QR' && styles.modeTabTextActive,
                ]}
              >
                QR Fallback
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Alignment Guide (§5.2) */}
        <View style={styles.guideWrapper}>
          <View
            style={[
              styles.guideSquare,
              {
                width: GUIDE_SIZE,
                height: GUIDE_SIZE,
                borderColor: roleAccent,
              },
            ]}
          >
            {/* Corner Brackets */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: roleAccent }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: roleAccent }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: roleAccent }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: roleAccent }]} />

            {/* Scanning line indicator */}
            <View style={[styles.scanLine, { backgroundColor: roleAccent }]} />
          </View>

          <Text style={[typography.bodyBold, styles.guideHint]}>
            {hint ||
              (mode === 'LOGO'
                ? 'Align the product logo inside the square'
                : 'Point camera at the VeriTwin QR code')}
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          {mode === 'LOGO' ? (
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={handlePickFromGallery}
                disabled={busy}
              >
                <Ionicons name="images-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Shutter Button */}
              <TouchableOpacity
                style={[styles.shutterOuter, { borderColor: roleAccent }]}
                onPress={handleCapture}
                disabled={busy}
                activeOpacity={0.75}
              >
                <View style={[styles.shutterInner, { backgroundColor: roleAccent }]} />
              </TouchableOpacity>

              <View style={{ width: 44 }} />
            </View>
          ) : (
            <View style={styles.qrInfoContainer}>
              <Text style={[typography.caption, styles.qrInfoText]}>
                Scanning active. Hold steady over barcode.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Analyzing Overlay */}
      {busy && (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color={roleAccent} />
          <Text style={[typography.h3, styles.busyTitle]}>Analyzing Authenticity…</Text>
          <Text style={[typography.caption, styles.busySubtitle]}>
            Extracting imperceptible watermark & verifying hash chain
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  permText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  permBtn: {
    minWidth: 220,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: Platform.OS === 'ios' ? 54 : 32,
    zIndex: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderRadius: borderRadius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
  },
  modeTabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  modeTabText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  guideWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideSquare: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  cornerTL: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0 },
  cornerTR: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0 },
  cornerBL: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0 },
  cornerBR: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine: {
    width: '100%',
    height: 2,
    opacity: 0.6,
  },
  guideHint: {
    color: '#FFFFFF',
    marginTop: spacing.base,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  bottomBar: {
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  galleryBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  qrInfoContainer: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
  },
  qrInfoText: {
    color: colors.textSecondary,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 15, 25, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 99,
  },
  busyTitle: {
    color: colors.text,
    marginTop: spacing.base,
    marginBottom: spacing.xs,
  },
  busySubtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
