import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const todayStr = () => new Date().toISOString().split('T')[0];

type AttendanceStatus = 'present' | 'absent' | 'late';
const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late'];
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'P',
  absent: 'A',
  late: 'L',
};

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', yellow: '#FF9F1C', text: '#1E2022', textSec: '#707A8A',
  border: '#EAECEF', error: '#E63946', success: '#2EC4B6',
};

export default function AttendanceScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(todayStr);
  const [sectionInfo, setSectionInfo] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      setDate(todayStr());
    }, [])
  );

  const loadData = useCallback(async () => {
    if (!sectionId) return;
    try {
      setLoading(true);
      const sectionData = await apiCall(`/api/sections/${sectionId}`);
      setSectionInfo(sectionData.section);
      setStudents(sectionData.section.students || []);
      try {
        const attData = await apiCall(`/api/attendance?section_id=${sectionId}&date=${date}`);
        const map: Record<string, AttendanceStatus> = {};
        (attData.attendance || []).forEach((a: any) => {
          const st = a.status as string;
          if (st === 'present' || st === 'absent' || st === 'late') map[a.student_id] = st;
        });
        sectionData.section.students?.forEach((s: any) => {
          if (!map[s.id]) map[s.id] = 'present';
        });
        setAttendanceMap(map);
      } catch {
        const map: Record<string, AttendanceStatus> = {};
        sectionData.section.students?.forEach((s: any) => { map[s.id] = 'present'; });
        setAttendanceMap(map);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [sectionId, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const attendance = Object.entries(attendanceMap).map(([studentId, status]) => ({ student_id: studentId, status }));
      await apiCall('/api/attendance/mark', {
        method: 'POST',
        body: JSON.stringify({ section_id: sectionId, date, attendance })
      });
      Alert.alert('Success', 'Attendance marked successfully');
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [studentId]: status }));
  };

  const pillColors = (status: AttendanceStatus) => {
    if (status === 'present') return { border: COLORS.success, activeBg: '#E8FFF8', text: COLORS.success };
    if (status === 'absent') return { border: COLORS.error, activeBg: '#FFF0F0', text: COLORS.error };
    return { border: COLORS.yellow, activeBg: '#FFF8E8', text: COLORS.yellow };
  };

  const presentCount = Object.values(attendanceMap).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceMap).filter(s => s === 'absent').length;

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.dateCard}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Today</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>
          {sectionInfo && <Text style={styles.sectionText}>Class {sectionInfo.class_name} - {sectionInfo.name}</Text>}
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#E8FFF8' }]}>
            <Text style={[styles.summaryNum, { color: COLORS.success }]}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FFF0F0' }]}>
            <Text style={[styles.summaryNum, { color: COLORS.error }]}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#FFF8E8' }]}>
            <Text style={[styles.summaryNum, { color: COLORS.yellow }]}>{students.length - presentCount - absentCount}</Text>
            <Text style={styles.summaryLabel}>Late</Text>
          </View>
        </View>

        <Text style={styles.hint}>Tap P, A, or L for each student (today’s roll call).</Text>

        {students.map(student => {
          const status = attendanceMap[student.id] || 'present';
          return (
            <View key={student.id} style={styles.studentRow} testID={`attendance-row-${student.id}`}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
              </View>
              <View style={styles.statusBtns}>
                {STATUS_ORDER.map((st) => {
                  const c = pillColors(st);
                  const selected = status === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      testID={`attendance-${st}-${student.id}`}
                      accessibilityLabel={`${STATUS_LABEL[st]} for ${student.name}`}
                      style={[
                        styles.statusPill,
                        { borderColor: c.border },
                        selected && { backgroundColor: c.activeBg, borderWidth: 2 },
                        !selected && styles.statusPillMuted,
                      ]}
                      onPress={() => setStatus(student.id, st)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.statusPillText, { color: selected ? c.text : COLORS.textSec }]}>
                        {STATUS_LABEL[st]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        <TouchableOpacity testID="save-attendance-btn" style={styles.saveBtn} onPress={saveAttendance} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Attendance</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 24, paddingTop: 8 },
  dateCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  dateBlock: { flex: 1 },
  dateLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSec, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 2 },
  sectionText: { fontSize: 13, color: COLORS.textSec, maxWidth: '42%', textAlign: 'right' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: COLORS.textSec, fontWeight: '600' },
  hint: { fontSize: 13, color: COLORS.textSec, marginBottom: 12, fontStyle: 'italic' },
  studentRow: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  studentInfo: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  studentRoll: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  statusBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    minWidth: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusPillMuted: { backgroundColor: COLORS.bg, borderColor: COLORS.border },
  statusPillText: { fontSize: 17, fontWeight: '800' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
