import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', yellow: '#FF9F1C',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF',
};

const isWeb = Platform.OS === 'web';

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isDesktop = isWeb && width > 768;

  useFocusEffect(useCallback(() => { loadData(); }, [user?.id, user?.role]));

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await apiCall('/api/dashboard/stats');
      setStats(statsData);
      if (user?.role === 'teacher') {
        const tData = await apiCall('/api/teachers/my-data');
        setTeacherData(tData);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <View style={s.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}>
        <View style={[s.content, isDesktop && s.contentDesktop]}>
          {/* Header */}
          <View style={[s.headerRow, isDesktop && s.headerRowDesktop]}>
            <View>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={[s.userName, isDesktop && { fontSize: 34 }]}>{user?.name || 'User'}</Text>
            </View>
            <View style={s.roleBadge}>
              <Text style={s.roleText}>{user?.role === 'principal' ? 'Principal' : 'Teacher'}</Text>
            </View>
          </View>

          {user?.role === 'principal' ? (
            <>
              {/* Stats Grid - 4 cards in a row on desktop */}
              <View style={[s.statsGrid, isDesktop && s.statsGridDesktop]}>
                <TouchableOpacity testID="stat-students" style={[s.statCard, isDesktop && s.statCardDesktop, { backgroundColor: '#E8FFF8' }]}>
                  <View style={s.statIconRow}>
                    <View style={[s.statIconCircle, { backgroundColor: '#C2F5EC' }]}>
                      <Ionicons name="people" size={22} color={COLORS.teal} />
                    </View>
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 36 }]}>{stats?.total_students || 0}</Text>
                  <Text style={s.statLabel}>Total Students</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="stat-teachers" style={[s.statCard, isDesktop && s.statCardDesktop, { backgroundColor: '#FFF8E8' }]}>
                  <View style={s.statIconRow}>
                    <View style={[s.statIconCircle, { backgroundColor: '#FFE8B8' }]}>
                      <Ionicons name="person" size={22} color={COLORS.yellow} />
                    </View>
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 36 }]}>{stats?.total_teachers || 0}</Text>
                  <Text style={s.statLabel}>Active Teachers</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="stat-classes" style={[s.statCard, isDesktop && s.statCardDesktop, { backgroundColor: COLORS.primaryLight }]}>
                  <View style={s.statIconRow}>
                    <View style={[s.statIconCircle, { backgroundColor: '#C5D4FF' }]}>
                      <Ionicons name="book" size={22} color={COLORS.primary} />
                    </View>
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 36 }]}>{stats?.total_classes || 0}</Text>
                  <Text style={s.statLabel}>Total Classes</Text>
                </TouchableOpacity>

                <TouchableOpacity testID="stat-pending" style={[s.statCard, isDesktop && s.statCardDesktop, { backgroundColor: '#FFF0F5' }]}
                  onPress={() => router.push('/manage-teachers')}>
                  <View style={s.statIconRow}>
                    <View style={[s.statIconCircle, { backgroundColor: '#FFD0E0' }]}>
                      <Ionicons name="time" size={22} color={COLORS.secondary} />
                    </View>
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 36 }]}>{stats?.pending_approvals || 0}</Text>
                  <Text style={s.statLabel}>Pending Approvals</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Actions + Info side by side on desktop */}
              <View style={isDesktop ? s.desktopRow : undefined}>
                <View style={isDesktop ? s.desktopCol60 : undefined}>
                  <Text style={s.sectionTitle}>Quick Actions</Text>
                  <View style={[s.actionRow, isDesktop && s.actionRowDesktop]}>
                    <TouchableOpacity testID="action-teachers" style={[s.actionCard, isDesktop && s.actionCardDesktop]} onPress={() => router.push('/manage-teachers')}>
                      <View style={[s.actionIcon, { backgroundColor: '#FFF0F5' }]}>
                        <Ionicons name="people-outline" size={26} color={COLORS.secondary} />
                      </View>
                      <View style={isDesktop ? { marginLeft: 14, flex: 1 } : undefined}>
                        <Text style={s.actionText}>Manage Teachers</Text>
                        {isDesktop && <Text style={s.actionSubtext}>Approve, create & manage</Text>}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity testID="action-classes" style={[s.actionCard, isDesktop && s.actionCardDesktop]} onPress={() => router.push('/(tabs)/classes')}>
                      <View style={[s.actionIcon, { backgroundColor: COLORS.primaryLight }]}>
                        <Ionicons name="book-outline" size={26} color={COLORS.primary} />
                      </View>
                      <View style={isDesktop ? { marginLeft: 14, flex: 1 } : undefined}>
                        <Text style={s.actionText}>View Classes</Text>
                        {isDesktop && <Text style={s.actionSubtext}>Browse all classes & sections</Text>}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity testID="action-chat" style={[s.actionCard, isDesktop && s.actionCardDesktop]} onPress={() => router.push('/(tabs)/chat')}>
                      <View style={[s.actionIcon, { backgroundColor: '#E8FFF8' }]}>
                        <Ionicons name="chatbubbles-outline" size={26} color={COLORS.teal} />
                      </View>
                      <View style={isDesktop ? { marginLeft: 14, flex: 1 } : undefined}>
                        <Text style={s.actionText}>Group Chat</Text>
                        {isDesktop && <Text style={s.actionSubtext}>Message your team</Text>}
                      </View>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    testID="action-analytics"
                    style={[s.analyticsBanner, isDesktop && s.analyticsBannerDesktop]}
                    onPress={() => router.push('/analytics')}
                    activeOpacity={0.85}
                  >
                    <View style={[s.analyticsIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="bar-chart" size={28} color={COLORS.primary} />
                    </View>
                    <View style={s.analyticsTextWrap}>
                      <Text style={s.analyticsTitle}>Analytics</Text>
                      <Text style={s.analyticsSub}>
                        Attendance, marks, trends, and class performance
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={COLORS.textSec} />
                  </TouchableOpacity>
                </View>

                <View style={isDesktop ? s.desktopCol40 : undefined}>
                  <Text style={s.sectionTitle}>School Overview</Text>
                  <View style={s.infoCard}>
                    <View style={s.infoRow}>
                      <View style={s.infoLeft}>
                        <Ionicons name="layers-outline" size={18} color={COLORS.primary} />
                        <Text style={s.infoLabel}>Total Sections</Text>
                      </View>
                      <Text style={s.infoValue}>{stats?.total_sections || 0}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.infoRow}>
                      <View style={s.infoLeft}>
                        <Ionicons name="people-outline" size={18} color={COLORS.teal} />
                        <Text style={s.infoLabel}>Active Teachers</Text>
                      </View>
                      <Text style={s.infoValue}>{stats?.total_teachers || 0}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.infoRow}>
                      <View style={s.infoLeft}>
                        <Ionicons name="school-outline" size={18} color={COLORS.yellow} />
                        <Text style={s.infoLabel}>Total Students</Text>
                      </View>
                      <Text style={s.infoValue}>{stats?.total_students || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          ) : (
            <>
              {teacherData?.class_teacher_section && (
                <View style={s.classTeacherCard}>
                  <View style={s.ctHeader}>
                    <Ionicons name="star" size={20} color={COLORS.yellow} />
                    <Text style={s.ctTitle}>Class Teacher</Text>
                  </View>
                  <Text style={s.ctSection}>
                    Class {teacherData.class_teacher_section.class_name} - Section {teacherData.class_teacher_section.name}
                  </Text>
                  <View style={s.ctActions}>
                    <TouchableOpacity testID="ct-view-section" style={s.ctBtn}
                      onPress={() => router.push(`/section-detail?id=${teacherData.class_teacher_section.id}`)}>
                      <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                      <Text style={s.ctBtnText}>View Section</Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="ct-attendance" style={s.ctBtn}
                      onPress={() => router.push(`/attendance?sectionId=${teacherData.class_teacher_section.id}`)}>
                      <Ionicons name="checkbox-outline" size={16} color={COLORS.primary} />
                      <Text style={s.ctBtnText}>Attendance</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    testID="ct-analytics-banner"
                    style={[s.analyticsBanner, isDesktop && s.analyticsBannerDesktop, { marginTop: 14 }]}
                    onPress={() => router.push('/analytics')}
                    activeOpacity={0.85}
                  >
                    <View style={[s.analyticsIconWrap, { backgroundColor: COLORS.primaryLight }]}>
                      <Ionicons name="bar-chart" size={24} color={COLORS.primary} />
                    </View>
                    <View style={s.analyticsTextWrap}>
                      <Text style={s.analyticsTitle}>Class analytics</Text>
                      <Text style={s.analyticsSub}>
                        Attendance and marks for your section
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color={COLORS.textSec} />
                  </TouchableOpacity>
                </View>
              )}

              <Text style={s.sectionTitle}>Assigned Subjects</Text>
              <View style={isDesktop ? s.subjectsGrid : undefined}>
                {teacherData?.subjects?.length > 0 ? (
                  teacherData.subjects.map((sub: any) => (
                    <TouchableOpacity key={sub.id} testID={`subject-${sub.id}`} style={[s.subjectCard, isDesktop && s.subjectCardDesktop]}>
                      <View style={s.subjectLeft}>
                        <View style={[s.subjectDot, { backgroundColor: COLORS.primary }]} />
                        <View>
                          <Text style={s.subjectName}>{sub.name}</Text>
                          <Text style={s.subjectClass}>Class {sub.class_name}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={s.emptyCard}>
                    <Ionicons name="book-outline" size={40} color={COLORS.textSec} />
                    <Text style={s.emptyText}>No subjects assigned yet</Text>
                  </View>
                )}
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  scroll: { padding: 24, paddingBottom: 40 },
  scrollDesktop: { paddingHorizontal: 48, paddingTop: 32 },
  content: {},
  contentDesktop: { maxWidth: 1100, alignSelf: 'center', width: '100%' },
  headerRow: { marginBottom: 24 },
  headerRowDesktop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 16, color: COLORS.textSec },
  userName: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginTop: 4, letterSpacing: -0.5 },
  roleBadge: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
  roleText: { color: COLORS.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statsGridDesktop: { gap: 16, marginBottom: 32 },
  statCard: { width: '47%', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  statCardDesktop: { width: '23%', padding: 24, borderRadius: 20 },
  statIconRow: { marginBottom: 12 },
  statIconCircle: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statNumber: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 14, color: COLORS.textSec, marginTop: 2 },
  // Desktop layout helpers
  desktopRow: { flexDirection: 'row', gap: 24 },
  desktopCol60: { flex: 6 },
  desktopCol40: { flex: 4 },
  // Section title
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16, letterSpacing: -0.3 },
  // Actions
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionRowDesktop: { flexDirection: 'column', gap: 10, marginBottom: 0 },
  actionCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  actionCardDesktop: {
    flexDirection: 'row', alignItems: 'center', padding: 18,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  actionSubtext: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  analyticsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  analyticsBannerDesktop: {
    padding: 20,
    marginTop: 20,
  },
  analyticsIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsTextWrap: { flex: 1 },
  analyticsTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  analyticsSub: { fontSize: 13, color: COLORS.textSec, marginTop: 4, lineHeight: 18 },
  // Info card
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 15, color: COLORS.textSec },
  infoValue: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  divider: { height: 1, backgroundColor: COLORS.border },
  // Teacher section
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
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subjectCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  subjectCardDesktop: { width: '48%' },
  subjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  subjectClass: { fontSize: 13, color: COLORS.textSec },
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 40, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, width: '100%',
  },
  emptyText: { fontSize: 15, color: COLORS.textSec, marginTop: 12 },
});
