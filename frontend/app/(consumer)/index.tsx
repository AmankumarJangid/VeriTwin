import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScannerView } from '../../src/components/ScannerView';
import { FallbackSheet } from '../../src/components/FallbackSheet';
import { useScanner } from '../../src/hooks/useScanner';
import { colors } from '../../src/theme/colors';

export default function ConsumerVerifyScreen() {
  const {
    mode,
    setMode,
    busy,
    fallbackVisible,
    fallbackMessage,
    fallbackConfidence,
    isServiceDown,
    handleLogoScan,
    handleQrScan,
    closeFallback,
    switchToQrFromFallback,
  } = useScanner();

  return (
    <View style={styles.container}>
      <ScannerView
        mode={mode}
        onModeChange={setMode}
        onLogoCaptured={handleLogoScan}
        onQrScanned={handleQrScan}
        busy={busy}
        roleAccent={colors.role.CONSUMER}
        hint="Point at any luxury product emblem or VeriTwin QR to verify"
      />

      <FallbackSheet
        visible={fallbackVisible}
        message={fallbackMessage}
        confidence={fallbackConfidence}
        isServiceDown={isServiceDown}
        onRetryLogo={closeFallback}
        onSwitchToQr={switchToQrFromFallback}
        onClose={closeFallback}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
