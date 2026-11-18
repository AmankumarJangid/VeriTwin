import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { QRCodeCard } from '../../../src/components/QRCodeCard';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { CreatedTwinAssetUnit } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { saveAssetToGallery, shareAsset } from '../../../src/utils/files';
import { getErrorMessage } from '../../../src/utils/errors';

export default function CreateTwinsScreen() {
  const router = useRouter();

  // Stepper state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(2);
  const [logoUri, setLogoUri] = useState<string>(
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop&q=80'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdTwins, setCreatedTwins] = useState<CreatedTwinAssetUnit[] | null>(null);

  // Queries
  const { data: prodData } = useQuery({
    queryKey: ['mfg-create-products'],
    queryFn: () => manufacturerApi.getProducts(),
  });
  const products = prodData?.data?.products || [];

  const activeProductId = selectedProductId || products[0]?.product_id;

  const { data: batchData } = useQuery({
    queryKey: ['mfg-create-batches', activeProductId],
    queryFn: () => manufacturerApi.getBatches({ product_id: activeProductId }),
    enabled: !!activeProductId,
  });
  const batches = batchData?.data?.batches || [];

  const handlePickLogo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!res.canceled && res.assets[0]?.uri) {
        setLogoUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Notice', 'Using default brand emblem image.');
    }
  };

  const handleGenerate = async () => {
    const prod = activeProductId;
    const batch = selectedBatchId || batches[0]?.batch_id;

    if (!prod || !batch) {
      Alert.alert('Missing Selection', 'Please ensure both product and batch are selected.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await manufacturerApi.createTwins({
        product_id: prod,
        batch_id: batch,
        quantity,
      });

      setCreatedTwins(res.twins);
      Alert.alert(
        'Digital Twins Minted!',
        `Successfully generated ${res.twins.length} digital twin(s) with imperceptible watermarks and signed QR keys.`
      );
    } catch (err) {
      Alert.alert('Generation Failed', getErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Screen
      scrollable
      title="Create Digital Twins"
      subtitle="Physical-digital watermarking & cryptographic genesis"
      roleAccent={colors.role.MANUFACTURER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* RESULT VIEW (If twins created) */}
        {createdTwins ? (
          <View>
            <View style={styles.successHeader}>
              <Ionicons name="checkmark-circle" size={44} color={colors.success} />
              <Text style={[typography.h2, { color: colors.text, marginTop: spacing.xs }]}>
                {createdTwins.length} Digital Twin(s) Created
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
                Each unit has an imperceptible watermark encoded in its logo and a signed fallback QR
                payload.
              </Text>
            </View>

            {createdTwins.map((twin, idx) => (
              <View key={twin.twin_id} style={styles.twinResultCard}>
                <View style={styles.twinResultHeader}>
                  <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                    UNIT #{idx + 1}
                  </Text>
                  <Text style={[typography.h3, { color: colors.text }]}>{twin.serial_number}</Text>
                  <Text style={[typography.code, { color: colors.textMuted }]}>
                    Code: {twin.twin_code}
                  </Text>
                </View>

                {/* Watermarked Logo Preview */}
                <View style={styles.assetBox}>
                  <Text style={[typography.captionBold, styles.assetTitle]}>
                    ENCODED WATERMARK LOGO
                  </Text>
                  <Image source={{ uri: twin.watermarked_logo_url }} style={styles.logoAssetImage} />
                  <View style={styles.assetActionRow}>
                    <Button
                      title="Save to Photos"
                      onPress={() => saveAssetToGallery(twin.watermarked_logo_url, `wm_${twin.serial_number}.png`)}
                      variant="secondary"
                      size="sm"
                      leftIcon={<Ionicons name="download-outline" size={16} color={colors.text} />}
                    />
                    <Button
                      title="Share"
                      onPress={() => shareAsset(twin.watermarked_logo_url, `VeriTwin Logo ${twin.serial_number}`)}
                      variant="ghost"
                      size="sm"
                      leftIcon={<Ionicons name="share-social-outline" size={16} color={colors.text} />}
                    />
                  </View>
                </View>

                {/* Fallback QR Preview */}
                <View style={styles.assetBox}>
                  <Text style={[typography.captionBold, styles.assetTitle]}>
                    FALLBACK VERIFICATION QR
                  </Text>
                  <QRCodeCard value={twin.fallback_qr_payload} size={180} />
                  <View style={styles.assetActionRow}>
                    <Button
                      title="Save QR Code"
                      onPress={() => saveAssetToGallery(twin.fallback_qr_url, `qr_${twin.serial_number}.png`)}
                      variant="secondary"
                      size="sm"
                      leftIcon={<Ionicons name="download-outline" size={16} color={colors.text} />}
                    />
                    <Button
                      title="Share"
                      onPress={() => shareAsset(twin.fallback_qr_url, `VeriTwin QR ${twin.serial_number}`)}
                      variant="ghost"
                      size="sm"
                      leftIcon={<Ionicons name="share-social-outline" size={16} color={colors.text} />}
                    />
                  </View>
                </View>
              </View>
            ))}

            <Button
              title="Mint Another Batch"
              onPress={() => setCreatedTwins(null)}
              variant="outline"
              size="lg"
              roleColor={colors.role.MANUFACTURER}
              style={{ marginTop: spacing.base }}
            />
          </View>
        ) : (
          /* STEPPER CREATION FORM (§6.2) */
          <View>
            {/* Step 1: Pick Product */}
            <View style={styles.stepCard}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, styles.stepTitle]}>SELECT PRODUCT SKU</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {products.map((p) => {
                    const isSelected = activeProductId === p.product_id;
                    return (
                      <TouchableOpacity
                        key={p.product_id}
                        style={[styles.stepperChoice, isSelected && styles.stepperChoiceActive]}
                        onPress={() => setSelectedProductId(p.product_id)}
                      >
                        <Text style={[typography.captionBold, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {p.name}
                        </Text>
                        <Text style={[typography.caption, { color: isSelected ? '#E0E7FF' : colors.textMuted }]}>
                          {p.sku}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Step 2: Pick Batch */}
            <View style={styles.stepCard}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, styles.stepTitle]}>SELECT BATCH LOT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                  {batches.map((b) => {
                    const isSelected = (selectedBatchId || batches[0]?.batch_id) === b.batch_id;
                    return (
                      <TouchableOpacity
                        key={b.batch_id}
                        style={[styles.stepperChoice, isSelected && styles.stepperChoiceActive]}
                        onPress={() => setSelectedBatchId(b.batch_id)}
                      >
                        <Text style={[typography.captionBold, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                          {b.batch_no}
                        </Text>
                        <Text style={[typography.caption, { color: isSelected ? '#E0E7FF' : colors.textMuted }]}>
                          {b.factory_location}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Step 3: Quantity (1–25) */}
            <View style={styles.stepCard}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, styles.stepTitle]}>QUANTITY OF UNITS (1–25)</Text>
                <View style={styles.quantityRow}>
                  {[1, 2, 5, 10, 20].map((qty) => (
                    <TouchableOpacity
                      key={qty}
                      style={[styles.qtyChip, quantity === qty && styles.qtyChipActive]}
                      onPress={() => setQuantity(qty)}
                    >
                      <Text
                        style={[
                          typography.captionBold,
                          { color: quantity === qty ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {qty} {qty === 1 ? 'Unit' : 'Units'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Step 4: Pick Base Brand Logo */}
            <View style={styles.stepCard}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>4</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.captionBold, styles.stepTitle]}>
                  BASE BRAND LOGO EMBLEM
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 8 }]}>
                  This emblem will be invisibly encoded with unique watermark bits.
                </Text>

                <View style={styles.logoPickerContainer}>
                  <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                  <Button
                    title="Change Logo Image"
                    onPress={handlePickLogo}
                    variant="secondary"
                    size="sm"
                    leftIcon={<Ionicons name="image-outline" size={16} color={colors.text} />}
                  />
                </View>
              </View>
            </View>

            {/* Step 5: Generate CTA */}
            <Button
              title={`Mint ${quantity} Digital Twin${quantity > 1 ? 's' : ''}`}
              onPress={handleGenerate}
              loading={isGenerating}
              roleColor={colors.role.MANUFACTURER}
              size="lg"
              style={{ marginTop: spacing.base }}
              leftIcon={<Ionicons name="sparkles" size={20} color="#FFFFFF" />}
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.base,
    gap: spacing.md,
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.role.MANUFACTURER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  stepTitle: {
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  stepperChoice: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.xs,
    minWidth: 120,
  },
  stepperChoiceActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  quantityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 8,
  },
  qtyChip: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  qtyChipActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  logoPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    marginTop: spacing.xs,
  },
  logoPreview: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
  },
  successHeader: {
    alignItems: 'center',
    padding: spacing.base,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    marginBottom: spacing.base,
  },
  twinResultCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  twinResultHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  assetBox: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  assetTitle: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 11,
  },
  logoAssetImage: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  assetActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
