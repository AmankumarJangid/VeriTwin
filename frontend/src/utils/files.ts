// File, Media Library & Sharing utilities (Web & Mobile cross-platform)
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';

/**
 * Cross-platform helper to append an image file/blob to FormData for Multer uploads:
 * - On Web: Fetches URI into a native Blob and appends it with filename
 * - On Native: Appends React Native's { uri, name, type } object
 */
export async function appendImageToFormData(
  formData: FormData,
  fieldName: string,
  uri: string,
  filename: string = 'image.png'
): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append(fieldName, blob, filename);
  } else {
    formData.append(fieldName, {
      uri,
      name: filename,
      type: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
    } as any);
  }
}

/**
 * Downloads an asset from a URL (with automatic Bearer token auth & token refresh)
 * and saves it to the user's device:
 * - On Web: Triggers immediate browser file download to Downloads folder
 * - On Native: Saves to FileSystem and exports to Photos/MediaLibrary
 */
export async function downloadAndSaveAsset(
  url: string,
  filename: string,
  _explicitToken?: string | null
): Promise<string | null> {
  try {
    if (!url) {
      Alert.alert('Download Error', 'No asset URL available to download.');
      return null;
    }

    if (Platform.OS === 'web') {
      let blob: Blob;

      if (url.startsWith('data:')) {
        // Data URI conversion
        const arr = url.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        // Fetch via apiClient (automatically attaches Bearer token & auto-refreshes if 401)
        const res: any = await apiClient.get(url, { responseType: 'blob' });
        const data = res?.data || res;
        blob = data instanceof Blob ? data : new Blob([data], { type: 'image/png' });
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);

      Alert.alert('Saved', `"${filename}" saved to your Downloads folder.`);
      return blobUrl;
    }

    // Native iOS / Android
    const token = useAuthStore.getState().accessToken;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const downloadRes = await FileSystem.downloadAsync(url, fileUri, { headers });

    if (downloadRes.status !== 200) {
      throw new Error(`Failed to download asset: HTTP ${downloadRes.status}`);
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(downloadRes.uri);
      Alert.alert('Saved to Photos', `"${filename}" saved to your device photos.`);
    } else {
      Alert.alert('Saved to Files', `"${filename}" saved in app files.`);
    }

    return downloadRes.uri;
  } catch (err: any) {
    Alert.alert('Save Error', err.message || 'Could not save asset.');
    return null;
  }
}

/**
 * Download a base64 / data URI as a file on web or native
 */
export async function downloadDataUri(
  dataUri: string,
  filename: string
): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      Alert.alert('Downloaded', `"${filename}" saved to your Downloads folder.`);
      return;
    }

    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    const base64Data = dataUri.replace(/^data:image\/\w+;base64,/, '');
    await FileSystem.writeAsStringAsync(fileUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert('Saved to Photos', `"${filename}" saved to photo gallery.`);
    }
  } catch (err: any) {
    Alert.alert('Download Error', err.message || 'Could not download data URI.');
  }
}

export async function shareAsset(uri: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ url: uri, title: 'VeriTwin Asset' });
        return;
      }
      window.open(uri, '_blank');
      return;
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return;
    }
    await Sharing.shareAsync(uri);
  } catch (err: any) {
    Alert.alert('Share Failed', err.message || 'Could not share asset.');
  }
}
