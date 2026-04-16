import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieDonut, DonutSlice } from './PieDonut';

const COLORS = {
  primary: '#4361EE',
  primaryLight: '#E8EFFF',
  teal: '#2EC4B6',
  secondary: '#F72585',
  yellow: '#FF9F1C',
  text: '#1E2022',
  textSec: '#707A8A',
  border: '#EAECEF',
  surface: '#FFFFFF',
  muted: '#EAECEF',
  error: '#E63946',
};

type TrendPoint = { date: string; label: string; rate: number; present: number; counted: number };
type ClassRow = { class_name: string; avg_percentage: number };
export type TeacherBarRow = {
  teacher_id: string;
  teacher_name: string;
  avg_percentage: number;
  marks_count: number;
};
export type SubjectGroupRow = { subject_name: string; avg_percentage: number; mark_count: number };
export type FacultyMember = {
  id: string;
  name: string;
  email: string;
  subjects: { name: string; class_name: string }[];
  subject_count: number;
};

export function StatMini({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <View style={[cs.statMini, accent ? { borderLeftWidth: 4, borderLeftColor: accent } : undefined]}>
      <Text style={cs.statMiniLabel}>{label}</Text>
      <Text style={cs.statMiniValue}>{value}</Text>
      {sub ? <Text style={cs.statMiniSub}>{sub}</Text> : null}
    </View>
  );
}

