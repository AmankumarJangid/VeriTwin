// Create Master Product Screen
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { createProductApi } from '../../../src/api/manufacturer';
import { ProductCategory } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { radii, spacing } from '../../../src/theme/spacing';

export default function NewProductScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sku, setSku] = useState(`WCH-MOD-${Math.floor(100 + Math.random() * 900)}`);
  const [name, setName] = useState('Monaco Heritage Chrono');
  const [brand, setBrand] = useState('Aurelia');
  const [category, setCategory] = useState<ProductCategory>('WATCH');
  const [mrp, setMrp] = useState('32999');
  const [material, setMaterial] = useState('Grade 5 Titanium, Sapphire Crystal');
  const [description, setDescription] = useState('Precision dual-register chronograph with column wheel mechanism.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: ProductCategory[] = ['WATCH', 'APPAREL', 'FOOTWEAR', 'ACCESSORY', 'OTHER'];

  const handleSubmit = async () => {
    if (!sku.trim() || !name.trim() || !mrp.trim()) {
      Alert.alert('Required Fields', 'Please complete SKU, name, and retail price.');
      return;
    }

    try {
      setIsSubmitting(true);
      await createProductApi({
        sku: sku.trim(),
        name: name.trim(),
        brand: brand.trim(),
        category,
        mrp: Number(mrp),
        currency: 'INR',
        material: material.trim(),
        description: description.trim(),
        specs: {
          case_mm: 41,
          movement: 'Automatic Chronograph',
          water_resistance_m: 100,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['manufacturerProducts'] });
      Alert.alert('Product Created', 'New product master registered successfully.');
      router.back();
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not register product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen
      title="New Master Product"
      subtitle="Register specifications and MSRP before batch minting"
      roleBadge={{ text: 'Manufacturer', color: colors.roleManufacturer }}
      headerRight={
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.ink} />
        </TouchableOpacity>
      }
    >
      <View style={styles.card}>
        <FormField
          label="Stock Keeping Unit (SKU)"
          placeholder="WCH-MOD-001"
          autoCapitalize="characters"
          value={sku}
          onChangeText={setSku}
        />

        <FormField
          label="Product Model Name"
          placeholder="e.g. Chrono Classic 42"
          value={name}
          onChangeText={setName}
        />

        <FormField
          label="Brand"
          placeholder="Aurelia"
          value={brand}
          onChangeText={setBrand}
        />

        {/* Category Selector */}
        <Text style={styles.fieldLabel}>Product Category</Text>
        <View style={styles.categoryRow}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormField
          label="Maximum Retail Price (INR)"
          placeholder="24999"
          keyboardType="numeric"
          value={mrp}
          onChangeText={setMrp}
        />

        <FormField
          label="Material Composition"
          placeholder="316L Steel, Sapphire Glass"
          value={material}
          onChangeText={setMaterial}
        />

        <FormField
          label="Product Description"
          placeholder="Detailed description of craftsmanship and finishes"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Button
          title="Save Product Master"
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  catChip: {
    backgroundColor: colors.surface2,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  catChipActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  catText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.ink,
  },
  catTextActive: {
    color: colors.onPrimary,
  },
});
