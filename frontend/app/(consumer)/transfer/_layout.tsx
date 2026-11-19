import React from 'react';
import { Stack } from 'expo-router';

export default function TransferLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f1ec' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="claim" />
      <Stack.Screen name="[twinId]" />
    </Stack>
  );
}