export function SegmentedBar({
  segments,
}: {
  segments: { pct: number; color: string; label: string }[];
}) {
  const total = segments.reduce((a, s) => a + s.pct, 0) || 1;
  return (
    <View>
      <View style={cs.segTrack}>
        {segments.map((s, i) =>
          s.pct > 0 ? (
            <View
              key={i}
              style={{
                flex: s.pct,
                backgroundColor: s.color,
                minWidth: s.pct / total > 0.08 ? 4 : 0,
              }}
            />
          ) : null
        )}
      </View>
      <View style={cs.segLegend}>
        {segments.map((s, i) => (
          <View key={i} style={cs.segLegendItem}>
            <View style={[cs.segDot, { backgroundColor: s.color }]} />
            <Text style={cs.segLegendText}>
              {s.label} ({Math.round((s.pct / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function DonutCard({
  title,
  slices,
  centerLabel,
  centerValue,
}: {
  title: string;
  slices: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const pieSize = Platform.OS === 'web' ? 176 : 160;
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>{title}</Text>
      <View style={cs.donutBlock}>
        <PieDonut slices={slices} size={pieSize} />
        <Text style={cs.dCenterVal}>{centerValue}</Text>
        <Text style={cs.dCenterLbl}>{centerLabel}</Text>
      </View>
      <View style={cs.legendGrid}>
        {slices.map((s, i) => (
          <View key={i} style={cs.legendRow}>
            <View style={[cs.segDot, { backgroundColor: s.color }]} />
            <Text style={cs.legendTxt} numberOfLines={1}>
              {s.label || '—'} <Text style={cs.legendNum}>({s.value})</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function WeeklyBars({ data }: { data: TrendPoint[] }) {
  const max = Math.max(10, ...data.map((d) => d.rate));
  const barMaxH = 100;
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>Attendance rate (last 7 days)</Text>
      <View style={cs.barChart}>
        {data.map((d) => {
          const fillH = Math.max(4, (d.rate / max) * barMaxH);
          return (
            <View key={d.date} style={cs.barCol}>
              <View style={[cs.barStack, { height: barMaxH }]}>
                <View style={[cs.barFill, { height: fillH }]} />
              </View>
              <Text style={cs.barRate}>{d.rate}%</Text>
              <Text style={cs.barLbl} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function TeacherOneOnOneChart({
  rows,
  wide,
  currentUserId,
  onMessageTeacher,
}: {
  rows: TeacherBarRow[];
  wide?: boolean;
  currentUserId?: string | null;
  onMessageTeacher?: (teacherId: string, teacherName: string) => void;
}) {
  if (!rows.length) {
    return (
      <View style={cs.card}>
        <Text style={cs.cardTitle}>1:1 — marks by teacher</Text>
        <Text style={cs.empty}>
          Bars appear when there are marks for subjects that have a teacher assigned. You can still message
          colleagues from the Faculty list in this screen (chat icon).
        </Text>
      </View>
    );
  }
  const max = Math.max(50, ...rows.map((r) => r.avg_percentage));
  const showMsg = Boolean(onMessageTeacher && currentUserId);
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>1:1 — marks by teacher</Text>
      <Text style={cs.cardSub}>
        Average % for marks in subjects they teach. Tap the speech bubble to message them privately.
      </Text>
      {rows.map((r) => (
        <View key={r.teacher_id} style={cs.hRow}>
          <View style={[cs.hLabelCol, wide && cs.hLabelColWide]}>
            <Text style={cs.hLabel} numberOfLines={1}>
              {r.teacher_name}
            </Text>
            <Text style={cs.hMeta}>{r.marks_count} marks</Text>
          </View>
          <View style={cs.hBarArea}>
            <View style={cs.hBarTrack}>
              <View style={[cs.hBarFillTeal, { width: `${Math.min(100, (r.avg_percentage / max) * 100)}%` }]} />
            </View>
          </View>
          <Text style={cs.hPct}>{r.avg_percentage}%</Text>
          {showMsg && r.teacher_id !== currentUserId ? (
            <TouchableOpacity
              accessibilityLabel={`Message ${r.teacher_name}`}
              style={cs.msgIconBtn}
              onPress={() => onMessageTeacher!(r.teacher_id, r.teacher_name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          ) : showMsg ? (
            <View style={cs.msgIconSpacer} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function SubjectGroupChart({ rows, wide }: { rows: SubjectGroupRow[]; wide?: boolean }) {
  if (!rows.length) {
    return (
      <View style={cs.card}>
        <Text style={cs.cardTitle}>By subject (grouped)</Text>
        <Text style={cs.empty}>No marks to aggregate yet.</Text>
      </View>
    );
  }
  const max = Math.max(50, ...rows.map((r) => r.avg_percentage));
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>By subject (school-wide group)</Text>
      <Text style={cs.cardSub}>All classes combined per subject name</Text>
      {rows.map((r) => (
        <View key={r.subject_name} style={cs.hRow}>
          <View style={[cs.hLabelCol, wide && cs.hLabelColWide]}>
            <Text style={cs.hLabel} numberOfLines={2}>
              {r.subject_name}
            </Text>
            <Text style={cs.hMeta}>{r.mark_count} marks</Text>
          </View>
          <View style={cs.hBarArea}>
            <View style={cs.hBarTrack}>
              <View style={[cs.hBarFillPrimary, { width: `${Math.min(100, (r.avg_percentage / max) * 100)}%` }]} />
            </View>
          </View>
          <Text style={cs.hPct}>{r.avg_percentage}%</Text>
        </View>
      ))}
    </View>
  );
}

export function FacultySection({
  members,
  wide,
  currentUserId,
  onMessageTeacher,
}: {
  members: FacultyMember[];
  wide?: boolean;
  currentUserId?: string | null;
  onMessageTeacher?: (teacherId: string, teacherName: string) => void;
}) {
  if (!members.length) {
    return (
      <View style={cs.card}>
        <Text style={cs.cardTitle}>Faculty</Text>
        <Text style={cs.empty}>No approved teachers yet.</Text>
      </View>
    );
  }
  const showMsg = Boolean(onMessageTeacher && currentUserId);
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>Faculty & subject assignments</Text>
      <Text style={cs.cardSub}>
        Demo logins: @schoolhub.demo — password Teacher@123
        {showMsg ? ' · Message a colleague from here.' : ''}
      </Text>
      {members.slice(0, 16).map((t) => (
        <View key={t.id} style={[cs.facultyRow, wide && cs.facultyRowWide]}>
          <View style={[cs.facultyLeft, wide && { marginBottom: 0 }]}>
            <View style={cs.facultyAvatar}>
              <Text style={cs.facultyInitial}>{t.name.charAt(0)}</Text>
            </View>
            <View style={cs.facultyText}>
              <Text style={cs.facultyName} numberOfLines={1}>
                {t.name}
              </Text>
              <Text style={cs.facultyEmail} numberOfLines={1}>
                {t.email}
              </Text>
            </View>
            {showMsg && t.id !== currentUserId ? (
              <TouchableOpacity
                accessibilityLabel={`Message ${t.name}`}
                style={cs.facultyMsgBtn}
                onPress={() => onMessageTeacher!(t.id, t.name)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={COLORS.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={[cs.chipWrap, wide && cs.chipWrapWide]}>
            {(t.subjects.length ? t.subjects : [{ name: '—', class_name: '' }]).slice(0, 6).map((s, i) => (
              <View key={`${t.id}-${i}`} style={cs.chip}>
                <Text style={cs.chipText} numberOfLines={1}>
                  {s.name}
                  {s.class_name ? ` · Cl.${s.class_name}` : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function ClassBars({ rows }: { rows: ClassRow[] }) {
  if (!rows.length) {
    return (
      <View style={cs.card}>
        <Text style={cs.cardTitle}>Average marks by class</Text>
        <Text style={cs.empty}>No graded data yet</Text>
      </View>
    );
  }
  return (
    <View style={cs.card}>
      <Text style={cs.cardTitle}>Average marks by class</Text>
      {rows.map((r) => (
        <View key={r.class_name} style={cs.classRow}>
          <Text style={cs.className}>Class {r.class_name}</Text>
          <View style={cs.classTrack}>
            <View style={[cs.classFill, { width: `${Math.min(100, r.avg_percentage)}%` }]} />
          </View>
          <Text style={cs.classPct}>{r.avg_percentage}%</Text>
        </View>
      ))}
    </View>
  );
}

const cs = StyleSheet.create({
  statMini: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flex: 1,
    minWidth: 120,
    maxWidth: '100%',
    shadowColor: '#1E2022',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  statMiniLabel: { fontSize: 12, color: COLORS.textSec, fontWeight: '600' },
  statMiniValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginTop: 4 },
  statMiniSub: { fontSize: 11, color: COLORS.textSec, marginTop: 4 },
  segTrack: {
    height: 18,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: COLORS.muted,
  },
  segLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  segLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segDot: { width: 8, height: 8, borderRadius: 4 },
  segLegendText: { fontSize: 12, color: COLORS.textSec },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    alignSelf: 'stretch',
    maxWidth: '100%',
    shadowColor: '#1E2022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  cardSub: { fontSize: 12, color: COLORS.textSec, marginBottom: 14, lineHeight: 17 },
  hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  hLabelCol: { width: 120, flexShrink: 0 },
  hLabelColWide: { width: 200, maxWidth: 260 },
  hLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  hMeta: { fontSize: 11, color: COLORS.textSec, marginTop: 2 },
  hBarArea: { flex: 1, minWidth: 80 },
  hBarTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F0F2F5',
    overflow: 'hidden',
  },
  hBarFillTeal: { height: '100%', backgroundColor: COLORS.teal, borderRadius: 6 },
  hBarFillPrimary: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  hPct: { width: 40, textAlign: 'right', fontSize: 13, fontWeight: '700', color: COLORS.text },
  msgIconBtn: { width: 36, alignItems: 'center', justifyContent: 'center' },
  msgIconSpacer: { width: 36 },
  facultyRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  facultyRowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  facultyLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flex: 1, minWidth: 0 },
  facultyMsgBtn: { marginLeft: 4, padding: 4 },
  facultyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  facultyInitial: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  facultyText: { flex: 1, minWidth: 0 },
  facultyName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  facultyEmail: { fontSize: 12, color: COLORS.textSec, marginTop: 2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipWrapWide: { flex: 1, minWidth: 200, justifyContent: 'flex-end', marginBottom: 0 },
  chip: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    maxWidth: '100%',
  },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSec },
  donutBlock: { alignItems: 'center', marginBottom: 8 },
  dCenterVal: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  dCenterLbl: { fontSize: 12, color: COLORS.textSec, marginTop: 2, textAlign: 'center' },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 130 },
  legendTxt: { fontSize: 13, color: COLORS.text, flex: 1 },
  legendNum: { color: COLORS.textSec, fontWeight: '600' },
  barChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    gap: 6,
    paddingTop: 8,
  },
  barCol: { flex: 1, alignItems: 'center', maxWidth: 56 },
  barStack: {
    width: '100%',
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  barRate: { fontSize: 11, fontWeight: '700', color: COLORS.text, marginTop: 6 },
  barLbl: { fontSize: 10, color: COLORS.textSec, marginTop: 2, textAlign: 'center' },
  classRow: { marginBottom: 12 },
  className: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  classTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0F2F5',
    overflow: 'hidden',
  },
  classFill: { height: '100%', backgroundColor: COLORS.teal, borderRadius: 5 },
  classPct: { fontSize: 12, fontWeight: '700', color: COLORS.teal, marginTop: 4, alignSelf: 'flex-end' },
  empty: { fontSize: 14, color: COLORS.textSec },
});
