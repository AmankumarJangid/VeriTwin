import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  ImageStyle,
  StyleProp,
  ImageResizeMode,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { colors } from '../theme/colors';

interface AuthImageProps {
  uri?: string | null;
  token?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackText?: string;
}

export const AuthImage: React.FC<AuthImageProps> = ({
  uri,
  style,
  resizeMode = 'cover',
  fallbackIcon = 'image-outline',
  fallbackText = 'Image not available',
}) => {
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    let localBlobUrl: string | null = null;

    if (!uri) {
      setLoading(false);
      setHasError(true);
      return;
    }

    // Direct display for data URLs, local file URIs, or external unauthenticated CDNs
    if (uri.startsWith('data:') || uri.startsWith('file:') || (!uri.includes('/api/assets') && !uri.includes('localhost:4000'))) {
      setDisplayUri(uri);
      setLoading(false);
      setHasError(false);
      return;
    }

    // Fetch protected asset via apiClient with automatic Bearer token and 401 refresh
    const fetchAsset = async () => {
      try {
        setLoading(true);
        setHasError(false);

        const res: any = await apiClient.get(uri, { responseType: 'blob' });
        if (!isMounted) return;

        const data = res?.data || res;
        const blob = data instanceof Blob ? data : new Blob([data], { type: 'image/png' });
        localBlobUrl = URL.createObjectURL(blob);
        setDisplayUri(localBlobUrl);
        setLoading(false);
      } catch {
        if (!isMounted) return;
        setHasError(true);
        setLoading(false);
      }
    };

    fetchAsset();

    return () => {
      isMounted = false;
      if (localBlobUrl && Platform.OS === 'web') {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [uri]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, style]}>
        <ActivityIndicator size="small" color={colors.finOrange} />
      </View>
    );
  }

  if (hasError || !displayUri) {
    return (
      <View style={[styles.centerContainer, styles.fallbackContainer, style]}>
        <Ionicons name={fallbackIcon} size={28} color={colors.inkMuted} />
        {fallbackText ? (
          <Text style={styles.fallbackText}>{fallbackText}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: displayUri }}
      style={style}
      resizeMode={resizeMode}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 8,
  },
  fallbackContainer: {
    padding: 8,
  },
  fallbackText: {
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
