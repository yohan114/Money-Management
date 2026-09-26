import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { FinancialProvider, useFinancial } from '../context/FinancialContext';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

function AppContent() {
  const { settings, loading } = useFinancial();
  const [isUnlocked, setIsUnlocked] = useState(false);

  const authenticateUser = React.useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Money Management',
        fallbackLabel: 'Use Device Passcode',
      });
      if (result.success) {
        setIsUnlocked(true);
      }
    } catch (e) {
      console.error('Biometric authentication failed:', e);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (!loading && settings.biometricLock && !isUnlocked) {
      LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Money Management',
        fallbackLabel: 'Use Device Passcode',
      }).then((result) => {
        if (active && result.success) {
          setIsUnlocked(true);
        }
      }).catch((e) => {
        console.error('Biometric authentication failed:', e);
      });
    }
    return () => {
      active = false;
    };
  }, [loading, settings.biometricLock, isUnlocked]);

  const isLocked = !loading && settings.biometricLock && !isUnlocked;

  if (isLocked) {
    return (
      <SafeAreaView style={styles.lockScreen}>
        <View style={styles.lockIconCircle}>
          <Ionicons name="lock-closed" size={44} color={COLORS.primaryLight} />
        </View>
        <Text style={styles.lockTitle}>Money Management</Text>
        <Text style={styles.lockSubtitle}>
          App is locked with biometric security
        </Text>
        <Pressable
          style={({ pressed }) => [styles.unlockBtn, pressed && { opacity: 0.85 }]}
          onPress={authenticateUser}
        >
          <Ionicons name="finger-print" size={20} color="#FFF" />
          <Text style={styles.unlockBtnText}>Unlock App</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal/transaction"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/budget"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/recurring"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/account"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/goal"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="modal/holding"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <FinancialProvider>
        <AppContent />
      </FinancialProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  lockIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryGlow,
    borderWidth: 1,
    borderColor: COLORS.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  lockTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  lockSubtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
