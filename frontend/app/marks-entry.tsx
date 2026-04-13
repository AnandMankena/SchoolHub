import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', text: '#1E2022', textSec: '#707A8A', border: '#EAECEF', error: '#E63946', success: '#2EC4B6',
};

export default function MarksEntryScreen() {
  const { sectionId, classId } = useLocalSearchParams<{ sectionId: string; classId: string }>();
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [marksMap, setMarksMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingMarks, setExistingMarks] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const sectionData = await apiCall(`/api/sections/${sectionId}`);
      setStudents(sectionData.section.students || []);
      setSubjects(sectionData.section.subjects || []);
      setExams(sectionData.section.exams || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (selectedExam && selectedSubject) {
      loadExistingMarks();
    }
  }, [selectedExam, selectedSubject]);

  const loadExistingMarks = async () => {
    try {
      const data = await apiCall(`/api/marks?exam_id=${selectedExam}&section_id=${sectionId}&subject_id=${selectedSubject}`);
      const map: Record<string, string> = {};
      data.marks.forEach((m: any) => { map[m.student_id] = String(m.marks_obtained); });
      setMarksMap(map);
      setExistingMarks(data.marks);
    } catch (e) { console.error(e); }
  };

  const saveMarks = async () => {
    if (!selectedExam || !selectedSubject) {
      Alert.alert('Error', 'Please select exam and subject');
      return;
    }
    const marks = Object.entries(marksMap)
      .filter(([_, v]) => v.trim() !== '')
      .map(([studentId, val]) => ({ student_id: studentId, marks_obtained: parseFloat(val) }));
    if (marks.length === 0) {
      Alert.alert('Error', 'Please enter marks for at least one student');
      return;
    }
    setSaving(true);
    try {
      await apiCall('/api/marks/enter', {
        method: 'POST',
        body: JSON.stringify({ exam_id: selectedExam, subject_id: selectedSubject, section_id: sectionId, marks })
      });
      Alert.alert('Success', `Marks saved for ${marks.length} students`);
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const selectedExamObj = exams.find((e: any) => e.id === selectedExam);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Enter Marks</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Exam Selection */}
        <Text style={styles.label}>Select Exam</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {exams.map((exam: any) => (
            <TouchableOpacity
              key={exam.id}
              testID={`exam-chip-${exam.id}`}
              style={[styles.chip, selectedExam === exam.id && styles.chipActive]}
              onPress={() => setSelectedExam(exam.id)}
            >
              <Text style={[styles.chipText, selectedExam === exam.id && styles.chipTextActive]}>{exam.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {exams.length === 0 && <Text style={styles.noData}>No exams created. Ask principal to create exams.</Text>}

        {/* Subject Selection */}
        <Text style={styles.label}>Select Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {subjects.map((subject: any) => (
            <TouchableOpacity
              key={subject.id}
              testID={`subject-chip-${subject.id}`}
              style={[styles.chip, selectedSubject === subject.id && styles.chipActive]}
              onPress={() => setSelectedSubject(subject.id)}
            >
              <Text style={[styles.chipText, selectedSubject === subject.id && styles.chipTextActive]}>{subject.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Marks Entry */}
        {selectedExam && selectedSubject && (
          <>
            <View style={styles.marksHeader}>
              <Text style={styles.label}>Enter Marks (out of {selectedExamObj?.total_marks || 100})</Text>
            </View>
            {students.map((student: any) => (
              <View key={student.id} style={styles.markRow}>
                <View style={styles.markStudentInfo}>
                  <Text style={styles.markStudentName}>{student.name}</Text>
                  <Text style={styles.markRoll}>Roll: {student.roll_number}</Text>
                </View>
                <TextInput
                  testID={`marks-input-${student.id}`}
                  style={styles.markInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSec}
                  keyboardType="numeric"
                  value={marksMap[student.id] || ''}
                  onChangeText={(v) => setMarksMap(prev => ({ ...prev, [student.id]: v }))}
                />
              </View>
            ))}

            <TouchableOpacity testID="save-marks-btn" style={styles.saveBtn} onPress={saveMarks} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Marks</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              testID="view-rankings-btn"
              style={styles.rankingsBtn}
              onPress={() => router.push(`/student-detail?examId=${selectedExam}&sectionId=${sectionId}`)}
            >
              <Ionicons name="trophy-outline" size={18} color={COLORS.primary} />
              <Text style={styles.rankingsBtnText}>View Rankings</Text>
            </TouchableOpacity>
          </>
        )}
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
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { marginBottom: 8 },
  chip: { backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: COLORS.textSec },
  chipTextActive: { color: '#FFF' },
  noData: { fontSize: 14, color: COLORS.textSec, fontStyle: 'italic', marginBottom: 12 },
  marksHeader: { marginTop: 8 },
  markRow: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border,
  },
  markStudentInfo: { flex: 1 },
  markStudentName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  markRoll: { fontSize: 12, color: COLORS.textSec },
  markInput: {
    width: 80, backgroundColor: COLORS.bg, borderRadius: 10, padding: 10,
    textAlign: 'center', fontSize: 16, fontWeight: '600', borderWidth: 1, borderColor: COLORS.border, color: COLORS.text,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  rankingsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryLight, borderRadius: 14, paddingVertical: 14, marginTop: 12,
  },
  rankingsBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
});
