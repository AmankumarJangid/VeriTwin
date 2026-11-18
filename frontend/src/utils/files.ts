import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

/**
 * Downloads and saves an asset to the device's photo library or downloads folder
 */
export async function saveAssetToGallery(
  url: string,
  fileName: string,
  authToken?: string
): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // In web, trigger standard browser download
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }

    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant photo library access to save verification assets to your device.'
      );
      return false;
    }

    const targetPath = `${FileSystem.documentDirectory}${fileName}`;
    const headers: Record<string, string> = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const downloadRes = await FileSystem.downloadAsync(url, targetPath, { headers });

    if (downloadRes.status !== 200) {
      throw new Error(`Download failed with status ${downloadRes.status}`);
    }

    const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
    await MediaLibrary.createAlbumAsync('VeriTwin', asset, false);

    Alert.alert('Saved!', `Asset saved to your gallery in the VeriTwin album.`);
    return true;
  } catch (error) {
    console.warn('Failed to save asset:', error);
    Alert.alert('Save Failed', 'Unable to save the asset. Please try again.');
    return false;
  }
}

/**
 * Shares an image file or URL using system share sheet
 */
export async function shareAsset(url: string, title?: string): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) {
        await navigator.share({ title: title || 'VeriTwin Asset', url });
        return true;
      } else {
        await navigator.clipboard.writeText(url);
        Alert.alert('Link Copied', 'Asset link copied to clipboard.');
        return true;
      }
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'System sharing is not available on this device.');
      return false;
    }

    // If it's a remote URL, download locally first
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const ext = url.endsWith('.png') ? 'png' : 'jpg';
      const localPath = `${FileSystem.cacheDirectory}share_${Date.now()}.${ext}`;
      const downloaded = await FileSystem.downloadAsync(url, localPath);
      await Sharing.shareAsync(downloaded.uri, {
        dialogTitle: title || 'Share VeriTwin Asset',
        mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
      });
    } else {
      await Sharing.shareAsync(url, {
        dialogTitle: title || 'Share VeriTwin Asset',
      });
    }

    return true;
  } catch (error) {
    console.warn('Share failed:', error);
    return false;
  }
}
