import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { apiCall } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';

const isWeb = Platform.OS === 'web';

// Avatar component with gradient background
const Avatar = ({ name, size = 60, colors }: any) => {
  const initials = name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || '??';
  
  return (
    <LinearGradient
      colors={colors || COLORS.gradient1}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
      }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: size / 2.5 }}>{initials}</Text>
    </LinearGradient>
  );
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<any>(null);
  const [staffData, setStaffData] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isDesktop = isWeb && width > 768;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id, user?.role])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const statsData = await apiCall('/api/dashboard/stats');
      setStats(statsData);

      if (user?.role === 'principal') {
        const staff = await apiCall('/api/dashboard/staff');
        setStaffData(staff);
      } else if (user?.role === 'teacher') {
        const tData = await apiCall('/api/teachers/my-data');
        setTeacherData(tData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  if (loading)
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}>
        <View style={[s.content, isDesktop && s.contentDesktop]}>
          {/* Header with Welcome */}
          <View style={[s.headerRow, isDesktop && s.headerRowDesktop]}>
            <View>
              <Text style={s.greeting}>Welcome back,</Text>
              <Text style={[s.userName, isDesktop && { fontSize: 34 }]}>{user?.name || 'User'}</Text>
            </View>
            <LinearGradient
              colors={user?.role === 'principal' ? COLORS.gradient2 : COLORS.gradient3}
              style={s.roleBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons
                name={user?.role === 'principal' ? 'star' : 'person'}
                size={14}
                color={COLORS.white}
                style={{ marginRight: 6 }}
              />
              <Text style={s.roleText}>{user?.role === 'principal' ? 'Principal' : 'Teacher'}</Text>
            </LinearGradient>
          </View>

          {user?.role === 'principal' ? (
            <>
              {/* Principal Hero Card */}
              {staffData?.principal && (
                <LinearGradient
                  colors={COLORS.gradient2}
                  style={s.principalHeroCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={s.principalContent}>
                    <Avatar name={staffData.principal.name} size={80} colors={[COLORS.white, COLORS.primaryLight]} />
                    <View style={s.principalInfo}>
                      <Text style={s.principalName}>{staffData.principal.name}</Text>
                      <Text style={s.principalRole}>School Principal</Text>
                      <View style={s.principalActions}>
                        <TouchableOpacity
                          style={s.principalBtn}
                          onPress={() => handleEmail(staffData.principal.email)}
                        >
                          <Ionicons name="mail" size={16} color={COLORS.primary} />
                          <Text style={s.principalBtnText}>Email</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  <View style={s.principalPattern}>
                    <Ionicons name="school" size={120} color="rgba(255,255,255,0.1)" />
                  </View>
                </LinearGradient>
              )}

              {/* Stats Grid */}
              <View style={[s.statsGrid, isDesktop && s.statsGridDesktop]}>
                <LinearGradient
                  colors={[COLORS.accent1Light, COLORS.accent1]}
                  style={[s.statCard, isDesktop && s.statCardDesktop]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[s.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                    <Ionicons name="people" size={26} color={COLORS.white} />
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 38 }]}>{stats?.total_students || 0}</Text>
                  <Text style={s.statLabel}>Total Students</Text>
                </LinearGradient>

                <LinearGradient
                  colors={[COLORS.accent3Light, COLORS.accent3]}
                  style={[s.statCard, isDesktop && s.statCardDesktop]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[s.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                    <Ionicons name="person" size={26} color={COLORS.white} />
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 38 }]}>{stats?.total_teachers || 0}</Text>
                  <Text style={s.statLabel}>Active Teachers</Text>
                </LinearGradient>

                <LinearGradient
                  colors={[COLORS.primaryLight, COLORS.primary]}
                  style={[s.statCard, isDesktop && s.statCardDesktop]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={[s.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                    <Ionicons name="book" size={26} color={COLORS.white} />
                  </View>
                  <Text style={[s.statNumber, isDesktop && { fontSize: 38 }]}>{stats?.total_classes || 0}</Text>
                  <Text style={s.statLabel}>Total Classes</Text>
                </LinearGradient>

                <TouchableOpacity
                  testID="stat-pending"
                  onPress={() => router.push('/manage-teachers')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.accent2Light, COLORS.accent2]}
                    style={[s.statCard, isDesktop && s.statCardDesktop]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={[s.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.4)' }]}>
                      <Ionicons name="time" size={26} color={COLORS.white} />
                    </View>
                    <Text style={[s.statNumber, isDesktop && { fontSize: 38 }]}>{stats?.pending_approvals || 0}</Text>
                    <Text style={s.statLabel}>Pending Approvals</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Staff Directory Section */}
              <View style={s.sectionHeader}>
                <Ionicons name="people" size={24} color={COLORS.primary} />
                <Text style={s.sectionTitle}>Our Teaching Staff</Text>
              </View>

              <View style={[s.staffGrid, isDesktop && s.staffGridDesktop]}>
                {staffData?.teachers?.map((teacher: any, idx: number) => {
                  const gradients = [
                    COLORS.gradient1,
                    COLORS.gradient2,
                    COLORS.gradient3,
                    COLORS.gradient4,
                  ];
                  const gradient = gradients[idx % gradients.length];

                  return (
                    <View key={teacher.id} style={[s.staffCard, isDesktop && s.staffCardDesktop]}>
                      <View style={s.staffHeader}>
                        <Avatar name={teacher.name} size={56} colors={gradient} />
                        <TouchableOpacity
                          style={s.staffContactBtn}
                          onPress={() => handleEmail(teacher.email)}
                        >
                          <Ionicons name="mail" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={s.staffName} numberOfLines={1}>
                        {teacher.name}
                      </Text>
                      <Text style={s.staffEmail} numberOfLines={1}>
                        {teacher.email}
                      </Text>

                      {teacher.class_teacher_section && (
                        <View style={s.classTeacherBadge}>
                          <Ionicons name="star" size={12} color={COLORS.accent3} />
                          <Text style={s.classTeacherText}>
                            Class {teacher.class_teacher_section.class_name}-{teacher.class_teacher_section.section}
                          </Text>
                        </View>
                      )}

                      {teacher.subjects?.length > 0 && (
                        <View style={s.subjectTags}>
                          {teacher.subjects.slice(0, 2).map((sub: any, i: number) => (
                            <View key={i} style={s.subjectTag}>
                              <Text style={s.subjectTagText} numberOfLines={1}>
                                {sub.name}
                              </Text>
                            </View>
                          ))}
                          {teacher.subjects.length > 2 && (
                            <View style={s.subjectTag}>
                              <Text style={s.subjectTagText}>+{teacher.subjects.length - 2}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Quick Actions */}
              <View style={s.sectionHeader}>
                <Ionicons name="flash" size={24} color={COLORS.primary} />
                <Text style={s.sectionTitle}>Quick Actions</Text>
              </View>

              <View style={[s.actionRow, isDesktop && s.actionRowDesktop]}>
                <TouchableOpacity
                  testID="action-teachers"
                  style={[s.actionCard, isDesktop && s.actionCardDesktop]}
                  onPress={() => router.push('/manage-teachers')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.accent2Light, COLORS.accent2]}
                    style={s.actionIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="people-outline" size={28} color={COLORS.white} />
                  </LinearGradient>
                  <View style={s.actionContent}>
                    <Text style={s.actionText}>Manage Teachers</Text>
                    <Text style={s.actionSubtext}>Approve & manage staff</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                </TouchableOpacity>

                <TouchableOpacity
                  testID="action-classes"
                  style={[s.actionCard, isDesktop && s.actionCardDesktop]}
                  onPress={() => router.push('/(tabs)/classes')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.primaryLight, COLORS.primary]}
                    style={s.actionIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="book-outline" size={28} color={COLORS.white} />
                  </LinearGradient>
                  <View style={s.actionContent}>
                    <Text style={s.actionText}>View Classes</Text>
                    <Text style={s.actionSubtext}>Browse all classes</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                </TouchableOpacity>

                <TouchableOpacity
                  testID="action-chat"
                  style={[s.actionCard, isDesktop && s.actionCardDesktop]}
                  onPress={() => router.push('/(tabs)/chat')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.accent1Light, COLORS.accent1]}
                    style={s.actionIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="chatbubbles-outline" size={28} color={COLORS.white} />
                  </LinearGradient>
                  <View style={s.actionContent}>
                    <Text style={s.actionText}>Group Chat</Text>
                    <Text style={s.actionSubtext}>Message your team</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                </TouchableOpacity>

                <TouchableOpacity
                  testID="action-analytics"
                  style={[s.actionCard, isDesktop && s.actionCardDesktop]}
                  onPress={() => router.push('/analytics')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[COLORS.accent4Light, COLORS.accent4]}
                    style={s.actionIcon}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="bar-chart" size={28} color={COLORS.white} />
                  </LinearGradient>
                  <View style={s.actionContent}>
                    <Text style={s.actionText}>Analytics</Text>
                    <Text style={s.actionSubtext}>View performance data</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Teacher View */}
              {teacherData?.class_teacher_section && (
                <LinearGradient
                  colors={COLORS.gradient4}
                  style={s.classTeacherCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={s.ctHeader}>
                    <Ionicons name="star" size={24} color={COLORS.white} />
                    <Text style={s.ctTitle}>Class Teacher</Text>
                  </View>
                  <Text style={s.ctSection}>
                    Class {teacherData.class_teacher_section.class_name} - Section{' '}
                    {teacherData.class_teacher_section.name}
                  </Text>
                  <View style={s.ctActions}>
                    <TouchableOpacity
                      testID="ct-view-section"
                      style={s.ctBtn}
                      onPress={() => router.push(`/section-detail?id=${teacherData.class_teacher_section.id}`)}
                    >
                      <Ionicons name="eye-outline" size={18} color={COLORS.white} />
                      <Text style={s.ctBtnText}>View Section</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID="ct-attendance"
                      style={s.ctBtn}
                      onPress={() => router.push(`/attendance?sectionId=${teacherData.class_teacher_section.id}`)}
                    >
                      <Ionicons name="checkbox-outline" size={18} color={COLORS.white} />
                      <Text style={s.ctBtnText}>Attendance</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              )}

              <View style={s.sectionHeader}>
                <Ionicons name="book" size={24} color={COLORS.primary} />
                <Text style={s.sectionTitle}>My Subjects</Text>
              </View>

              <View style={isDesktop ? s.subjectsGrid : undefined}>
                {teacherData?.subjects?.length > 0 ? (
                  teacherData.subjects.map((sub: any, idx: number) => {
                    const gradients = [COLORS.gradient1, COLORS.gradient2, COLORS.gradient3, COLORS.gradient4];
                    const gradient = gradients[idx % gradients.length];

                    return (
                      <TouchableOpacity
                        key={sub.id}
                        testID={`subject-${sub.id}`}
                        style={[s.subjectCard, isDesktop && s.subjectCardDesktop]}
                      >
                        <LinearGradient
                          colors={gradient}
                          style={s.subjectIconWrap}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="book" size={24} color={COLORS.white} />
                        </LinearGradient>
                        <View style={s.subjectContent}>
                          <Text style={s.subjectName}>{sub.name}</Text>
                          <Text style={s.subjectClass}>Class {sub.class_name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={s.emptyCard}>
                    <Ionicons name="book-outline" size={50} color={COLORS.textSec} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  scroll: { padding: 20, paddingBottom: 40 },
  scrollDesktop: { paddingHorizontal: 48, paddingTop: 32 },
  content: {},
  contentDesktop: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
  
  // Header
  headerRow: { marginBottom: 24 },
  headerRowDesktop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  greeting: { fontSize: 16, color: COLORS.textSec, fontWeight: '500' },
  userName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 4,
    letterSpacing: -0.8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  roleText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Avatar
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: { color: COLORS.white, fontWeight: '800' },

  // Principal Hero Card
  principalHeroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  principalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  principalInfo: { marginLeft: 20, flex: 1 },
  principalName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  principalRole: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '600',
  },
  principalActions: { flexDirection: 'row', marginTop: 16, gap: 10 },
  principalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  principalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  principalPattern: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.3,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  statsGridDesktop: { gap: 20 },
  statCard: {
    width: '47%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  statCardDesktop: { width: '23%', padding: 24 },
  statIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '600',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },

  // Staff Grid
  staffGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 32,
  },
  staffGridDesktop: { gap: 20 },
  staffCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  staffCardDesktop: { width: '31%' },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  staffContactBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  staffEmail: {
    fontSize: 13,
    color: COLORS.textSec,
    marginBottom: 12,
  },
  classTeacherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent3Light,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 10,
    gap: 4,
  },
  classTeacherText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accent3,
  },
  subjectTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectTag: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subjectTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Actions
  actionRow: {
    gap: 12,
    marginBottom: 32,
  },
  actionRowDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardDesktop: { width: '48%' },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: { flex: 1 },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  actionSubtext: {
    fontSize: 13,
    color: COLORS.textSec,
    marginTop: 2,
  },

  // Teacher view
  classTeacherCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  ctHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  ctTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ctSection: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 16,
  },
  ctActions: { flexDirection: 'row', gap: 12 },
  ctBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Subjects
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  subjectCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  subjectCardDesktop: { width: '48%' },
  subjectIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectContent: { flex: 1 },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  subjectClass: {
    fontSize: 13,
    color: COLORS.textSec,
    marginTop: 2,
  },

  // Empty state
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 50,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSec,
    marginTop: 16,
    fontWeight: '500',
  },
});
