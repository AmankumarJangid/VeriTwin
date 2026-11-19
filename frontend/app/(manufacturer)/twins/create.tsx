// Manufacturer: Create Digital Twins Flow with Logo Watermarking & QR Generation
// Spec reference: 02_FRONTEND.md §6.2 (Milestone F3) & 00_SHARED_CONTRACT.md §5.1
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { Button } from '../../../src/components/Button';
import { FormField } from '../../../src/components/FormField';
import { QRCodeCard } from '../../../src/components/QRCodeCard';
import { AuthImage } from '../../../src/components/AuthImage';
import { getProductsApi, getBatchesApi, createTwinsApi } from '../../../src/api/manufacturer';
import { CreatedTwin } from '../../../src/types/api';
import { downloadAndSaveAsset, shareAsset } from '../../../src/utils/files';
import { useAuthStore } from '../../../src/store/authStore';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function CreateTwinsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore();

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(2);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<CreatedTwin[] | null>(null);

  // Load products and batches
  const { data: prodData } = useQuery({
    queryKey: ['productsList'],
    queryFn: () => getProductsApi(),
  });

  const { data: batchData } = useQuery({
    queryKey: ['batchesList'],
    queryFn: () => getBatchesApi(),
  });

  const products = prodData?.products || [];
  const batches = batchData?.batches || [];

  const effectiveProductId = selectedProductId || (products[0] ? products[0].product_id : '');
  const availableBatches = batches.filter((b) => b.product_id === effectiveProductId);
  const effectiveBatchId =
    selectedBatchId && availableBatches.some((b) => b.batch_id === selectedBatchId)
      ? selectedBatchId
      : availableBatches[0]
      ? availableBatches[0].batch_id
      : '';

  const handlePickLogo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!res.canceled && res.assets && res.assets[0]) {
        setLogoUri(res.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Image Picker Error', err.message || 'Could not pick logo.');
    }
  };

  const handleMint = async () => {
    if (!effectiveProductId) {
      Alert.alert('Product Required', 'Please select a product first.');
      return;
    }

    if (!effectiveBatchId) {
      Alert.alert('Batch Required', 'No batch exists for this product. Please create a batch first.');
      return;
    }

    try {
      setIsMinting(true);
      const formData = new FormData();
      formData.append('product_id', effectiveProductId);
      formData.append('batch_id', effectiveBatchId);
      formData.append('quantity', String(quantity));

      if (Platform.OS === 'web') {
        let blob: Blob;
        if (logoUri) {
          // Render to 512x512 canvas so dimensions are ALWAYS >= 512x512 and format is PNG
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () =>
              reject(new Error('Failed to load selected image. Please pick a standard PNG or JPEG file.'));
            img.src = logoUri;
          });
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);
            // Draw image scaled to fit 512x512 with aspect ratio maintained
            const scale = Math.min(512 / img.width, 512 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (512 - w) / 2;
            const y = (512 - h) / 2;
            ctx.drawImage(img, x, y, w, h);
          }
          blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
          );
        } else {
          // If no logo picked, create a clean default 512x512 canvas PNG
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 44px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('VERITWIN', 256, 270);
          }
          blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
          );
        }
        formData.append('logo', blob, 'brand_logo.png');
      } else {
        if (logoUri) {
          formData.append('logo', {
            uri: logoUri,
            name: 'brand_logo.png',
            type: 'image/png',
          } as any);
        } else {
          formData.append('logo', {
            uri: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&auto=format&fit=crop',
            name: 'sample_logo.png',
            type: 'image/png',
          } as any);
        }
      }

      const res = await createTwinsApi(formData);
      setMintResult(res.twins);
      queryClient.invalidateQueries({ queryKey: ['manufacturerTwins'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturerAnalytics'] });
    } catch (err: any) {
      const msg = err.details?.fields
        ? Array.isArray(err.details.fields)
          ? err.details.fields.map((f: any) => `${f.field}: ${f.message}`).join('\n')
          : JSON.stringify(err.details.fields)
        : err.message || 'Could not mint digital twins.';
      Alert.alert('Minting Error', msg);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Screen
      title={mintResult ? 'Twins Minted Successfully' : 'Mint Digital Twins'}
      subtitle={
        mintResult
          ? `${mintResult.length} physical-digital certificates generated`
          : 'DWT-DCT watermark embedding & signed QR minting'
      }
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      {mintResult ? (
        /* Results View */
        <View style={styles.resultsContainer}>
          <Text style={styles.resultIntro}>
            Each unit contains an imperceptible watermark encoded into the printed logo and a signed
            tamper-evident fallback QR code.
          </Text>

          {mintResult.map((twin, idx) => (
            <View key={twin.twin_id} style={styles.resultCard}>
              <View style={styles.resultCardHeader}>
                <Text style={styles.unitBadge}>Unit #{idx + 1}</Text>
                <Text style={styles.serial}>{twin.serial_number}</Text>
              </View>

              <Text style={styles.code}>Twin Code: {twin.twin_code}</Text>

              {/* Watermarked Logo Preview */}
              <View style={styles.assetSection}>
                <Text style={styles.assetTitle}>Watermarked Brand Logo (Primary):</Text>
                <View style={styles.imagePreviewBox}>
                  <AuthImage
                    uri={twin.watermarked_logo_url}
                    token={accessToken}
                    style={styles.watermarkImage}
                    resizeMode="cover"
                    fallbackIcon="sparkles-outline"
                    fallbackText="Watermarked Logo"
                  />
                </View>
                <View style={styles.assetBtnsRow}>
                  <Button
                    title="Download Logo"
                    onPress={() =>
                      downloadAndSaveAsset(
                        twin.watermarked_logo_url,
                        `${twin.serial_number}-logo.png`,
                        accessToken
                      )
                    }
                    variant="secondary"
                    icon={<Ionicons name="download-outline" size={14} color={colors.ink} />}
                    style={{ flex: 1, height: 38 }}
                  />
                  <Button
                    title="Share"
                    onPress={() => shareAsset(twin.watermarked_logo_url)}
                    variant="outline"
                    icon={<Ionicons name="share-outline" size={14} color={colors.ink} />}
                    style={{ flex: 1, height: 38 }}
                  />
                </View>
              </View>

              {/* Fallback QR Card */}
              <View style={styles.assetSection}>
                <Text style={styles.assetTitle}>Signed Physical QR Code (Secondary):</Text>
                <QRCodeCard
                  payload={twin.fallback_qr_payload}
                  size={160}
                  onSave={() =>
                    downloadAndSaveAsset(
                      twin.fallback_qr_url,
                      `${twin.serial_number}-qr.png`,
                      accessToken
                    )
                  }
                  onShare={() => shareAsset(twin.fallback_qr_url)}
                />
              </View>
            </View>
          ))}

          <Button
            title="Done & View All Twins"
            onPress={() => router.replace('/(manufacturer)/twins' as any)}
            variant="primary"
            style={{ marginTop: spacing.md, width: '100%' }}
          />
        </View>
      ) : (
        /* Stepper Form */
        <View style={styles.formCard}>
          {/* Step 1: Product Selection */}
          <Text style={styles.stepTitle}>Step 1: Select Master Product</Text>
          <View style={styles.pickerRow}>
            {products.map((p) => {
              const isSelected = effectiveProductId === p.product_id;
              return (
                <TouchableOpacity
                  key={p.product_id}
                  style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                  onPress={() => {
                    setSelectedProductId(p.product_id);
                    setSelectedBatchId('');
                  }}
                >
                  <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                    {p.name}
                  </Text>
                  <Text style={[styles.pickerSub, isSelected && styles.pickerSubActive]}>
                    SKU: {p.sku}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Step 2: Batch Selection */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, marginBottom: 6 }}>
            <Text style={styles.stepTitle}>Step 2: Select Production Batch</Text>
            <TouchableOpacity onPress={() => router.push('/(manufacturer)/batches/new' as any)}>
              <Text style={styles.newBatchLink}>+ New Batch</Text>
            </TouchableOpacity>
          </View>

          {availableBatches.length === 0 ? (
            <View style={styles.emptyBatchAlert}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.finOrange} />
              <Text style={styles.emptyBatchText}>
                No production batches exist for the selected product yet.
              </Text>
              <Button
                title="Create Batch for this Product"
                variant="outline"
                onPress={() => router.push('/(manufacturer)/batches/new' as any)}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : (
            <View style={styles.pickerRow}>
              {availableBatches.map((b) => {
                const isSelected = effectiveBatchId === b.batch_id;
                return (
                  <TouchableOpacity
                    key={b.batch_id}
                    style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
                    onPress={() => setSelectedBatchId(b.batch_id)}
                  >
                    <Text style={[styles.pickerText, isSelected && styles.pickerTextActive]}>
                      {b.batch_no}
                    </Text>
                    <Text style={[styles.pickerSub, isSelected && styles.pickerSubActive]}>
                      Qty: {b.planned_quantity} units
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Step 3: Quantity */}
          <Text style={[styles.stepTitle, { marginTop: spacing.md }]}>Step 3: Units to Mint</Text>
          <View style={styles.qtyRow}>
            {[1, 2, 5, 10].map((q) => (
              <TouchableOpacity
                key={q}
                style={[styles.qtyChip, quantity === q && styles.qtyChipActive]}
                onPress={() => setQuantity(q)}
              >
                <Text style={[styles.qtyText, quantity === q && styles.qtyTextActive]}>
                  {q} {q === 1 ? 'unit' : 'units'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Step 4: Base Brand Logo */}
          <Text style={[styles.stepTitle, { marginTop: spacing.md }]}>Step 4: Base Brand Logo</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={handlePickLogo}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.uploadedLogo} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="image-outline" size={32} color={colors.inkMuted} />
                <Text style={styles.uploadText}>Select Brand Logo Image (PNG / JPEG)</Text>
                <Text style={styles.uploadSub}>
                  DWT-DCT algorithm will embed unique 32-bit twin code imperceptibly
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Button
            title={`Mint ${quantity} Digital Twin${quantity > 1 ? 's' : ''}`}
            onPress={handleMint}
            loading={isMinting}
            variant="fin"
            icon={<Ionicons name="sparkles" size={18} color={colors.onPrimary} />}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  formCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  stepTitle: {
    ...typography.cardTitle,
    fontSize: 14,
    marginBottom: 6,
  },
  newBatchLink: {
    ...typography.caption,
    color: colors.finOrange,
    fontWeight: '700',
  },
  emptyBatchAlert: {
    backgroundColor: colors.surface2,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    gap: 4,
  },
  emptyBatchText: {
    ...typography.bodySm,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  pickerRow: {
    gap: 8,
  },
  pickerChip: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 10,
  },
  pickerChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  pickerText: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
  },
  pickerTextActive: {
    color: colors.onPrimary,
  },
  pickerSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  pickerSubActive: {
    color: colors.hairline,
  },
  qtyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qtyChip: {
    flex: 1,
    backgroundColor: colors.canvas,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  qtyChipActive: {
    backgroundColor: colors.finOrange,
    borderColor: colors.finOrange,
  },
  qtyText: {
    ...typography.button,
    fontSize: 13,
    color: colors.ink,
  },
  qtyTextActive: {
    color: colors.onPrimary,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.hairline,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: colors.canvas,
    marginTop: 4,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadText: {
    ...typography.cardTitle,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  uploadSub: {
    ...typography.caption,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  uploadedLogo: {
    width: 120,
    height: 120,
    borderRadius: radii.md,
  },
  resultsContainer: {
    gap: 16,
    marginBottom: spacing.xl,
  },
  resultIntro: {
    ...typography.bodySm,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
  },
  resultCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unitBadge: {
    backgroundColor: colors.roleManufacturer + '15',
    color: colors.roleManufacturer,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  serial: {
    ...typography.mono,
    fontWeight: '700',
    color: colors.ink,
  },
  code: {
    ...typography.caption,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  assetSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.hairlineSoft,
  },
  assetTitle: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  imagePreviewBox: {
    width: '100%',
    height: 160,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  assetBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
