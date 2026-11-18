import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../src/components/Screen';
import { FormField } from '../../../src/components/FormField';
import { Button } from '../../../src/components/Button';
import { manufacturerApi } from '../../../src/api/manufacturer';
import { ProductCategory } from '../../../src/types/api';
import { colors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { getErrorMessage } from '../../../src/utils/errors';

export default function NewProductScreen() {
  const router = useRouter();

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Aurelia');
  const [category, setCategory] = useState<ProductCategory>('WATCH');
  const [mrp, setMrp] = useState('');
  const [material, setMaterial] = useState('');
  const [description, setDescription] = useState('');

  // Dynamic specs key-value rows (§6.2)
  const [specsList, setSpecsList] = useState<Array<{ key: string; value: string }>>([
    { key: 'movement', value: 'Automatic' },
    { key: 'case_mm', value: '42' },
  ]);

  const [loading, setLoading] = useState(false);

  const addSpecRow = () => {
    setSpecsList((prev) => [...prev, { key: '', value: '' }]);
  };

  const updateSpecRow = (index: number, field: 'key' | 'value', text: string) => {
    setSpecsList((prev) => {
      const copy = [...prev];
      copy[index][field] = text;
      return copy;
    });
  };

  const removeSpecRow = (index: number) => {
    setSpecsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!sku || !name || !mrp) {
      Alert.alert('Required Fields', 'Please fill in SKU, Product Name, and MRP.');
      return;
    }

    const specsObj: Record<string, string | number> = {};
    specsList.forEach((row) => {
      if (row.key.trim()) {
        const numVal = Number(row.value);
        specsObj[row.key.trim()] = isNaN(numVal) ? row.value : numVal;
      }
    });

    setLoading(true);
    try {
      await manufacturerApi.createProduct({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        brand: brand.trim(),
        category,
        mrp: parseFloat(mrp),
        currency: 'INR',
        material: material.trim(),
        specs: specsObj,
        description: description.trim(),
      });

      Alert.alert('Product Created', `SKU ${sku.toUpperCase()} registered successfully.`);
      router.back();
    } catch (err) {
      Alert.alert('Failed to Create Product', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scrollable
      title="New Product SKU"
      subtitle="Define specifications and security baseline"
      roleAccent={colors.role.MANUFACTURER}
      headerLeft={
        <TouchableOpacity onPress={() => router.back()} style={{ padding: spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <FormField
            label="SKU Code"
            placeholder="e.g. WCH-CHR-002"
            value={sku}
            onChangeText={setSku}
            autoCapitalize="characters"
            required
            helperText="Unique product stock-keeping unit"
          />

          <FormField
            label="Product Name"
            placeholder="e.g. Chrono Diver 300M"
            value={name}
            onChangeText={setName}
            required
          />

          <FormField
            label="Brand Name"
            placeholder="e.g. Aurelia"
            value={brand}
            onChangeText={setBrand}
            required
          />

          <Text style={[typography.captionBold, styles.fieldLabel]}>CATEGORY</Text>
          <View style={styles.categoryPicker}>
            {(['WATCH', 'APPAREL', 'FOOTWEAR', 'ACCESSORY', 'OTHER'] as ProductCategory[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryOption, category === cat && styles.categoryOptionActive]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    typography.captionBold,
                    styles.categoryOptionText,
                    category === cat && styles.categoryOptionTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormField
            label="Maximum Retail Price (INR ₹)"
            placeholder="e.g. 29999.00"
            value={mrp}
            onChangeText={setMrp}
            keyboardType="decimal-pad"
            required
          />

          <FormField
            label="Material & Craftsmanship"
            placeholder="e.g. 316L Stainless Steel, Titanium bezel"
            value={material}
            onChangeText={setMaterial}
          />

          <FormField
            label="Description"
            placeholder="Short product overview..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          {/* Dynamic Specifications (§6.2) */}
          <View style={styles.specsHeaderRow}>
            <Text style={[typography.captionBold, styles.fieldLabel]}>
              TECHNICAL SPECIFICATIONS
            </Text>
            <TouchableOpacity onPress={addSpecRow} style={styles.addSpecBtn}>
              <Ionicons name="add" size={16} color={colors.role.MANUFACTURER_LIGHT} />
              <Text style={[typography.captionBold, { color: colors.role.MANUFACTURER_LIGHT }]}>
                Add Field
              </Text>
            </TouchableOpacity>
          </View>

          {specsList.map((row, index) => (
            <View key={index} style={styles.specInputRow}>
              <FormField
                label=""
                placeholder="Key (e.g. movement)"
                value={row.key}
                onChangeText={(text) => updateSpecRow(index, 'key', text)}
                containerStyle={styles.specKeyInput}
              />
              <FormField
                label=""
                placeholder="Value (e.g. Automatic)"
                value={row.value}
                onChangeText={(text) => updateSpecRow(index, 'value', text)}
                containerStyle={styles.specValInput}
              />
              <TouchableOpacity
                onPress={() => removeSpecRow(index)}
                style={styles.removeSpecBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <Button
            title="Create Product"
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
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  categoryOption: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  categoryOptionActive: {
    backgroundColor: colors.role.MANUFACTURER,
    borderColor: colors.role.MANUFACTURER_LIGHT,
  },
  categoryOptionText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  categoryOptionTextActive: {
    color: '#FFFFFF',
  },
  specsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  addSpecBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  specKeyInput: {
    flex: 1,
    marginBottom: 0,
  },
  specValInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeSpecBtn: {
    padding: spacing.sm,
  },
});
