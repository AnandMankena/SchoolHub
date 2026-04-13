import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <View style={styles.webWrapper}>
        <View style={styles.webInner}>
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
          </Stack>
        </View>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    ...(Platform.OS === 'web' ? { alignItems: 'center' as const } : {}),
  },
  webInner: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      maxWidth: 500,
      backgroundColor: '#F7F9FC',
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: '#EAECEF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    } : {}),
  },
});
