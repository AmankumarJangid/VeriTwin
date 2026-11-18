import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { SpecList } from '../../../src/components/SpecList';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { formatCurrency, formatDateTime } from '../../../src/utils/format';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [editedPrice, setEditedPrice] = useState('');
  const [editedDesc, setEditedDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['manufacturer-product-detail', id],
    queryFn: () => manufacturerApi.getProductDetail(id),
  });

  const product = data?.product;
  const stats = data?.stats;

  const handleUpdate = async () => {
    if (!product) return;
    setSaving(true);
    try {
      await manufacturerApi.updateProduct(product.product_id, {
        mrp: editedPrice ? parseFloat(editedPrice) : undefined,
        description: editedDesc || undefined,
      });
      setIsEditing(false);
      refetch();
      Alert.alert('Updated', 'Product details updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      scrollable
      title={product?.name || 'Product Details'}
      subtitle={`SKU: ${product?.sku || ''}`}
      roleAccent={colors.role.MANUFACTURER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
      headerRight={
        <TouchableOpacity
          onPress={() => {
            if (product) {
              setEditedPrice(String(product.mrp));
              setEditedDesc(product.description);
              setIsEditing(!isEditing);
            }
          }}
          style={{ padding: spacing.xs }}
        >
          <Ionicons
            name={isEditing ? 'close' : 'create-outline'}
            size={22}
            color={colors.role.MANUFACTURER_LIGHT}
          />
        </TouchableOpacity>
      }
    >
      {isLoading || !product ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.role.MANUFACTURER} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Stats Grid (§6.2) */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[typography.captionBold, styles.statLabel]}>TOTAL TWINS</Text>
              <Text style={[typography.h2, { color: colors.role.MANUFACTURER_LIGHT }]}>
                {stats?.twins_total || 0}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[typography.captionBold, styles.statLabel]}>IN RETAIL</Text>
              <Text style={[typography.h2, { color: colors.status.IN_RETAIL }]}>
                {stats?.in_retail || 0}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={[typography.captionBold, styles.statLabel]}>SOLD / CLAIMED</Text>
              <Text style={[typography.h2, { color: colors.success }]}>
                {stats?.sold || 0}
              </Text>
            </View>
          </View>

          {/* Edit Form or Read View */}
          {isEditing ? (
            <View style={styles.card}>
              <Text style={[typography.captionBold, styles.cardTitle]}>EDIT PRODUCT RECORD</Text>
              <FormField
                label="Maximum Retail Price (₹)"
                value={editedPrice}
                onChangeText={setEditedPrice}
                keyboardType="decimal-pad"
              />
              <FormField
                label="Description"
                value={editedDesc}
                onChangeText={setEditedDesc}
                multiline
                numberOfLines={3}
              />
              <Button
                title="Save Changes"
                onPress={handleUpdate}
                loading={saving}
                roleColor={colors.role.MANUFACTURER}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Brand</Text>
                <Text style={[typography.bodyBold, { color: colors.text }]}>{product.brand}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Category</Text>
                <Text style={[typography.bodyBold, { color: colors.text }]}>{product.category}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Price (MRP)</Text>
                <Text style={[typography.h3, { color: colors.success }]}>
                  {formatCurrency(product.mrp)}
                </Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Material</Text>
                <Text style={[typography.body, { color: colors.text }]}>{product.material}</Text>
              </View>

              <View style={styles.cardRow}>
                <Text style={[typography.captionBold, { color: colors.textSecondary }]}>Created</Text>
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  {formatDateTime(product.created_at)}
                </Text>
              </View>

              <Text style={[typography.body, styles.desc]}>{product.description}</Text>
            </View>
          )}

          {/* Specifications */}
          <Text style={[typography.captionBold, styles.sectionHeader]}>
            TECHNICAL SPECIFICATIONS
          </Text>
          <SpecList specs={product.specs} />

          {/* Direct CTA to Create Twins from this Product */}
          <Button
            title="Create Digital Twins from this SKU"
            onPress={() => router.push('/(manufacturer)/twins/create')}
            roleColor={colors.role.MANUFACTURER}
            size="lg"
            style={{ marginTop: spacing.xl }}
            leftIcon={<Ionicons name="sparkles-outline" size={20} color="#FFFFFF" />}
          />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginBottom: 4,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.base,
  },
  cardTitle: {
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  desc: {
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  sectionHeader: {
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
});
