import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
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
    </AuthProvider>
  );
}
