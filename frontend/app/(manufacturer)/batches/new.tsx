import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { getErrorMessage } from '../../../src/utils/errors';

export default function NewBatchScreen() {
  const router = useRouter();

  const [productId, setProductId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [plannedQty, setPlannedQty] = useState('100');
  const [manufacturedOn, setManufacturedOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [location, setLocation] = useState('Jodhpur Atelier, IN');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: productsData } = useQuery({
    queryKey: ['manufacturer-products-selector'],
    queryFn: () => manufacturerApi.getProducts(),
  });

  const products = productsData?.data?.products || [];

  const handleSave = async () => {
    const selectedProd = productId || products[0]?.product_id;
    if (!selectedProd || !batchNo) {
      Alert.alert('Required Fields', 'Please select a product and enter a batch number.');
      return;
    }

    setLoading(true);
    try {
      await manufacturerApi.createBatch({
        product_id: selectedProd,
        batch_no: batchNo.trim().toUpperCase(),
        planned_quantity: parseInt(plannedQty, 10) || 10,
        manufactured_on: manufacturedOn,
        factory_location: location.trim(),
        notes: notes.trim(),
      });

      Alert.alert('Batch Registered', `Batch ${batchNo.toUpperCase()} has been saved.`);
      router.back();
    } catch (err) {
      Alert.alert('Failed to Create Batch', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scrollable
      title="Register Batch"
      subtitle="Factory lot metadata tracking"
      roleAccent={colors.role.MANUFACTURER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={[typography.captionBold, styles.fieldLabel]}>SELECT PRODUCT SKU</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prodPicker}>
            {products.map((p) => {
              const active = (productId || products[0]?.product_id) === p.product_id;
              return (
                <TouchableOpacity
                  key={p.product_id}
                  style={[styles.prodOption, active && styles.prodOptionActive]}
                  onPress={() => setProductId(p.product_id)}
                >
                  <Text style={[typography.captionBold, { color: active ? '#FFFFFF' : colors.text }]}>
                    {p.name}
                  </Text>
                  <Text style={[typography.caption, { color: active ? '#E0E7FF' : colors.textMuted }]}>
                    {p.sku}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FormField
            label="Batch Identifier"
            placeholder="e.g. B-2026-11-C"
            value={batchNo}
            onChangeText={setBatchNo}
            autoCapitalize="characters"
            required
            helperText="Internal factory lot serial"
          />

          <FormField
            label="Planned Production Quantity"
            placeholder="e.g. 100"
            value={plannedQty}
            onChangeText={setPlannedQty}
            keyboardType="number-pad"
            required
          />

          <FormField
            label="Manufacturing Date (YYYY-MM-DD)"
            placeholder="2026-11-18"
            value={manufacturedOn}
            onChangeText={setManufacturedOn}
            required
          />

          <FormField
            label="Factory Atelier Location"
            placeholder="e.g. Jodhpur Atelier, IN"
            value={location}
            onChangeText={setLocation}
            required
          />

          <FormField
            label="Run Notes"
            placeholder="Special lot details, certifications..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={2}
          />

          <Button
            title="Register Production Batch"
            onPress={handleSave}
            loading={loading}
            roleColor={colors.role.MANUFACTURER}
            size="lg"
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.base,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  fieldLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  prodPicker: {
    flexDirection: 'row',
    marginBottom: spacing.base,
  },
  prodOption: {
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginRight: spacing.sm,
    minWidth: 140,
  },
  prodOptionActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
});
