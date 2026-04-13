import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', text: '#1E2022', textSec: '#707A8A',
  border: '#EAECEF', error: '#E63946',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { logout(); router.replace('/'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'principal' ? 'Principal' : 'Teacher'}</Text>
          </View>
        </View>

        {user?.role === 'principal' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administration</Text>
            <TouchableOpacity
              testID="manage-teachers-btn"
              style={styles.menuItem}
              onPress={() => router.push('/manage-teachers')}
            >
              <View style={[styles.menuIcon, { backgroundColor: '#FFF0F5' }]}>
                <Ionicons name="people-outline" size={20} color={COLORS.secondary} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuText}>Manage Teachers</Text>
                <Text style={styles.menuSubtext}>Approve, create, and manage teachers</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <TouchableOpacity testID="logout-btn" style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 24 },
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
