import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', yellow: '#FF9F1C', text: '#1E2022', textSec: '#707A8A',
  border: '#EAECEF', error: '#E63946', success: '#2EC4B6',
};

export default function AttendanceScreen() {
  const { sectionId } = useLocalSearchParams<{ sectionId: string }>();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [sectionInfo, setSectionInfo] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const sectionData = await apiCall(`/api/sections/${sectionId}`);
      setSectionInfo(sectionData.section);
      setStudents(sectionData.section.students || []);
      // Load existing attendance
      try {
        const attData = await apiCall(`/api/attendance?section_id=${sectionId}&date=${date}`);
        const map: Record<string, string> = {};
        (attData.attendance || []).forEach((a: any) => { map[a.student_id] = a.status; });
        // Default to present
        sectionData.section.students?.forEach((s: any) => {
          if (!map[s.id]) map[s.id] = 'present';
        });
        setAttendanceMap(map);
      } catch {
        const map: Record<string, string> = {};
        sectionData.section.students?.forEach((s: any) => { map[s.id] = 'present'; });
        setAttendanceMap(map);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleStatus = (studentId: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : prev[studentId] === 'absent' ? 'late' : 'present'
    }));
  };

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

  const getStatusColor = (status: string) => {
    if (status === 'present') return COLORS.success;
    if (status === 'absent') return COLORS.error;
    return COLORS.yellow;
  };

  const getStatusIcon = (status: string): "checkmark-circle" | "close-circle" | "time" => {
    if (status === 'present') return 'checkmark-circle';
    if (status === 'absent') return 'close-circle';
    return 'time';
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
          <Text style={styles.dateText}>{date}</Text>
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

        <Text style={styles.hint}>Tap to toggle: Present / Absent / Late</Text>

        {students.map(student => {
          const status = attendanceMap[student.id] || 'present';
          return (
            <TouchableOpacity
              key={student.id}
              testID={`attendance-${student.id}`}
              style={styles.studentRow}
              onPress={() => toggleStatus(student.id)}
            >
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>Roll: {student.roll_number}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                <Ionicons name={getStatusIcon(status)} size={18} color={getStatusColor(status)} />
                <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </View>
            </TouchableOpacity>
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
  dateCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  dateText: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  sectionText: { fontSize: 14, color: COLORS.textSec, marginLeft: 'auto' },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: COLORS.textSec, fontWeight: '600' },
  hint: { fontSize: 13, color: COLORS.textSec, marginBottom: 12, fontStyle: 'italic' },
  studentRow: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border,
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  studentRoll: { fontSize: 12, color: COLORS.textSec },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
