import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiCall } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', text: '#1E2022', textSec: '#707A8A', border: '#EAECEF',
};

export default function ChatScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/chat/groups');
      setGroups(data.groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderGroupCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      testID={`group-card-${item.id}`}
      style={styles.groupCard}
      onPress={() => router.push(`/chat-room?id=${item.id}&name=${encodeURIComponent(item.name)}`)}
    >
      <View style={styles.groupAvatar}>
        <Ionicons name="people" size={24} color={COLORS.primary} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupLastMsg} numberOfLines={1}>
          {item.last_message ? `${item.last_message.sender_name}: ${item.last_message.message}` : 'No messages yet'}
        </Text>
      </View>
      <View style={styles.groupMeta}>
        <Text style={styles.memberCount}>{item.member_count}</Text>
        <Ionicons name="people-outline" size={14} color={COLORS.textSec} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chat Groups</Text>
        <TouchableOpacity
          testID="create-group-btn"
          style={styles.createBtn}
          onPress={() => router.push('/create-group')}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSec} />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySubtitle}>Create a group to start chatting</Text>
          <TouchableOpacity
            testID="empty-create-group-btn"
            style={styles.emptyBtn}
            onPress={() => router.push('/create-group')}
          >
            <Text style={styles.emptyBtnText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          testID="groups-list"
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  createBtn: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  list: { padding: 24, paddingTop: 12 },
  groupCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  groupAvatar: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  groupLastMsg: { fontSize: 13, color: COLORS.textSec, marginTop: 2 },
  groupMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount: { fontSize: 14, fontWeight: '600', color: COLORS.textSec },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 15, color: COLORS.textSec, marginTop: 4 },
  emptyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24,
    paddingVertical: 12, marginTop: 20,
  },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
