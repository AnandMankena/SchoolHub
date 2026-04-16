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
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../utils/api';
import { ApiPaths } from '../lib/api/endpoints';
import { Ionicons } from '@expo/vector-icons';
import {
  StatMini,
  SegmentedBar,
  DonutCard,
  WeeklyBars,
  ClassBars,
  TeacherOneOnOneChart,
  SubjectGroupChart,
  FacultySection,
  type TeacherBarRow,
  type SubjectGroupRow,
  type FacultyMember,
} from '../components/AnalyticsCharts';
import { DonutSlice } from '../components/PieDonut';

const COLORS = {
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  primary: '#4361EE',
  primaryLight: '#E8EFFF',
  teal: '#2EC4B6',
  secondary: '#F72585',
  yellow: '#FF9F1C',
  text: '#1E2022',
  textSec: '#707A8A',
  border: '#EAECEF',
  muted: '#B8C0CC',
  error: '#E63946',
};

type AnalyticsPayload = {
  date: string;
  scoped_class_teacher?: boolean;
  scope_label?: string;
  total_students: number;
  attendance_today: {
    marked: number;
    present: number;
    absent: number;
    late: number;
    unmarked: number;
    rate_of_total: number;
    rate_of_marked: number;
  };
  marks: {
    graded_entries: number;
    average_percentage: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    fail_rate: number;
  };
  attendance_trend: { date: string; label: string; rate: number; present: number; counted: number }[];
  class_avg: { class_name: string; avg_percentage: number }[];
  subject_group_avg: SubjectGroupRow[];
  teacher_one_on_one: TeacherBarRow[];
  faculty: FacultyMember[];
};

