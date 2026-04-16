import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', yellow: '#FF9F1C', text: '#1E2022', textSec: '#707A8A',
  border: '#EAECEF', error: '#E63946', success: '#2EC4B6',
};

export default function SectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classTeacherOnly, setClassTeacherOnly] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');

  useFocusEffect(useCallback(() => { loadSection(); }, [id, user?.id, user?.role]));

  const loadSection = async () => {
    try {
      setLoading(true);
      const sectionRes = await apiCall(`/api/sections/${id}`);
      setSection(sectionRes.section);
      if (user?.role === 'teacher') {
        const td = await apiCall('/api/teachers/my-data');
        setClassTeacherOnly(!!td.class_teacher_only);
      } else {
        setClassTeacherOnly(false);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const addStudent = async () => {
    if (!studentName.trim() || !studentRoll.trim()) return;
    try {
      await apiCall('/api/students', { method: 'POST', body: JSON.stringify({ name: studentName.trim(), roll_number: studentRoll.trim(), section_id: id }) });
      setStudentName(''); setStudentRoll(''); setShowAddStudent(false);
      loadSection();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const deleteStudent = (studentId: string, name: string) => {
    Alert.alert('Delete Student', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await apiCall(`/api/students/${studentId}`, { method: 'DELETE' });
        loadSection();
      }},
    ]);
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const isClassTeacherHere = section?.class_teacher_id === user?.id;
  const canManageStudents = user?.role === 'principal' || isClassTeacherHere;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Class {section?.class_name} - {section?.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Section Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class Teacher</Text>
            <Text style={styles.infoValue}>{section?.class_teacher?.name || 'Not assigned'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Students</Text>
            <Text style={styles.infoValue}>{section?.students?.length || 0}</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={[styles.actionRow, classTeacherOnly && styles.actionRowStack]}>
          {!classTeacherOnly && (
            <TouchableOpacity
              testID="enter-marks-btn"
              style={styles.actionCard}
              onPress={() => router.push(`/marks-entry?sectionId=${id}&classId=${section?.class_id}`)}
            >
              <Ionicons name="create-outline" size={22} color={COLORS.primary} />
              <Text style={styles.actionText}>Enter Marks</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            testID="attendance-btn"
            style={[styles.actionCard, classTeacherOnly && styles.actionCardFull]}
            onPress={() => router.push(`/attendance?sectionId=${id}`)}
          >
            <Ionicons name="checkbox-outline" size={22} color={COLORS.teal} />
            <Text style={styles.actionText}>Attendance</Text>
          </TouchableOpacity>
        </View>

        {/* Students */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Students ({section?.students?.length || 0})</Text>
          {canManageStudents && (
            <TouchableOpacity testID="add-student-btn" style={styles.addBtn} onPress={() => setShowAddStudent(true)}>
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {section?.students?.length > 0 ? section.students.map((student: any) => (
          <TouchableOpacity
            key={student.id}
            testID={`student-card-${student.id}`}
            style={styles.studentCard}
            onPress={() => router.push(`/student-detail?id=${student.id}`)}
          >
            <View style={styles.studentAvatar}>
              <Text style={styles.studentInitial}>{student.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentRoll}>Roll No: {student.roll_number}</Text>
            </View>
            {canManageStudents && (
              <TouchableOpacity
                testID={`delete-student-${student.id}`}
                onPress={() => deleteStudent(student.id, student.name)}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )) : (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={40} color={COLORS.textSec} />
            <Text style={styles.emptyText}>No students in this section</Text>
          </View>
        )}

        {/* Subjects */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Subjects</Text>
        </View>
        {section?.subjects?.map((s: any) => (
          <View key={s.id} style={styles.subjectCard}>
            <Ionicons name="book-outline" size={18} color={COLORS.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={styles.subjectTeacher}>{s.teacher?.name || 'No teacher'}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Student Modal */}
      <Modal visible={showAddStudent} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Student</Text>
            <TextInput testID="student-name-input" style={styles.modalInput} placeholder="Student name" value={studentName} onChangeText={setStudentName} />
            <TextInput testID="student-roll-input" style={styles.modalInput} placeholder="Roll number" value={studentRoll} onChangeText={setStudentRoll} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddStudent(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-student-btn" style={styles.modalSave} onPress={addStudent}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  infoCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: COLORS.textSec },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionRowStack: { flexDirection: 'column' },
  actionCardFull: { width: '100%' },
  actionCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  studentCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  studentAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  studentInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  studentRoll: { fontSize: 13, color: COLORS.textSec },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 14, color: COLORS.textSec, marginTop: 8 },
  subjectCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  subjectName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  subjectTeacher: { fontSize: 13, color: COLORS.textSec },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, color: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.bg },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSec },
  modalSave: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.primary },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
