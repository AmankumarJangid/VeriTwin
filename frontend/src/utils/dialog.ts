// Cross-platform confirm dialog (Web window.confirm + Mobile Alert.alert)
import { Alert, Platform } from 'react-native';

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmButtonText: string = 'Confirm'
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm) {
      const ok = window.confirm(`${title}\n\n${message}`);
      if (ok) {
        onConfirm();
      }
    } else {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmButtonText, onPress: onConfirm, style: 'destructive' },
    ]);
  }
}
