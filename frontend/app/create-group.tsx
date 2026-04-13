import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  text: '#1E2022', textSec: '#707A8A', border: '#EAECEF', teal: '#2EC4B6',
};

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadTeachers(); }, []);

  const loadTeachers = async () => {
    try {
      const data = await apiCall('/api/teachers');
      // Include principal too - get all users
      const allUsers: any[] = data.teachers || [];
      setTeachers(allUsers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const createGroup = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const data = await apiCall('/api/chat/groups', {
        method: 'POST',
        body: JSON.stringify({ name: groupName.trim(), member_ids: selectedMembers })
      });
      router.back();
    } catch (e) { console.error(e); } finally { setCreating(false); }
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Create Group</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          testID="group-name-input"
          style={styles.input}
          placeholder="Enter group name"
          placeholderTextColor={COLORS.textSec}
          value={groupName}
          onChangeText={setGroupName}
        />

        <Text style={styles.label}>Add Members ({selectedMembers.length} selected)</Text>
        {teachers.map(teacher => {
          const isSelected = selectedMembers.includes(teacher.id);
          return (
            <TouchableOpacity
              key={teacher.id}
              testID={`member-${teacher.id}`}
              style={[styles.memberCard, isSelected && styles.memberCardSelected]}
              onPress={() => toggleMember(teacher.id)}
            >
              <View style={styles.memberAvatar}>
                <Text style={styles.memberInitial}>{teacher.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{teacher.name}</Text>
                <Text style={styles.memberEmail}>{teacher.email}</Text>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          testID="create-group-submit"
          style={[styles.createBtn, (!groupName.trim() || creating) && styles.createBtnDisabled]}
          onPress={createGroup}
          disabled={!groupName.trim() || creating}
        >
          {creating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.createBtnText}>Create Group</Text>}
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
  label: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, color: COLORS.text },
  memberCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  memberCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  memberAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberInitial: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  memberEmail: { fontSize: 12, color: COLORS.textSec },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