const isWeb = Platform.OS === 'web';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isDesktop = isWeb && width > 900;
  const chartRow = isWeb && width > 640;
  /** Side-by-side teacher vs subject charts on wider web viewports */
  const dualTeacherCharts = isWeb && width > 640;

  useFocusEffect(
    useCallback(() => {
      if (authLoading) return;
      const role = user?.role;
      if (role !== 'principal' && role !== 'teacher') {
        setLoading(false);
        setData(null);
        setError('Analytics are available to the principal or to teachers assigned as class teacher of a section.');
        return;
      }
      (async () => {
        try {
          setLoading(true);
          setError('');
          const endpoint =
            role === 'principal' ? ApiPaths.analytics : ApiPaths.teachersMyClassAnalytics;
          const res = await apiCall(endpoint);
          setData(res);
        } catch (e: any) {
          setData(null);
          setError(e.message || 'Failed to load analytics');
        } finally {
          setLoading(false);
        }
      })();
    }, [user?.role, authLoading])
  );

  const openDmFromChart = useCallback(
    async (teacherId: string, teacherName: string) => {
      if (!user?.id || teacherId === user.id) return;
      try {
        const res = await apiCall(ApiPaths.chatDm, {
          method: 'POST',
          body: JSON.stringify({ user_id: teacherId }),
        });
        const gid = res.group?.id;
        if (!gid) throw new Error('No conversation id returned');
        router.push(`/chat-room?id=${gid}&name=${encodeURIComponent(teacherName)}&dm=1`);
      } catch (e: any) {
        Alert.alert('Could not open chat', e?.message || 'Try again');
      }
    },
    [user?.id, router]
  );

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (user?.role !== 'principal' && user?.role !== 'teacher') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBarOuter}>
          <View style={styles.topBarInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Analytics</Text>
          </View>
        </View>
        <View style={styles.denied}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textSec} />
          <Text style={styles.deniedText}>{error || 'You do not have access to analytics.'}</Text>
          <TouchableOpacity style={styles.backCta} onPress={() => router.back()}>
            <Text style={styles.backCtaText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBarOuter}>
          <View style={styles.topBarInner}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Analytics</Text>
          </View>
        </View>
        <View style={styles.denied}>
          <Ionicons name="alert-circle-outline" size={44} color={COLORS.textSec} />
          <Text style={styles.deniedText}>{error || 'No data'}</Text>
          <TouchableOpacity style={styles.backCta} onPress={() => router.back()}>
            <Text style={styles.backCtaText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scoped = !!data.scoped_class_teacher;
  const a = data.attendance_today;
  const m = data.marks;
  const attSlices: DonutSlice[] = [
    { value: a.present, color: COLORS.teal, label: 'Present' },
    { value: a.absent, color: COLORS.error, label: 'Absent' },
    { value: a.late, color: COLORS.yellow, label: 'Late' },
    { value: a.unmarked, color: COLORS.muted, label: 'Not marked' },
  ];
  const markSlices: DonutSlice[] = [
    { value: m.pass_count, color: COLORS.teal, label: 'Pass' },
    { value: m.fail_count, color: COLORS.secondary, label: 'Fail' },
  ];
  const attSeg = [
    { pct: a.present, color: COLORS.teal, label: 'Present' },
    { pct: a.absent, color: COLORS.error, label: 'Absent' },
    { pct: a.late, color: COLORS.yellow, label: 'Late' },
    { pct: a.unmarked, color: COLORS.muted, label: 'Unmarked' },
  ];
  const markSeg = [
    { pct: m.pass_count, color: COLORS.teal, label: 'Pass' },
    { pct: m.fail_count, color: COLORS.secondary, label: 'Fail' },
  ];

  const innerMaxStyle = isWeb
    ? {
        maxWidth: Math.min(1280, Math.max(320, width - 48)),
        alignSelf: 'center' as const,
        width: '100%' as const,
      }
    : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBarOuter}>
        <View style={[styles.topBarInner, innerMaxStyle]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.topTitles}>
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Analytics</Text>
            <Text style={styles.sub}>
              {scoped && data.scope_label
                ? `Your class: ${data.scope_label} · ${data.date} (UTC)`
                : `Data for ${data.date} (UTC)`}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, innerMaxStyle]}>
          {scoped ? (
            <View style={styles.scopeBanner}>
              <Ionicons name="people" size={20} color={COLORS.primary} />
              <Text style={styles.scopeBannerText}>
                Showing attendance and marks for students in your section only.
              </Text>
            </View>
          ) : null}

          <View style={[styles.kpiRow, isDesktop && styles.kpiRowDesktop]}>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini label="Total students" value={data.total_students} accent={COLORS.primary} />
            </View>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini
                label="Present today"
                value={a.present}
                sub={scoped ? `${a.rate_of_total}% of your class` : `${a.rate_of_total}% of all students`}
                accent={COLORS.teal}
              />
            </View>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini label="Absent today" value={a.absent} accent={COLORS.error} />
            </View>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini label="Late today" value={a.late} accent={COLORS.yellow} />
            </View>
          </View>

          <View style={[styles.kpiRow, styles.kpiRowSecond, isDesktop && styles.kpiRowDesktop]}>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini
                label="Attendance (marked)"
                value={`${a.rate_of_marked}%`}
                sub={`${a.marked} students marked`}
                accent={COLORS.primary}
              />
            </View>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini
                label="Avg marks %"
                value={`${m.average_percentage}%`}
                sub={`${m.graded_entries} graded entries`}
                accent={COLORS.teal}
              />
            </View>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini label="Pass rate" value={`${m.pass_rate}%`} sub={`${m.pass_count} pass`} accent={COLORS.teal} />
            </View>
            <View style={[styles.kpiCell, isDesktop && styles.kpiCellDesktop]}>
              <StatMini label="Fail rate" value={`${m.fail_rate}%`} sub={`${m.fail_count} fail`} accent={COLORS.secondary} />
            </View>
          </View>

          <View style={[styles.chatCtaRow, !isWeb && styles.chatCtaRowMobile]}>
            <Text style={styles.chatCtaText}>
              {scoped
                ? '1:1 chat: use the chat icons in the teacher chart or faculty list. Group chat: Chat tab.'
                : '1:1 chat: use the chat icons in the teacher chart or faculty list. Group chat: Staff Room in the Chat tab.'}
            </Text>
            <TouchableOpacity
              style={[styles.chatCtaBtn, !isWeb && styles.chatCtaBtnMobile]}
              onPress={() => router.push('/(tabs)/chat')}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#FFF" />
              <Text style={styles.chatCtaBtnLabel}>Open Chat</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionHead, styles.sectionHeadFirst]}>
            {scoped ? '1:1 teacher marks & messages (your class)' : '1:1 teacher marks & messages'}
          </Text>
          <Text style={styles.sectionHint}>
            One row per teacher — tap the speech bubble to open a private conversation (same as Chat, 1:1).
          </Text>
          <View style={dualTeacherCharts ? styles.twoCol : styles.oneCol}>
            <View style={dualTeacherCharts ? styles.colHalf : undefined}>
              <TeacherOneOnOneChart
                rows={data.teacher_one_on_one || []}
                wide={isDesktop}
                currentUserId={user?.id}
                onMessageTeacher={openDmFromChart}
              />
            </View>
            <View style={dualTeacherCharts ? styles.colHalf : undefined}>
              <SubjectGroupChart rows={data.subject_group_avg || []} wide={isDesktop} />
            </View>
          </View>

          <Text style={styles.sectionHead}>
            {scoped ? 'Subject teachers (your class)' : 'Faculty'}
          </Text>
          <FacultySection
            members={data.faculty || []}
            wide={isDesktop}
            currentUserId={user?.id}
            onMessageTeacher={openDmFromChart}
          />

          <Text style={styles.sectionHead}>{"Today's attendance mix"}</Text>
          <View style={styles.mixCard}>
            <SegmentedBar segments={attSeg} />
          </View>

          <Text style={[styles.sectionHead, { marginTop: 20 }]}>Pass / fail mix (by graded entry)</Text>
          <View style={styles.mixCard}>
            <SegmentedBar segments={markSeg} />
          </View>

          <Text style={styles.sectionHead}>Charts</Text>
          <View style={chartRow ? styles.twoCol : styles.oneCol}>
            <View style={chartRow ? styles.colHalf : undefined}>
              <DonutCard
                title="Attendance today"
                slices={attSlices}
                centerLabel="Present vs roll"
                centerValue={`${a.rate_of_total}%`}
              />
            </View>
            <View style={chartRow ? styles.colHalf : undefined}>
              <DonutCard
                title="Marks outcomes"
                slices={markSlices}
                centerLabel="Average score"
                centerValue={`${m.average_percentage}%`}
              />
            </View>
          </View>

          <WeeklyBars data={data.attendance_trend} />
          <ClassBars rows={data.class_avg} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBarOuter: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#1E2022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
  },
  backBtn: { padding: 4, marginRight: 8 },
  topTitles: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  titleDesktop: { fontSize: 24 },
  sub: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  scroll: { padding: 20, paddingBottom: 48 },
  scrollDesktop: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 56 },
  inner: { width: '100%', maxWidth: '100%' },
  scopeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scopeBannerText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 18, fontWeight: '600' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiRowSecond: { marginTop: 10 },
  kpiRowDesktop: { gap: 14 },
  kpiCell: { flexGrow: 1, flexShrink: 1, flexBasis: '47%', minWidth: 140 },
  kpiCellDesktop: { flexBasis: 0, minWidth: 0, maxWidth: '100%' as const },
  sectionHead: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSec,
    marginBottom: 12,
    marginTop: 28,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHeadFirst: { marginTop: 4 },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSec,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: -6,
  },
  mixCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 4,
    shadowColor: '#1E2022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  twoCol: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  oneCol: { flexDirection: 'column' },
  colHalf: { flex: 1, minWidth: 0 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  deniedText: { fontSize: 16, color: COLORS.textSec, textAlign: 'center', marginTop: 16 },
  backCta: { marginTop: 20, backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backCtaText: { color: '#FFF', fontWeight: '700' },
  chatCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  chatCtaRowMobile: { flexDirection: 'column', alignItems: 'stretch' },
  chatCtaText: { flex: 1, fontSize: 14, color: COLORS.textSec, lineHeight: 20 },
  chatCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  chatCtaBtnMobile: { alignSelf: 'flex-start' },
  chatCtaBtnLabel: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
