import React from 'react';
import { Stack, useSegments } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';
import { WEB_APP_MAX_WIDTH } from '../constants/layout';

const isWeb = Platform.OS === 'web';

/** Analytics uses full viewport width on web; other stack screens use the centered max-width shell. */
function WebContentShell({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const onAnalytics = (segments as string[]).includes('analytics');
  const constrainWeb = isWeb && !onAnalytics;

  return (
    <View style={[styles.root, constrainWeb && styles.rootWeb]}>
      <View style={[styles.shell, constrainWeb && styles.shellWeb]}>{children}</View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <WebContentShell>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="class-detail" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="section-detail" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="marks-entry" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="chat-room" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="manage-teachers" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="attendance" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="create-group" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="student-detail" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="analytics" options={{ headerShown: false, presentation: 'card' }} />
          <Stack.Screen name="members" options={{ headerShown: false, presentation: 'card' }} />
        </Stack>
      </WebContentShell>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  rootWeb: {
    alignItems: 'center',
  },
  shell: {
    flex: 1,
    width: '100%',
  },
  shellWeb: {
    maxWidth: WEB_APP_MAX_WIDTH,
    width: '100%',
    flex: 1,
  },
});
