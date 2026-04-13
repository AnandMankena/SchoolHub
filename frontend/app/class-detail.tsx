import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', yellow: '#FF9F1C',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF', error: '#E63946',
};

export default function ClassDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newExamName, setNewExamName] = useState('');
  const [newExamTotal, setNewExamTotal] = useState('100');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [showAssignTeacher, setShowAssignTeacher] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      setLoading(true);
      const [classRes, teachersRes] = await Promise.all([
        apiCall(`/api/classes/${id}`),
        apiCall('/api/teachers/approved')
      ]);
      setClassData(classRes.class);
      setTeachers(teachersRes.teachers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const addSection = async () => {
    if (!newSectionName.trim()) return;
    try {
      await apiCall('/api/sections', { method: 'POST', body: JSON.stringify({ class_id: id, name: newSectionName.trim().toUpperCase() }) });
      setNewSectionName('');
      setShowAddSection(false);
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const addExam = async () => {
    if (!newExamName.trim()) return;
    try {
      await apiCall('/api/exams', { method: 'POST', body: JSON.stringify({ name: newExamName.trim(), class_id: id, total_marks: parseInt(newExamTotal) || 100 }) });
      setNewExamName('');
      setNewExamTotal('100');
      setShowAddExam(false);
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const assignTeacher = async (subjectId: string, teacherId: string) => {
    try {
      await apiCall(`/api/subjects/${subjectId}`, { method: 'PUT', body: JSON.stringify({ teacher_id: teacherId }) });
      setShowAssignTeacher(null);
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const assignClassTeacher = async (sectionId: string, teacherId: string) => {
    try {
      await apiCall(`/api/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify({ class_teacher_id: teacherId }) });
      loadData();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Class {name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Sections */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sections</Text>
          {user?.role === 'principal' && (
            <TouchableOpacity testID="add-section-btn" style={styles.addBtn} onPress={() => setShowAddSection(true)}>
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        {classData?.sections?.map((section: any) => (
          <TouchableOpacity
            key={section.id}
            testID={`section-card-${section.id}`}
            style={styles.card}
            onPress={() => router.push(`/section-detail?id=${section.id}`)}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.sectionBadge, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={styles.sectionBadgeText}>{section.name}</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Section {section.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {section.class_teacher ? `CT: ${section.class_teacher.name}` : 'No class teacher'}
                  {' | '}{section.student_count} students
                </Text>
              </View>
            </View>
            {user?.role === 'principal' && (
              <TouchableOpacity
                testID={`assign-ct-${section.id}`}
                onPress={() => {
                  Alert.alert('Assign Class Teacher', 'Select a teacher', [
                    ...teachers.map(t => ({
                      text: t.name,
                      onPress: () => assignClassTeacher(section.id, t.id)
                    })),
                    { text: 'Cancel', style: 'cancel' }
                  ]);
                }}
              >
                <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {/* Subjects */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Subjects</Text>
        </View>
        {classData?.subjects?.map((subject: any) => (
          <View key={subject.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Ionicons name="book-outline" size={20} color={COLORS.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{subject.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {subject.teacher ? subject.teacher.name : 'No teacher assigned'}
                </Text>
              </View>
            </View>
            {user?.role === 'principal' && (
              <TouchableOpacity
                testID={`assign-teacher-${subject.id}`}
                onPress={() => setShowAssignTeacher(subject.id)}
              >
                <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Exams */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Exams</Text>
          {user?.role === 'principal' && (
            <TouchableOpacity testID="add-exam-btn" style={styles.addBtn} onPress={() => setShowAddExam(true)}>
              <Ionicons name="add" size={18} color={COLORS.primary} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>
        {classData?.exams?.length > 0 ? classData.exams.map((exam: any) => (
          <View key={exam.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.teal} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{exam.name}</Text>
                <Text style={styles.cardSubtitle}>Total: {exam.total_marks} marks</Text>
              </View>
            </View>
          </View>
        )) : (
          <Text style={styles.emptyText}>No exams created yet</Text>
        )}
      </ScrollView>

      {/* Add Section Modal */}
      <Modal visible={showAddSection} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Section</Text>
            <TextInput
              testID="section-name-input"
              style={styles.modalInput}
              placeholder="Section name (e.g., D)"
              value={newSectionName}
              onChangeText={setNewSectionName}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddSection(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-section-btn" style={styles.modalSave} onPress={addSection}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Exam Modal */}
      <Modal visible={showAddExam} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exam</Text>
            <TextInput
              testID="exam-name-input"
              style={styles.modalInput}
              placeholder="Exam name (e.g., Midterm)"
              value={newExamName}
              onChangeText={setNewExamName}
            />
            <TextInput
              testID="exam-total-input"
              style={styles.modalInput}
              placeholder="Total marks (default: 100)"
              value={newExamTotal}
              onChangeText={setNewExamTotal}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddExam(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-exam-btn" style={styles.modalSave} onPress={addExam}>
                <Text style={styles.modalSaveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal visible={!!showAssignTeacher} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Teacher</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {teachers.map(t => (
                <TouchableOpacity
                  key={t.id}
                  testID={`select-teacher-${t.id}`}
                  style={styles.teacherOption}
                  onPress={() => assignTeacher(showAssignTeacher!, t.id)}
                >
                  <Ionicons name="person-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.teacherOptionText}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAssignTeacher(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
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
  topTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  scroll: { padding: 24, paddingTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionBadgeText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  cardSubtitle: { fontSize: 13, color: COLORS.textSec, marginTop: 2 },
  emptyText: { fontSize: 14, color: COLORS.textSec, textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, color: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.bg },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSec },
  modalSave: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, backgroundColor: COLORS.primary },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  teacherOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  teacherOptionText: { fontSize: 15, color: COLORS.text },
});
