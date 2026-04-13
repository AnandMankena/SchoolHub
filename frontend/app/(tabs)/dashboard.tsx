import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', yellow: '#FF9F1C',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF',
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await apiCall('/api/dashboard/stats');
      setStats(statsData);
      if (user?.role === 'teacher') {
        const tData = await apiCall('/api/teachers/my-data');
        setTeacherData(tData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerSection}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'principal' ? 'Principal' : 'Teacher'}</Text>
          </View>
        </View>

        {user?.role === 'principal' ? (
          <>
            <View style={styles.statsGrid}>
              <TouchableOpacity testID="stat-students" style={[styles.statCard, { backgroundColor: '#E8FFF8' }]}>
                <Ionicons name="people" size={28} color={COLORS.teal} />
                <Text style={styles.statNumber}>{stats?.total_students || 0}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="stat-teachers" style={[styles.statCard, { backgroundColor: '#FFF8E8' }]}>
                <Ionicons name="person" size={28} color={COLORS.yellow} />
                <Text style={styles.statNumber}>{stats?.total_teachers || 0}</Text>
                <Text style={styles.statLabel}>Teachers</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="stat-classes" style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="book" size={28} color={COLORS.primary} />
                <Text style={styles.statNumber}>{stats?.total_classes || 0}</Text>
                <Text style={styles.statLabel}>Classes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="stat-pending"
                style={[styles.statCard, { backgroundColor: '#FFF0F5' }]}
                onPress={() => router.push('/manage-teachers')}
              >
                <Ionicons name="time" size={28} color={COLORS.secondary} />
                <Text style={styles.statNumber}>{stats?.pending_approvals || 0}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity testID="action-teachers" style={styles.actionCard} onPress={() => router.push('/manage-teachers')}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFF0F5' }]}>
                  <Ionicons name="people-outline" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.actionText}>Manage Teachers</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="action-classes" style={styles.actionCard} onPress={() => router.push('/(tabs)/classes')}>
                <View style={[styles.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                  <Ionicons name="book-outline" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.actionText}>View Classes</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="action-chat" style={styles.actionCard} onPress={() => router.push('/(tabs)/chat')}>
                <View style={[styles.actionIcon, { backgroundColor: '#E8FFF8' }]}>
                  <Ionicons name="chatbubbles-outline" size={24} color={COLORS.teal} />
                </View>
                <Text style={styles.actionText}>Group Chat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Total Sections</Text>
                <Text style={styles.infoValue}>{stats?.total_sections || 0}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Active Teachers</Text>
                <Text style={styles.infoValue}>{stats?.total_teachers || 0}</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {teacherData?.class_teacher_section && (
              <View style={styles.classTeacherCard}>
                <View style={styles.ctHeader}>
                  <Ionicons name="star" size={20} color={COLORS.yellow} />
                  <Text style={styles.ctTitle}>Class Teacher</Text>
                </View>
                <Text style={styles.ctSection}>
                  Class {teacherData.class_teacher_section.class_name} - Section {teacherData.class_teacher_section.name}
                </Text>
                <View style={styles.ctActions}>
                  <TouchableOpacity
                    testID="ct-view-section"
                    style={styles.ctBtn}
                    onPress={() => router.push(`/section-detail?id=${teacherData.class_teacher_section.id}`)}
                  >
                    <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.ctBtnText}>View Section</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID="ct-attendance"
                    style={styles.ctBtn}
                    onPress={() => router.push(`/attendance?sectionId=${teacherData.class_teacher_section.id}`)}
                  >
                    <Ionicons name="checkbox-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.ctBtnText}>Attendance</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Assigned Subjects</Text>
            {teacherData?.subjects?.length > 0 ? (
              teacherData.subjects.map((s: any) => (
                <TouchableOpacity key={s.id} testID={`subject-${s.id}`} style={styles.subjectCard}>
                  <View style={styles.subjectLeft}>
                    <View style={[styles.subjectDot, { backgroundColor: COLORS.primary }]} />
                    <View>
                      <Text style={styles.subjectName}>{s.name}</Text>
                      <Text style={styles.subjectClass}>Class {s.class_name}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Ionicons name="book-outline" size={40} color={COLORS.textSec} />
                <Text style={styles.emptyText}>No subjects assigned yet</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 40 },
  headerSection: { marginBottom: 24 },
  greeting: { fontSize: 16, color: COLORS.textSec },
  userName: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4, letterSpacing: -0.5 },
  roleBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  roleText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    width: '47%', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 8 },
  statLabel: { fontSize: 14, color: COLORS.textSec, marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16, letterSpacing: -0.3 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  infoLabel: { fontSize: 15, color: COLORS.textSec },
  infoValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  classTeacherCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.yellow, borderLeftWidth: 4,
  },
  ctHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ctTitle: { fontSize: 14, fontWeight: '700', color: COLORS.yellow, textTransform: 'uppercase' },
  ctSection: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  ctActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  ctBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  ctBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  subjectCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  subjectClass: { fontSize: 13, color: COLORS.textSec },
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  emptyText: { fontSize: 15, color: COLORS.textSec, marginTop: 12 },
});
