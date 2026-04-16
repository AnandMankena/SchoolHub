import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  FlatList,
  Platform,
  Switch,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC',
  surface: '#FFFFFF',
  primary: '#4361EE',
  primaryLight: '#E8EFFF',
  teal: '#2EC4B6',
  text: '#1E2022',
  textSec: '#707A8A',
  border: '#EAECEF',
};

type ClassItem = { id: string; name: string };
type SectionItem = { id: string; name: string; class_id: string };

export default function MembersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = params.mode === 'teachers' ? 'teachers' : 'students';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [classId, setClassId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTeachersOnly, setActiveTeachersOnly] = useState(true);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);
  const [picker, setPicker] = useState<'class' | 'section' | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role !== 'principal') {
        setMetaLoading(false);
        setLoading(false);
        return;
      }
      (async () => {
        try {
          setMetaLoading(true);
          const res = await apiCall('/api/classes');
          setClasses(res.classes || []);
        } catch (e) {
          console.error(e);
        } finally {
          setMetaLoading(false);
        }
      })();
    }, [user?.role])
  );

  useEffect(() => {
    if (user?.role !== 'principal' || !classId) {
      setSections([]);
      return;
    }
    (async () => {
      try {
        const res = await apiCall(`/api/classes/${classId}`);
        const secs = (res.class?.sections || []).map((s: any) => ({ id: s.id, name: s.name, class_id: classId }));
        setSections(secs);
      } catch (e) {
        console.error(e);
        setSections([]);
      }
    })();
  }, [classId, user?.role]);

  const loadList = useCallback(async () => {
    if (user?.role !== 'principal') return;
    try {
      setLoading(true);
      if (mode === 'students') {
        const q = new URLSearchParams();
        if (classId) q.set('class_id', classId);
        if (sectionId) q.set('section_id', sectionId);
        if (debouncedSearch) q.set('search', debouncedSearch);
        const res = await apiCall(`/api/students?${q.toString()}`);
        setList(res.students || []);
      } else {
        const q = new URLSearchParams();
        if (activeTeachersOnly) q.set('approved_only', 'true');
        if (classId) q.set('class_id', classId);
        if (debouncedSearch) q.set('search', debouncedSearch);
        const res = await apiCall(`/api/teachers?${q.toString()}`);
        setList(res.teachers || []);
      }
    } catch (e) {
      console.error(e);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [user?.role, mode, classId, sectionId, debouncedSearch, activeTeachersOnly]);

  useFocusEffect(
    useCallback(() => {
      loadList();
    }, [loadList])
  );

  const classLabel = useMemo(() => {
    if (!classId) return 'All classes';
    const c = classes.find((x) => x.id === classId);
    return c ? `Class ${c.name}` : 'Class';
  }, [classId, classes]);

  const sectionLabel = useMemo(() => {
    if (!classId) return 'Pick a class first';
    if (!sectionId) return 'All sections';
    const s = sections.find((x) => x.id === sectionId);
    return s ? `Section ${s.name}` : 'Section';
  }, [classId, sectionId, sections]);

  const clearFilters = () => {
    setClassId(null);
    setSectionId(null);
    setSearchInput('');
  };

  if (user?.role !== 'principal') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Directory</Text>
        </View>
        <View style={styles.denied}>
          <Text style={styles.deniedText}>Only the principal can open this directory.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="members-back" onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{mode === 'students' ? 'All students' : 'Teachers'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={COLORS.textSec} />
          <TextInput
            testID="members-search"
            style={styles.searchInput}
            placeholder={mode === 'students' ? 'Search name or roll number…' : 'Search name or email…'}
            placeholderTextColor={COLORS.textSec}
            value={searchInput}
            onChangeText={setSearchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchInput.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={COLORS.textSec} />
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.filterHeading}>Filters</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            testID="members-filter-class"
            style={[styles.filterChip, !classId && styles.filterChipActive]}
            onPress={() => setPicker('class')}
            disabled={metaLoading}
          >
            <Text style={[styles.filterChipText, !classId && styles.filterChipTextActive]} numberOfLines={1}>
              {classLabel}
            </Text>
            <Ionicons name="chevron-down" size={18} color={classId ? COLORS.text : '#FFF'} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="members-filter-section"
            style={[styles.filterChip, (!classId || !sectionId) && classId && styles.filterChipMuted]}
            onPress={() => classId && setPicker('section')}
            disabled={!classId || metaLoading}
          >
            <Text style={styles.filterChipText} numberOfLines={1}>
              {sectionLabel}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {mode === 'teachers' ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active (approved) only</Text>
            <Switch value={activeTeachersOnly} onValueChange={setActiveTeachersOnly} trackColor={{ true: COLORS.primaryLight, false: COLORS.border }} thumbColor={activeTeachersOnly ? COLORS.primary : '#f4f3f4'} />
          </View>
        ) : null}

        <TouchableOpacity testID="members-clear-filters" style={styles.clearBtn} onPress={clearFilters}>
          <Ionicons name="refresh" size={18} color={COLORS.primary} />
          <Text style={styles.clearBtnText}>Clear filters</Text>
        </TouchableOpacity>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {loading ? 'Loading…' : `${list.length} ${mode === 'students' ? 'students' : 'teachers'} shown`}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color={COLORS.primary} />
        ) : (
          list.map((item) =>
            mode === 'students' ? (
              <TouchableOpacity
                key={item.id}
                testID={`member-student-${item.id}`}
                style={styles.card}
                onPress={() => router.push(`/student-detail?id=${item.id}`)}
              >
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>
                    Roll {item.roll_number} · Class {item.class_name || '?'} · Sec {item.section_name || '?'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSec} />
              </TouchableOpacity>
            ) : (
              <View key={item.id} style={styles.card} testID={`member-teacher-${item.id}`}>
                <View style={styles.cardMain}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>{item.email}</Text>
                  <Text style={styles.cardMeta}>
                    {item.is_approved ? 'Approved' : 'Pending'}
                    {item.subjects_preview?.length
                      ? ` · ${item.subjects_preview.map((s: any) => `${s.name} (${s.class_name})`).join(', ')}`
                      : ''}
                  </Text>
                </View>
              </View>
            )
          )
        )}
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <View style={styles.modalWrap}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{picker === 'class' ? 'Choose class' : 'Choose section'}</Text>
            <FlatList
              data={picker === 'class' ? [{ id: '', name: 'All classes' }, ...classes] : [{ id: '', name: 'All sections' }, ...sections]}
              keyExtractor={(item) => item.id || 'all'}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    if (picker === 'class') {
                      setClassId(item.id || null);
                      setSectionId(null);
                    } else {
                      setSectionId(item.id || null);
                    }
                    setPicker(null);
                  }}
                >
                  <Text style={styles.modalRowText}>{item.id ? (picker === 'class' ? `Class ${item.name}` : `Section ${item.name}`) : item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  scroll: { padding: 16, paddingBottom: 40 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 16, color: COLORS.text, minWidth: 0 },
  filterHeading: { fontSize: 13, fontWeight: '700', color: COLORS.textSec, marginBottom: 8, textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    maxWidth: '48%',
    flexGrow: 1,
  },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipMuted: { opacity: 0.55 },
  filterChipText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  filterChipTextActive: { color: '#FFF' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 16 },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  countRow: { marginBottom: 10 },
  countText: { fontSize: 14, color: COLORS.textSec, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardMain: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 13, color: COLORS.textSec, marginTop: 4 },
  cardMeta: { fontSize: 12, color: COLORS.textSec, marginTop: 4 },
  denied: { flex: 1, justifyContent: 'center', padding: 24 },
  deniedText: { fontSize: 16, color: COLORS.textSec, textAlign: 'center' },
  modalWrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12, color: COLORS.text },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalRowText: { fontSize: 16, color: COLORS.text },
});
