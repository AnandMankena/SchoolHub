import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiCall } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', text: '#1E2022', textSec: '#707A8A', border: '#EAECEF',
};
const isWeb = Platform.OS === 'web';

export default function ChatScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = isWeb && width > 768;

  useFocusEffect(useCallback(() => { loadGroups(); }, []));

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/chat/groups');
      setGroups(data.groups);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const renderGroupCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      testID={`group-card-${item.id}`}
      style={[s.groupCard, isDesktop && s.groupCardDesktop]}
      onPress={() => router.push(`/chat-room?id=${item.id}&name=${encodeURIComponent(item.name)}`)}
    >
      <View style={s.groupAvatar}>
        <Ionicons name="people" size={24} color={COLORS.primary} />
      </View>
      <View style={s.groupInfo}>
        <Text style={s.groupName}>{item.name}</Text>
        <Text style={s.groupLastMsg} numberOfLines={1}>
          {item.last_message ? `${item.last_message.sender_name}: ${item.last_message.message}` : 'No messages yet'}
        </Text>
      </View>
      <View style={s.groupMeta}>
        <Text style={s.memberCount}>{item.member_count}</Text>
        <Ionicons name="people-outline" size={14} color={COLORS.textSec} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <View>
          <Text style={[s.title, isDesktop && { fontSize: 34 }]}>Chat Groups</Text>
          <Text style={s.subtitle}>{groups.length} groups</Text>
        </View>
        <TouchableOpacity testID="create-group-btn" style={s.createBtn} onPress={() => router.push('/create-group')}>
          <Ionicons name="add" size={22} color="#FFF" />
          {isDesktop && <Text style={s.createBtnText}>New Group</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : groups.length === 0 ? (
        <View style={s.emptyState}>
          <Ionicons name="chatbubbles-outline" size={60} color={COLORS.textSec} />
          <Text style={s.emptyTitle}>No Groups Yet</Text>
          <Text style={s.emptySubtitle}>Create a group to start chatting</Text>
          <TouchableOpacity testID="empty-create-group-btn" style={s.emptyBtn} onPress={() => router.push('/create-group')}>
            <Text style={s.emptyBtnText}>Create Group</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          testID="groups-list"
          data={groups}
          keyExtractor={item => item.id}
          renderItem={renderGroupCard}
          contentContainerStyle={[s.list, isDesktop && s.listDesktop]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerDesktop: { paddingHorizontal: 48, paddingTop: 32, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSec, marginTop: 2 },
  createBtn: {
    height: 44, borderRadius: 14, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16,
    flexDirection: 'row', gap: 6,
  },
  createBtnText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  list: { padding: 24, paddingTop: 12 },
  listDesktop: { paddingHorizontal: 48, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  groupCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  groupCardDesktop: { padding: 20 },
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
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  emptyBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
