import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput, Modal, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  secondary: '#F72585', teal: '#2EC4B6', yellow: '#FF9F1C',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF', error: '#E63946', success: '#2EC4B6',
};

export default function ManageTeachersScreen() {
  const router = useRouter();
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [tab, setTab] = useState<'pending' | 'approved'>('pending');

  useFocusEffect(useCallback(() => { loadTeachers(); }, []));

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const [pendingRes, approvedRes] = await Promise.all([
        apiCall('/api/teachers/pending'),
        apiCall('/api/teachers/approved')
      ]);
      setPending(pendingRes.teachers);
      setApproved(approvedRes.teachers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const approveTeacher = async (id: string) => {
    try {
      await apiCall(`/api/teachers/${id}/approve`, { method: 'POST' });
      loadTeachers();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const rejectTeacher = async (id: string) => {
    Alert.alert('Reject Teacher', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        await apiCall(`/api/teachers/${id}/reject`, { method: 'POST' });
        loadTeachers();
      }},
    ]);
  };

  const createTeacher = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    try {
      await apiCall('/api/teachers/create', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim(), password: newPassword })
      });
      setNewName(''); setNewEmail(''); setNewPassword('');
      setShowCreate(false);
      loadTeachers();
      Alert.alert('Success', 'Teacher created successfully');
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Manage Teachers</Text>
        <TouchableOpacity testID="create-teacher-btn" onPress={() => setShowCreate(true)}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity testID="pending-tab" style={[styles.tab, tab === 'pending' && styles.tabActive]} onPress={() => setTab('pending')}>
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Pending ({pending.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="approved-tab" style={[styles.tab, tab === 'approved' && styles.tabActive]} onPress={() => setTab('approved')}>
          <Text style={[styles.tabText, tab === 'approved' && styles.tabTextActive]}>Approved ({approved.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === 'pending' ? (
          pending.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={40} color={COLORS.success} />
              <Text style={styles.emptyText}>No pending approvals</Text>
            </View>
          ) : (
            pending.map(teacher => (
              <View key={teacher.id} style={styles.teacherCard}>
                <View style={styles.teacherAvatar}>
                  <Text style={styles.teacherInitial}>{teacher.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{teacher.name}</Text>
                  <Text style={styles.teacherEmail}>{teacher.email}</Text>
                </View>
                <View style={styles.teacherActions}>
                  <TouchableOpacity testID={`approve-${teacher.id}`} style={styles.approveBtn} onPress={() => approveTeacher(teacher.id)}>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity testID={`reject-${teacher.id}`} style={styles.rejectBtn} onPress={() => rejectTeacher(teacher.id)}>
                    <Ionicons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          approved.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={40} color={COLORS.textSec} />
              <Text style={styles.emptyText}>No teachers yet</Text>
            </View>
          ) : (
            approved.map(teacher => (
              <View key={teacher.id} style={styles.teacherCard}>
                <View style={styles.teacherAvatar}>
                  <Text style={styles.teacherInitial}>{teacher.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{teacher.name}</Text>
                  <Text style={styles.teacherEmail}>{teacher.email}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Active</Text>
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Create Teacher Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Teacher</Text>
            <TextInput testID="new-teacher-name" style={styles.modalInput} placeholder="Full name" value={newName} onChangeText={setNewName} />
            <TextInput testID="new-teacher-email" style={styles.modalInput} placeholder="Email" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput testID="new-teacher-password" style={styles.modalInput} placeholder="Password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowCreate(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="save-teacher-btn" style={styles.modalSave} onPress={createTeacher}>
                <Text style={styles.modalSaveText}>Create</Text>
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
  tabRow: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSec },
  tabTextActive: { color: '#FFF' },
  scroll: { padding: 24, paddingTop: 16 },
  teacherCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  teacherAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  teacherInitial: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  teacherEmail: { fontSize: 13, color: COLORS.textSec },
  teacherActions: { flexDirection: 'row', gap: 8 },
  approveBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center' },
  statusBadge: { backgroundColor: '#E8FFF8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: COLORS.success },
  emptyCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { fontSize: 15, color: COLORS.textSec, marginTop: 12 },
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
