import "@/global.css";

import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Notifications from "expo-notifications";

import { initDatabase } from "@/db/queries";
import { useSettingsStore } from "@/stores/settingsStore";
import { useWorkoutStore } from "@/stores/workoutStore";
import { colors } from "@/constants/colors";
import { typography } from "@/constants/layout";

function Splash() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ ...typography.h2, color: colors.textPrimary }}>
        MinMax Tracker
      </Text>
      <Text
        style={{
          ...typography.bodySmall,
          color: colors.textSecondary,
          marginTop: 8,
        }}
      >
        Loading…
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initDatabase();
        useSettingsStore.getState().hydrate();
        useWorkoutStore.getState().hydrate();
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("DB init failed", err);
        }
      }
      if (mounted) setReady(true);
    })();

    // Fire-and-forget notification permission request.
    Notifications.requestPermissionsAsync().catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Splash />
      </SafeAreaProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="workout/[dayId]"
            options={{ presentation: "card", animation: "slide_from_right" }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
