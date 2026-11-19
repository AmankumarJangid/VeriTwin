// Create Production Batch Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { getProductsApi, createBatchApi } from '../../../src/api/manufacturer';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function NewBatchScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: prodData } = useQuery({
    queryKey: ['productsList'],
    queryFn: () => getProductsApi(),
  });

  const products = prodData?.products || [];

  const [selectedProductId, setSelectedProductId] = useState('');
  const [batchNo, setBatchNo] = useState(`B-2026-11-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`);
  const [plannedQty, setPlannedQty] = useState('50');
  const [manufacturedOn, setManufacturedOn] = useState(new Date().toISOString().split('T')[0]);
  const [factoryLocation, setFactoryLocation] = useState('Jodhpur Atelier, IN');
  const [notes, setNotes] = useState('Certified precision assembly line 1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const prodId = selectedProductId || (products[0] ? products[0].product_id : '');
    if (!prodId || !batchNo.trim()) {
      Alert.alert('Required Fields', 'Please select a product and provide batch number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createBatchApi({
        product_id: prodId,
        batch_no: batchNo.trim(),
        planned_quantity: Number(plannedQty) || 50,
        manufactured_on: manufacturedOn,
        factory_location: factoryLocation.trim(),
        notes: notes.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ['manufacturerBatches'] });
      Alert.alert('Batch Created', 'Production batch registered successfully.');
      router.back();
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not create batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      title="Create Production Batch"
      subtitle="Define production run parameters and unit allotment"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Select Target Master Product</Text>
        <View style={styles.prodList}>
          {products.map((p) => {
            const isSelected = (selectedProductId || products[0]?.product_id) === p.product_id;
            return (
              <TouchableOpacity
                key={p.product_id}
                style={[styles.prodChip, isSelected && styles.prodChipActive]}
                onPress={() => setSelectedProductId(p.product_id)}
              >
                <Text style={[styles.prodText, isSelected && styles.prodTextActive]}>
                  {p.name}
                </Text>
                <Text style={[styles.prodSub, isSelected && styles.prodSubActive]}>
                  SKU: {p.sku}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FormField
          label="Batch Number / Serial Prefix"
          placeholder="B-2026-11-C"
          autoCapitalize="characters"
          value={batchNo}
          onChangeText={setBatchNo}
        />

        <FormField
          label="Planned Quantity (Units)"
          placeholder="50"
          keyboardType="numeric"
          value={plannedQty}
          onChangeText={setPlannedQty}
        />

        <FormField
          label="Manufacture Date (YYYY-MM-DD)"
          placeholder="2026-11-18"
          value={manufacturedOn}
          onChangeText={setManufacturedOn}
        />

        <FormField
          label="Factory / Atelier Location"
          placeholder="Jodhpur Atelier, IN"
          value={factoryLocation}
          onChangeText={setFactoryLocation}
        />

        <FormField
          label="Quality & Tooling Notes"
          placeholder="Run specific notes or calibration standard"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Button
          title="Save Production Batch"
          onPress={handleSubmit}
          loading={isSubmitting}
          variant="primary"
          style={{ marginTop: spacing.md }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    padding: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  fieldLabel: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 6,
  },
  prodList: {
    gap: 8,
    marginBottom: spacing.md,
  },
  prodChip: {
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radii.md,
    padding: 10,
  },
  prodChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  prodText: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.ink,
  },
  prodTextActive: {
    color: colors.onPrimary,
  },
  prodSub: {
    ...typography.caption,
    color: colors.inkMuted,
    marginTop: 2,
  },
  prodSubActive: {
    color: colors.hairline,
  },
});
