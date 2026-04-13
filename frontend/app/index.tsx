import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', yellow: '#FF9F1C',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF',
  error: '#E63946', success: '#2EC4B6',
};

export default function LoginScreen() {
  const { user, loading: authLoading, login, register } = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)/dashboard');
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
      } else {
        const result = await register(name.trim(), email.trim(), password);
        setSuccess(result.message || 'Registration successful! Waiting for approval.');
        setName('');
        setEmail('');
        setPassword('');
        setIsLogin(true);
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, isWeb && styles.scrollWeb]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[isWeb && styles.webFormWrap]}>
            <View style={[styles.header, isWeb && styles.headerWeb]}>
              <View style={[styles.logoCircle, isWeb && styles.logoCircleWeb]}>
                <Ionicons name="school" size={isWeb ? 32 : 40} color={COLORS.surface} />
              </View>
              <Text style={[styles.title, isWeb && styles.titleWeb]}>SchoolHub</Text>
              <Text style={[styles.subtitle, isWeb && styles.subtitleWeb]}>Manage your school efficiently</Text>
            </View>

            <View style={[styles.card, isWeb && styles.cardWeb]}>
            <View style={styles.tabRow}>
              <TouchableOpacity
                testID="login-tab"
                style={[styles.tab, isLogin && styles.tabActive]}
                onPress={() => { setIsLogin(true); setError(''); setSuccess(''); }}
              >
                <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="register-tab"
                style={[styles.tab, !isLogin && styles.tabActive]}
                onPress={() => { setIsLogin(false); setError(''); setSuccess(''); }}
              >
                <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>Register</Text>
              </TouchableOpacity>
            </View>

            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSec} />
                  <TextInput
                    testID="name-input"
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.textSec}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSec} />
                <TextInput
                  testID="email-input"
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textSec}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSec} />
                <TextInput
                  testID="password-input"
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textSec}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity testID="toggle-password" onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSec} />
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              testID="submit-btn"
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>

            {isLogin && (
              <Text style={styles.hint}>
                Principal: principal@school.com / Admin@123
              </Text>
            )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  scrollWeb: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  webFormWrap: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: { alignItems: 'center', marginBottom: 32 },
  headerWeb: { marginBottom: 20 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  logoCircleWeb: {
    width: 64,
    height: 64,
    borderRadius: 20,
    marginBottom: 12,
  },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  titleWeb: { fontSize: 26 },
  subtitle: { fontSize: 16, color: COLORS.textSec, marginTop: 4 },
  subtitleWeb: { fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardWeb: {
    padding: 20,
    borderRadius: 14,
  },
  tabRow: {
    flexDirection: 'row', backgroundColor: COLORS.bg, borderRadius: 12,
    padding: 4, marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 16, fontWeight: '600', color: COLORS.textSec },
  tabTextActive: { color: COLORS.surface },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg,
    borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, color: COLORS.text },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0F0',
    borderRadius: 8, padding: 12, marginBottom: 16, gap: 8,
  },
  errorText: { color: COLORS.error, fontSize: 14, flex: 1 },
  successBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8FFF8',
    borderRadius: 8, padding: 12, marginBottom: 16, gap: 8,
  },
  successText: { color: COLORS.success, fontSize: 14, flex: 1 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', color: COLORS.textSec, fontSize: 12, marginTop: 16 },
});
