import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, Platform, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { apiCall } from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  bg: '#F7F9FC', surface: '#FFFFFF', primary: '#4361EE', primaryLight: '#E8EFFF',
  teal: '#2EC4B6', yellow: '#FF9F1C', text: '#1E2022', textSec: '#707A8A', border: '#EAECEF',
};

const CLASS_COLORS = ['#4361EE', '#F72585', '#2EC4B6', '#FF9F1C', '#7209B7', '#3A86FF', '#FF006E', '#8338EC', '#06D6A0', '#FB5607'];
const isWeb = Platform.OS === 'web';

export default function ClassesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = isWeb && width > 768;
  const numColumns = isDesktop ? 2 : 1;

  useFocusEffect(useCallback(() => { loadClasses(); }, []));

  const loadClasses = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/api/classes');
      setClasses(data.classes);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const renderClassCard = ({ item, index }: { item: any; index: number }) => {
    const color = CLASS_COLORS[index % CLASS_COLORS.length];
    return (
      <TouchableOpacity
        testID={`class-card-${item.id}`}
        style={[s.classCard, isDesktop && s.classCardDesktop]}
        onPress={() => router.push(`/class-detail?id=${item.id}&name=${item.name}`)}
      >
        <View style={[s.classNumber, { backgroundColor: color + '15' }]}>
          <Text style={[s.classNumberText, { color }]}>{item.name}</Text>
        </View>
        <View style={s.classInfo}>
          <Text style={s.className}>Class {item.name}</Text>
          <View style={s.classMetaRow}>
            <View style={s.classMeta}>
              <Ionicons name="layers-outline" size={14} color={COLORS.textSec} />
              <Text style={s.classMetaText}>{item.sections_count} Sections</Text>
            </View>
            <View style={s.classMeta}>
              <Ionicons name="people-outline" size={14} color={COLORS.textSec} />
              <Text style={s.classMetaText}>{item.student_count} Students</Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color={COLORS.textSec} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={[s.header, isDesktop && s.headerDesktop]}>
        <View>
          <Text style={[s.title, isDesktop && { fontSize: 34 }]}>Classes</Text>
          <Text style={s.subtitle}>{classes.length} classes available</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          testID="classes-list"
          data={classes}
          keyExtractor={item => item.id}
          renderItem={renderClassCard}
          key={numColumns}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? s.columnWrapper : undefined}
          contentContainerStyle={[s.list, isDesktop && s.listDesktop]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  headerDesktop: { paddingHorizontal: 48, paddingTop: 32, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSec, marginTop: 4 },
  list: { padding: 24, paddingTop: 12 },
  listDesktop: { paddingHorizontal: 48, maxWidth: 1100, alignSelf: 'center', width: '100%' },
  columnWrapper: { gap: 12 },
  classCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  classCardDesktop: { flex: 1, padding: 20 },
  classNumber: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  classNumberText: { fontSize: 22, fontWeight: '800' },
  classInfo: { flex: 1 },
  className: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  classMetaRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  classMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  classMetaText: { fontSize: 13, color: COLORS.textSec },
});
