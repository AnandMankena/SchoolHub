import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Platform } from 'react-native';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
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
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
});
