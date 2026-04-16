import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      <LinearGradient colors={COLORS.gradient2} style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </LinearGradient>
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
    <View style={{ flex: 1 }}>
      <LinearGradient colors={COLORS.gradient2} style={styles.gradientBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        <View style={[styles.decorCircle, styles.decorCircle3]} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={[styles.scroll, isWeb && styles.scrollWeb]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[isWeb && styles.webFormWrap]}>
              {/* Logo and Title */}
              <View style={[styles.header, isWeb && styles.headerWeb]}>
                <LinearGradient
                  colors={[COLORS.white, COLORS.primaryLight]}
                  style={[styles.logoCircle, isWeb && styles.logoCircleWeb]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="school" size={isWeb ? 36 : 48} color={COLORS.primary} />
                </LinearGradient>
                <Text style={[styles.title, isWeb && styles.titleWeb]}>SchoolHub</Text>
                <Text style={[styles.subtitle, isWeb && styles.subtitleWeb]}>
                  Manage your school with ease
                </Text>
              </View>

              {/* Form Card */}
              <View style={[styles.card, isWeb && styles.cardWeb]}>
                {/* Tabs */}
                <View style={styles.tabRow}>
                  <TouchableOpacity
                    testID="login-tab"
                    style={[styles.tab, isLogin && styles.tabActive]}
                    onPress={() => {
                      setIsLogin(true);
                      setError('');
                      setSuccess('');
                    }}
                    activeOpacity={0.8}
                  >
                    {isLogin ? (
                      <LinearGradient colors={COLORS.gradient1} style={styles.tabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.tabTextActive}>Login</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.tabText}>Login</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="register-tab"
                    style={[styles.tab, !isLogin && styles.tabActive]}
                    onPress={() => {
                      setIsLogin(false);
                      setError('');
                      setSuccess('');
                    }}
                    activeOpacity={0.8}
                  >
                    {!isLogin ? (
                      <LinearGradient colors={COLORS.gradient1} style={styles.tabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <Text style={styles.tabTextActive}>Register</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.tabText}>Register</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Name Input (Register only) */}
                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <View style={styles.inputRow}>
                      <View style={styles.inputIcon}>
                        <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                      </View>
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

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputIcon}>
                      <Ionicons name="mail-outline" size={22} color={COLORS.primary} />
                    </View>
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

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputRow}>
                    <View style={styles.inputIcon}>
                      <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} />
                    </View>
                    <TextInput
                      testID="password-input"
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor={COLORS.textSec}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      testID="toggle-password"
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={22}
                        color={COLORS.textSec}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Error Message */}
                {error ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                {/* Success Message */}
                {success ? (
                  <View style={styles.successBox}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <TouchableOpacity
                  testID="submit-btn"
                  style={styles.submitBtnWrap}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={loading ? [COLORS.textSec, COLORS.textSec] : COLORS.gradient1}
                    style={styles.submitBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.white} />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>{isLogin ? 'Sign In' : 'Create Account'}</Text>
                        <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Hint */}
                {isLogin && (
                  <View style={styles.hintBox}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.accent4} />
                    <Text style={styles.hint}>Demo: principal@school.com / Admin@123</Text>
                  </View>
                )}
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <View style={styles.featureRow}>
                  <View style={styles.featureItem}>
                    <LinearGradient colors={COLORS.gradient3} style={styles.featureIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name="people" size={20} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.featureText}>Staff Management</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <LinearGradient colors={COLORS.gradient4} style={styles.featureIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name="stats-chart" size={20} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.featureText}>Analytics</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <LinearGradient colors={COLORS.gradient1} style={styles.featureIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name="chatbubbles" size={20} color={COLORS.white} />
                    </LinearGradient>
                    <Text style={styles.featureText}>Real-time Chat</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  gradientBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  safeArea: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  scrollWeb: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  webFormWrap: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },

  // Decorative circles
  decorCircle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1000,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    top: '40%',
    left: -75,
  },

  // Header
  header: { alignItems: 'center', marginBottom: 32 },
  headerWeb: { marginBottom: 24 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  logoCircleWeb: { width: 80, height: 80, borderRadius: 24, marginBottom: 16 },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleWeb: { fontSize: 32 },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitleWeb: { fontSize: 15 },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  cardWeb: { padding: 24, borderRadius: 20 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabActive: {},
  tabGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSec,
  },
  tabTextActive: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Inputs
  inputGroup: { marginBottom: 20 },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  inputIcon: {
    width: 50,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  eyeBtn: {
    width: 50,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Messages
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent2Light,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent1Light,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  successText: {
    color: COLORS.success,
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
  },

  // Submit Button
  submitBtnWrap: { marginTop: 8 },
  submitBtn: {
    flexDirection: 'row',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Hint
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  hint: {
    textAlign: 'center',
    color: COLORS.textSec,
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: { marginTop: 32 },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  featureItem: { alignItems: 'center', flex: 1 },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  featureText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
