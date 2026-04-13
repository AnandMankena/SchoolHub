import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', text: '#1E2022', textSec: '#707A8A',
  border: '#EAECEF', error: '#E63946',
};
const isWeb = Platform.OS === 'web';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = isWeb && width > 768;

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await logout();
        router.replace('/');
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
      ]);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}>
        <View style={[s.content, isDesktop && s.contentDesktop]}>
          <Text style={[s.title, isDesktop && { fontSize: 34 }]}>Profile</Text>

          {isDesktop ? (
            <View style={s.desktopRow}>
              <View style={s.desktopLeft}>
                <View style={s.profileCard}>
                  <View style={s.avatar}>
                    <Ionicons name="person" size={36} color={COLORS.primary} />
                  </View>
                  <Text style={s.name}>{user?.name}</Text>
                  <Text style={s.email}>{user?.email}</Text>
                  <View style={s.roleBadge}>
                    <Text style={s.roleText}>{user?.role === 'principal' ? 'Principal' : 'Teacher'}</Text>
                  </View>
                </View>
              </View>
              <View style={s.desktopRight}>
                {user?.role === 'principal' && (
                  <View style={s.section}>
                    <Text style={s.sectionTitle}>Administration</Text>
                    <TouchableOpacity testID="manage-teachers-btn" style={s.menuItem} onPress={() => router.push('/manage-teachers')}>
                      <View style={[s.menuIcon, { backgroundColor: '#FFF0F5' }]}>
                        <Ionicons name="people-outline" size={20} color={COLORS.secondary} />
                      </View>
                      <View style={s.menuInfo}>
                        <Text style={s.menuText}>Manage Teachers</Text>
                        <Text style={s.menuSubtext}>Approve, create, and manage teachers</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Settings</Text>
                  <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                    <Text style={s.logoutText}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={s.profileCard}>
                <View style={s.avatar}>
                  <Ionicons name="person" size={36} color={COLORS.primary} />
                </View>
                <Text style={s.name}>{user?.name}</Text>
                <Text style={s.email}>{user?.email}</Text>
                <View style={s.roleBadge}>
                  <Text style={s.roleText}>{user?.role === 'principal' ? 'Principal' : 'Teacher'}</Text>
                </View>
              </View>

              {user?.role === 'principal' && (
                <View style={s.section}>
                  <Text style={s.sectionTitle}>Administration</Text>
                  <TouchableOpacity testID="manage-teachers-btn" style={s.menuItem} onPress={() => router.push('/manage-teachers')}>
                    <View style={[s.menuIcon, { backgroundColor: '#FFF0F5' }]}>
                      <Ionicons name="people-outline" size={20} color={COLORS.secondary} />
                    </View>
                    <View style={s.menuInfo}>
                      <Text style={s.menuText}>Manage Teachers</Text>
                      <Text style={s.menuSubtext}>Approve, create, and manage teachers</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                  </TouchableOpacity>
                </View>
              )}

              <View style={s.section}>
                <Text style={s.sectionTitle}>Settings</Text>
                <TouchableOpacity testID="logout-btn" style={s.logoutBtn} onPress={handleLogout}>
                  <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                  <Text style={s.logoutText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 40 },
  scrollDesktop: { paddingHorizontal: 48, paddingTop: 32 },
  content: {},
  contentDesktop: { maxWidth: 1100, alignSelf: 'center', width: '100%' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 24 },
  desktopRow: { flexDirection: 'row', gap: 32 },
  desktopLeft: { flex: 4 },
  desktopRight: { flex: 6 },
  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 15, color: COLORS.textSec, marginTop: 4 },
  roleBadge: {
    backgroundColor: COLORS.primaryLight, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, marginTop: 12,
  },
  roleText: { color: COLORS.primary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  menuItem: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuInfo: { flex: 1 },
  menuText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  menuSubtext: { fontSize: 13, color: COLORS.textSec, marginTop: 2 },
  logoutBtn: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FFE0E0',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: COLORS.error },
});
