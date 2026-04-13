import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', yellow: '#FF9F1C', secondary: '#F72585',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF', error: '#E63946', success: '#2EC4B6',
};

const GRADE_COLORS: Record<string, string> = {
  'A+': '#2EC4B6', 'A': '#06D6A0', 'B+': '#4361EE', 'B': '#3A86FF',
  'C+': '#FF9F1C', 'C': '#FB5607', 'D': '#F72585', 'F': '#E63946',
};

export default function StudentDetailScreen() {
  const { id, examId, sectionId } = useLocalSearchParams<{ id?: string; examId?: string; sectionId?: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [rankings, setRankings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      if (id) {
        const data = await apiCall(`/api/students/${id}`);
        setStudent(data.student);
      }
      if (examId && sectionId) {
        const data = await apiCall(`/api/marks/rankings?exam_id=${examId}&section_id=${sectionId}`);
        setRankings(data);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  // Rankings view
  if (rankings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Class Rankings</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.examBadge}>
            <Ionicons name="trophy" size={18} color={COLORS.yellow} />
            <Text style={styles.examBadgeText}>{rankings.exam?.name}</Text>
          </View>

          {rankings.rankings?.map((r: any, idx: number) => (
            <View key={r.student_id} style={[styles.rankCard, idx < 3 && styles.rankCardTop]}>
              <View style={[styles.rankBadge, idx === 0 && styles.rank1, idx === 1 && styles.rank2, idx === 2 && styles.rank3]}>
                <Text style={styles.rankText}>#{r.rank}</Text>
              </View>
              <View style={styles.rankInfo}>
                <Text style={styles.rankName}>{r.student_name}</Text>
                <Text style={styles.rankRoll}>Roll: {r.roll_number}</Text>
              </View>
              <View style={styles.rankMarks}>
                <Text style={styles.rankTotal}>{r.total_marks}/{r.total_possible}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: (GRADE_COLORS[r.grade] || COLORS.textSec) + '20' }]}>
                  <Text style={[styles.gradeText, { color: GRADE_COLORS[r.grade] || COLORS.textSec }]}>{r.grade}</Text>
                </View>
                <Text style={styles.rankPercent}>{r.percentage}%</Text>
              </View>
            </View>
          ))}
          {(!rankings.rankings || rankings.rankings.length === 0) && (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={40} color={COLORS.textSec} />
              <Text style={styles.emptyText}>No marks entered yet</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Student detail view
  if (student) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Student Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>{student.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.profileName}>{student.name}</Text>
            <Text style={styles.profileDetail}>Roll No: {student.roll_number}</Text>
            <Text style={styles.profileDetail}>Class {student.class_name} - Section {student.section_name}</Text>
          </View>

          <Text style={styles.sectionTitle}>Marks</Text>
          {student.marks?.length > 0 ? student.marks.map((m: any, i: number) => (
            <View key={i} style={styles.markCard}>
              <View>
                <Text style={styles.markSubject}>{m.subject_name}</Text>
                <Text style={styles.markExam}>{m.exam_name}</Text>
              </View>
              <Text style={styles.markScore}>{m.marks_obtained}/{m.total_marks}</Text>
            </View>
          )) : (
            <Text style={styles.noDataText}>No marks recorded</Text>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Attendance</Text>
          {student.attendance?.length > 0 ? student.attendance.slice(0, 10).map((a: any, i: number) => (
            <View key={i} style={styles.attCard}>
              <Text style={styles.attDate}>{a.date}</Text>
              <View style={[styles.attBadge, {
                backgroundColor: a.status === 'present' ? '#E8FFF8' : a.status === 'absent' ? '#FFF0F0' : '#FFF8E8'
              }]}>
                <Text style={[styles.attText, {
                  color: a.status === 'present' ? COLORS.success : a.status === 'absent' ? COLORS.error : COLORS.yellow
                }]}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</Text>
              </View>
            </View>
          )) : (
            <Text style={styles.noDataText}>No attendance records</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return <View style={styles.loadingContainer}><Text>No data</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 24, paddingTop: 8 },
  examBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF8E8', borderRadius: 10, padding: 12, marginBottom: 16 },
  examBadgeText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  rankCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  rankCardTop: { borderColor: COLORS.yellow, borderWidth: 1.5 },
  rankBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rank1: { backgroundColor: '#FFD700' },
  rank2: { backgroundColor: '#C0C0C0' },
  rank3: { backgroundColor: '#CD7F32' },
  rankText: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  rankRoll: { fontSize: 12, color: COLORS.textSec },
  rankMarks: { alignItems: 'flex-end' },
  rankTotal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  rankPercent: { fontSize: 12, color: COLORS.textSec },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginVertical: 2 },
  gradeText: { fontSize: 13, fontWeight: '800' },
  profileCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  profileAvatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileInitial: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  profileName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  profileDetail: { fontSize: 14, color: COLORS.textSec, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  markCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  markSubject: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  markExam: { fontSize: 12, color: COLORS.textSec },
  markScore: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  attCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  attDate: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  attBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  attText: { fontSize: 13, fontWeight: '600' },
  noDataText: { fontSize: 14, color: COLORS.textSec, textAlign: 'center', marginTop: 12 },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 14, color: COLORS.textSec, marginTop: 8 },
});
