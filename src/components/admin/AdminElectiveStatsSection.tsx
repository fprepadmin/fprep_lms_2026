'use client';

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Target, Users, Award, BookOpen, ClipboardList, BarChart3,
  Search, Download, Filter, CheckCircle2, AlertTriangle,
  Sparkles, Layers, ChevronLeft, ChevronRight, X, TrendingUp
} from 'lucide-react';
import SubjectIcon from '@/components/student/SubjectIcon';
import { sortClassesNaturally, getSubjectColorTheme } from '@/lib/schoolUtils';

interface ElectiveSubjectItem {
  id: string;
  name: string;
  group_type?: string;
}

const FALLBACK_ELECTIVES: ElectiveSubjectItem[] = [
  { id: '__phys__', name: 'Vật lý', group_type: 'T' },
  { id: '__chem__', name: 'Hóa học', group_type: 'T' },
  { id: '__bio__', name: 'Sinh học', group_type: 'T' },
  { id: '__eng__', name: 'Tiếng Anh', group_type: 'ENG' },
  { id: '__hist__', name: 'Lịch sử', group_type: 'X' },
  { id: '__geo__', name: 'Địa lý', group_type: 'X' },
  { id: '__it__', name: 'Tin học', group_type: 'T' },
  { id: '__gdktpl__', name: 'GDKT & PL', group_type: 'X' },
];

function isMathSubject(name: string) {
  const n = (name || '').toLowerCase();
  return n.includes('toán');
}

function isLiteratureSubject(name: string) {
  const n = (name || '').toLowerCase();
  return n.includes('ngữ văn') || n === 'văn' || n.includes('văn học');
}

function normalizeSubjectName(name: string) {
  return (name || '').trim().toLowerCase().replace(/lí/g, 'lý');
}

function isMockExamRecord(examObj: any): boolean {
  if (!examObj) return false;
  const t = String(examObj.exam_type || '').toLowerCase();
  if (t === 'thptqg' || t === 'vsat' || t === 'dgnl') return true;
  const title = String(examObj.title || '').toLowerCase();
  return (
    title.includes('thi thử') ||
    title.includes('thpt') ||
    title.includes('tốt nghiệp') ||
    title.includes('quốc gia') ||
    title.includes('v-sat') ||
    title.includes('vsat') ||
    title.includes('đgnl') ||
    title.includes('tsa') ||
    title.includes('hsa') ||
    title.includes('mô phỏng')
  );
}

export type TierKey = 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'untested';

export interface AdminElectiveStatsProps {
  studentDetails: any[];
  classes: any[];
  subjects: any[];
  auditLogs: any[];
  exams: any[];
  examResults: any[];
  studyLogs: any[];
  studyProgress?: any[];
}

interface EnrichedElectiveStudent {
  studentId: string;
  fullName: string;
  mshs: string;
  classId: string;
  className: string;
  groupType: string;
  isExplicit: boolean;
  elective1: ElectiveSubjectItem;
  elective2: ElectiveSubjectItem;
  comboKey: string;
  comboLabel: string;
  studySessions: number;
  completedLessons: number;
  studyMinutes: number;
  elective1Attempts: number;
  elective1Avg: number | null;
  elective2Attempts: number;
  elective2Avg: number | null;
  electiveTotalAttempts: number;
  electiveMockAttempts: number;
  electiveAvgScore: number | null;
  overallAttempts: number;
  overallAvgScore: number | null;
  tierScore: number | null;
  tier: TierKey;
}

const TIER_META: Record<
  TierKey,
  {
    label: string;
    shortLabel: string;
    rangeLabel: string;
    badgeClass: string;
    cardBorder: string;
    cardBg: string;
    barColor: string;
    textColor: string;
  }
> = {
  tier1: {
    label: 'Nhóm 1 • Giỏi / Xuất sắc',
    shortLabel: 'Nhóm 1 (≥ 8.0)',
    rangeLabel: 'ĐTB ≥ 8.0 điểm',
    badgeClass:
      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    cardBorder: 'border-emerald-500/30 hover:border-emerald-500',
    cardBg: 'bg-emerald-50/70 dark:bg-emerald-950/25',
    barColor: 'bg-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  },
  tier2: {
    label: 'Nhóm 2 • Khá',
    shortLabel: 'Nhóm 2 (6.5 – 7.9)',
    rangeLabel: 'ĐTB 6.5 – 7.9 điểm',
    badgeClass:
      'bg-[#087CFF]/15 text-[#1746D1] dark:text-cyan-300 border-[#087CFF]/30',
    cardBorder: 'border-[#087CFF]/30 hover:border-[#087CFF]',
    cardBg: 'bg-blue-50/70 dark:bg-blue-950/25',
    barColor: 'bg-[#087CFF]',
    textColor: 'text-[#1746D1] dark:text-cyan-300',
  },
  tier3: {
    label: 'Nhóm 3 • Trung bình',
    shortLabel: 'Nhóm 3 (5.0 – 6.4)',
    rangeLabel: 'ĐTB 5.0 – 6.4 điểm',
    badgeClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    cardBorder: 'border-amber-500/30 hover:border-amber-500',
    cardBg: 'bg-amber-50/70 dark:bg-amber-950/25',
    barColor: 'bg-amber-500',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  tier4: {
    label: 'Nhóm 4 • Cần kèm sát',
    shortLabel: 'Nhóm 4 (< 5.0)',
    rangeLabel: 'ĐTB < 5.0 điểm',
    badgeClass:
      'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    cardBorder: 'border-rose-500/30 hover:border-rose-500',
    cardBg: 'bg-rose-50/70 dark:bg-rose-950/25',
    barColor: 'bg-rose-500',
    textColor: 'text-rose-700 dark:text-rose-300',
  },
  untested: {
    label: 'Chưa làm đề môn tự chọn',
    shortLabel: 'Chưa thi',
    rangeLabel: '0 lượt giải đề tự chọn',
    badgeClass:
      'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/30',
    cardBorder: 'border-slate-300 dark:border-slate-700 hover:border-slate-400',
    cardBg: 'bg-slate-50/80 dark:bg-slate-900/40',
    barColor: 'bg-slate-400',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
};

function computeTier(score: number | null): TierKey {
  if (score === null || Number.isNaN(score)) return 'untested';
  if (score >= 8.0) return 'tier1';
  if (score >= 6.5) return 'tier2';
  if (score >= 5.0) return 'tier3';
  return 'tier4';
}

export default function AdminElectiveStatsSection({
  studentDetails = [],
  classes = [],
  subjects = [],
  auditLogs = [],
  exams = [],
  examResults = [],
  studyLogs = [],
  studyProgress = [],
}: AdminElectiveStatsProps) {
  const [regMode, setRegMode] = useState<'all' | 'explicit' | 'default'>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedComboKey, setSelectedComboKey] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<'all' | TierKey>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  const sortedClasses = useMemo(() => sortClassesNaturally(classes), [classes]);

  // 1. Xây dựng danh mục các môn tự chọn (loại trừ Toán & Ngữ văn)
  const { electivePool, subjectById } = useMemo(() => {
    const dbElectives: ElectiveSubjectItem[] = subjects
      .filter((s: any) => !isMathSubject(s.name) && !isLiteratureSubject(s.name))
      .map((s: any) => ({
        id: String(s.id),
        name: String(s.name),
        group_type: s.group_type,
      }));

    const pool: ElectiveSubjectItem[] = [...dbElectives];
    FALLBACK_ELECTIVES.forEach((fb) => {
      const exists = pool.some(
        (s) => normalizeSubjectName(s.name) === normalizeSubjectName(fb.name)
      );
      if (!exists) {
        pool.push(fb);
      }
    });

    const map = new Map<string, ElectiveSubjectItem>();
    pool.forEach((s) => map.set(s.id, s));
    // Ánh xạ thêm các fallback ID sang môn thực trong DB nếu trùng tên
    FALLBACK_ELECTIVES.forEach((fb) => {
      if (!map.has(fb.id)) {
        const matchedDb = pool.find(
          (s) => normalizeSubjectName(s.name) === normalizeSubjectName(fb.name)
        );
        if (matchedDb) map.set(fb.id, matchedDb);
      }
    });

    return { electivePool: pool, subjectById: map };
  }, [subjects]);

  // 2. Tra cứu lựa chọn 2 môn tự chọn mới nhất của từng học sinh từ audit_logs & student_details
  const explicitChoicesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    // auditLogs được sắp xếp created_at DESC từ server -> bản ghi đầu tiên gặp của mỗi target_id là mới nhất
    for (const log of auditLogs) {
      if (
        log?.target_table === 'student_details' &&
        log?.action === 'UPDATE_STUDENT_PROFILE_SETTINGS' &&
        log?.target_id &&
        !map.has(log.target_id)
      ) {
        const rawIds = log.new_values?.elective_subject_ids;
        if (Array.isArray(rawIds)) {
          const resolvedIds: string[] = [];
          for (const rawId of rawIds) {
            if (typeof rawId !== 'string' || !rawId.trim()) continue;
            const mapped = subjectById.get(rawId.trim());
            if (mapped && !resolvedIds.includes(mapped.id)) {
              resolvedIds.push(mapped.id);
            }
          }
          if (resolvedIds.length >= 2) {
            map.set(log.target_id, resolvedIds.slice(0, 2));
          }
        }
      }
    }

    // Kiểm tra thêm cột graduation_subjects trên student_details nếu có
    for (const st of studentDetails) {
      const sid = st?.student_id;
      if (!sid || map.has(sid)) continue;
      if (Array.isArray(st.graduation_subjects) && st.graduation_subjects.length >= 2) {
        const resolvedIds: string[] = [];
        for (const rawId of st.graduation_subjects) {
          if (typeof rawId !== 'string' || !rawId.trim()) continue;
          const mapped = subjectById.get(rawId.trim());
          if (mapped && !resolvedIds.includes(mapped.id)) {
            resolvedIds.push(mapped.id);
          }
        }
        if (resolvedIds.length >= 2) {
          map.set(sid, resolvedIds.slice(0, 2));
        }
      }
    }

    return map;
  }, [auditLogs, studentDetails, subjectById]);

  // 3. Tiền xử lý dữ liệu Lớp, Đề thi, Kết quả làm bài và Nhật ký tự học để truy xuất O(1)
  const {
    enrichedStudents,
    hasAnyMockElectiveAttempt,
  } = useMemo(() => {
    const classMap = new Map<string, any>();
    classes.forEach((c: any) => classMap.set(c.id, c));

    const getDefaultPair = (grp: string): ElectiveSubjectItem[] => {
      const preferred =
        grp === 'X'
          ? ['tiếng anh', 'lịch sử', 'địa', 'gdkt']
          : ['vật l', 'hóa', 'tiếng anh', 'sinh', 'tin'];
      const picked: ElectiveSubjectItem[] = [];
      for (const kw of preferred) {
        if (picked.length >= 2) break;
        const found = electivePool.find(
          (s) =>
            normalizeSubjectName(s.name).includes(kw) &&
            !picked.some((p) => p.id === s.id)
        );
        if (found) picked.push(found);
      }
      for (const s of electivePool) {
        if (picked.length >= 2) break;
        if (!picked.some((p) => p.id === s.id)) picked.push(s);
      }
      if (picked.length === 0) {
        return FALLBACK_ELECTIVES.slice(0, 2);
      }
      if (picked.length === 1) {
        const extra =
          FALLBACK_ELECTIVES.find((f) => f.id !== picked[0].id) || picked[0];
        return [picked[0], extra];
      }
      return picked.slice(0, 2);
    };

    const examById = new Map<string, any>();
    exams.forEach((e: any) => examById.set(e.id, e));

    // Gom kết quả thi theo student_id
    const resultsByStudent = new Map<
      string,
      Array<{ subjectId: string | null; score: number; isMock: boolean }>
    >();
    let globalMockElectiveCount = 0;

    for (const r of examResults) {
      const sid = r?.student_id;
      if (!sid) continue;
      const ex = examById.get(r.exam_id);
      const subId = ex?.subject_id ? String(ex.subject_id) : null;
      const isMock = isMockExamRecord(ex);
      const numScore = Number(r.score ?? 0);

      if (isMock && subId && subjectById.has(subId)) {
        globalMockElectiveCount++;
      }

      let arr = resultsByStudent.get(sid);
      if (!arr) {
        arr = [];
        resultsByStudent.set(sid, arr);
      }
      arr.push({ subjectId: subId, score: numScore, isMock });
    }

    // Gom hoạt động tự học theo student_id
    const studyStatsByStudent = new Map<
      string,
      { sessions: number; seconds: number; completedLessons: number }
    >();
    for (const log of studyLogs) {
      const sid = log?.student_id;
      if (!sid) continue;
      let st = studyStatsByStudent.get(sid);
      if (!st) {
        st = { sessions: 0, seconds: 0, completedLessons: 0 };
        studyStatsByStudent.set(sid, st);
      }
      st.sessions += 1;
      st.seconds += Number(log.duration_seconds) || 0;
    }
    for (const prog of studyProgress) {
      const sid = prog?.student_id;
      if (!sid) continue;
      let st = studyStatsByStudent.get(sid);
      if (!st) {
        st = { sessions: 0, seconds: 0, completedLessons: 0 };
        studyStatsByStudent.set(sid, st);
      }
      if (prog.completed) {
        st.completedLessons += 1;
      }
    }

    const rows: EnrichedElectiveStudent[] = studentDetails.map((st: any) => {
      const sid = String(st.student_id || st.id || '');
      const cls = classMap.get(st.class_id);
      const className = cls?.name || 'Chưa xếp lớp';
      const groupType =
        cls?.group_type ||
        (className.toUpperCase().includes('X') ? 'X' : 'T');

      const explicitIds = explicitChoicesMap.get(sid);
      let isExplicit = false;
      let pair: ElectiveSubjectItem[];

      if (explicitIds && explicitIds.length >= 2) {
        const s1 = subjectById.get(explicitIds[0]);
        const s2 = subjectById.get(explicitIds[1]);
        if (s1 && s2 && s1.id !== s2.id) {
          pair = [s1, s2];
          isExplicit = true;
        } else {
          pair = getDefaultPair(groupType);
        }
      } else {
        pair = getDefaultPair(groupType);
      }

      // Sắp xếp tên môn ổn định cho khóa Tổ hợp 2 môn (ví dụ: Hóa học + Vật lý == Vật lý + Hóa học)
      const sortedForCombo = [...pair].sort((a, b) =>
        a.name.localeCompare(b.name, 'vi')
      );
      const comboKey = `${sortedForCombo[0].id}__${sortedForCombo[1].id}`;
      const comboLabel = `${sortedForCombo[0].name} + ${sortedForCombo[1].name}`;

      const stResults = resultsByStudent.get(sid) || [];
      const e1Results = stResults.filter((r) => r.subjectId === pair[0].id);
      const e2Results = stResults.filter((r) => r.subjectId === pair[1].id);
      const electiveResults = stResults.filter(
        (r) => r.subjectId === pair[0].id || r.subjectId === pair[1].id
      );
      const electiveMockResults = electiveResults.filter((r) => r.isMock);

      const calcAvg = (items: Array<{ score: number }>): number | null => {
        if (items.length === 0) return null;
        const sum = items.reduce((acc, x) => acc + x.score, 0);
        return Number((sum / items.length).toFixed(2));
      };

      const elective1Avg = calcAvg(e1Results);
      const elective2Avg = calcAvg(e2Results);
      const electiveAvgScore = calcAvg(electiveResults);
      const electiveMockAvg = calcAvg(electiveMockResults);
      const overallAvgScore = calcAvg(stResults);

      // Điểm dùng phân tầng 4 nhóm: ưu tiên ĐTB đề thi thử của 2 môn tự chọn; nếu chưa có đề thi thử thì dùng ĐTB luyện đề 2 môn tự chọn
      const tierScore =
        electiveMockAvg !== null ? electiveMockAvg : electiveAvgScore;
      const tier = computeTier(tierScore);

      const studyStat = studyStatsByStudent.get(sid);
      const sessions = Math.max(
        studyStat?.sessions || 0,
        studyStat?.completedLessons || 0
      );

      return {
        studentId: sid,
        fullName: st.full_name || 'Học sinh',
        mshs: st.mshs || 'N/A',
        classId: st.class_id || '',
        className,
        groupType,
        isExplicit,
        elective1: pair[0],
        elective2: pair[1],
        comboKey,
        comboLabel,
        studySessions: sessions,
        completedLessons: studyStat?.completedLessons || 0,
        studyMinutes: Math.round((studyStat?.seconds || 0) / 60),
        elective1Attempts: e1Results.length,
        elective1Avg,
        elective2Attempts: e2Results.length,
        elective2Avg,
        electiveTotalAttempts: electiveResults.length,
        electiveMockAttempts: electiveMockResults.length,
        electiveAvgScore,
        overallAttempts: stResults.length,
        overallAvgScore,
        tierScore,
        tier,
      };
    });

    // Sắp xếp mặc định theo Lớp tự nhiên -> Tên học sinh
    const classOrderMap = new Map<string, number>();
    sortedClasses.forEach((c: any, idx: number) => classOrderMap.set(c.id, idx));

    rows.sort((a, b) => {
      const oa = classOrderMap.get(a.classId) ?? 999;
      const ob = classOrderMap.get(b.classId) ?? 999;
      if (oa !== ob) return oa - ob;
      return a.fullName.localeCompare(b.fullName, 'vi');
    });

    return {
      enrichedStudents: rows,
      hasAnyMockElectiveAttempt: globalMockElectiveCount > 0,
    };
  }, [
    studentDetails,
    classes,
    sortedClasses,
    electivePool,
    subjectById,
    explicitChoicesMap,
    exams,
    examResults,
    studyLogs,
    studyProgress,
  ]);

  // Tập học sinh theo chế độ Đăng ký (Tất cả / Đã tự ĐK / Mặc định phân ban)
  const regFilteredStudents = useMemo(() => {
    if (regMode === 'explicit') {
      return enrichedStudents.filter((s) => s.isExplicit);
    }
    if (regMode === 'default') {
      return enrichedStudents.filter((s) => !s.isExplicit);
    }
    return enrichedStudents;
  }, [enrichedStudents, regMode]);

  // 4. Thống kê số lượng & tình hình theo TỪNG MÔN TỰ CHỌN
  const subjectBreakdown = useMemo(() => {
    return electivePool
      .map((sub) => {
        const chosenAll = enrichedStudents.filter(
          (s) => s.elective1.id === sub.id || s.elective2.id === sub.id
        );
        const explicitCount = chosenAll.filter((s) => s.isExplicit).length;
        const defaultCount = chosenAll.length - explicitCount;

        const chosenInMode = regFilteredStudents.filter(
          (s) => s.elective1.id === sub.id || s.elective2.id === sub.id
        );

        let totalAttempts = 0;
        const scores: number[] = [];
        const tiers: Record<TierKey, number> = {
          tier1: 0,
          tier2: 0,
          tier3: 0,
          tier4: 0,
          untested: 0,
        };

        for (const st of chosenInMode) {
          const isFirst = st.elective1.id === sub.id;
          const att = isFirst ? st.elective1Attempts : st.elective2Attempts;
          const avg = isFirst ? st.elective1Avg : st.elective2Avg;
          totalAttempts += att;
          if (avg !== null) {
            scores.push(avg);
          }
          const subTier = computeTier(avg);
          tiers[subTier] += 1;
        }

        const avgScore =
          scores.length > 0
            ? Number(
                (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
              )
            : null;

        const pctOfGrade =
          regFilteredStudents.length > 0
            ? Math.round((chosenInMode.length / regFilteredStudents.length) * 100)
            : 0;

        return {
          subject: sub,
          countInMode: chosenInMode.length,
          totalAllCount: chosenAll.length,
          explicitCount,
          defaultCount,
          pctOfGrade,
          totalAttempts,
          avgScore,
          tiers,
        };
      })
      .sort((a, b) => b.countInMode - a.countInMode || a.subject.name.localeCompare(b.subject.name, 'vi'));
  }, [electivePool, enrichedStudents, regFilteredStudents]);

  // 5. Thống kê theo CẶP TỔ HỢP 2 MÔN TỰ CHỌN
  const comboBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        comboKey: string;
        comboLabel: string;
        count: number;
        explicitCount: number;
        scores: number[];
        attempts: number;
      }
    >();

    for (const st of regFilteredStudents) {
      let item = map.get(st.comboKey);
      if (!item) {
        item = {
          comboKey: st.comboKey,
          comboLabel: st.comboLabel,
          count: 0,
          explicitCount: 0,
          scores: [],
          attempts: 0,
        };
        map.set(st.comboKey, item);
      }
      item.count += 1;
      if (st.isExplicit) item.explicitCount += 1;
      item.attempts += st.electiveTotalAttempts;
      if (st.tierScore !== null) item.scores.push(st.tierScore);
    }

    return Array.from(map.values())
      .map((c) => ({
        ...c,
        avgScore:
          c.scores.length > 0
            ? Number(
                (c.scores.reduce((a, b) => a + b, 0) / c.scores.length).toFixed(2)
              )
            : null,
        pct:
          regFilteredStudents.length > 0
            ? Math.round((c.count / regFilteredStudents.length) * 100)
            : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [regFilteredStudents]);

  // 6. Nhóm học sinh đang chọn (lọc theo Môn tự chọn, Tổ hợp 2 môn, Lớp, Từ khóa — TRƯỚC khi lọc theo Nhóm năng lực để hiển thị 4 thẻ phân tầng của nhóm)
  const activeCohortBeforeTier = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return regFilteredStudents.filter((st) => {
      if (
        selectedSubjectId !== 'all' &&
        st.elective1.id !== selectedSubjectId &&
        st.elective2.id !== selectedSubjectId
      ) {
        return false;
      }
      if (selectedComboKey !== 'all' && st.comboKey !== selectedComboKey) {
        return false;
      }
      if (selectedClassId !== 'all' && st.classId !== selectedClassId) {
        return false;
      }
      if (q) {
        const matched =
          st.fullName.toLowerCase().includes(q) ||
          st.mshs.toLowerCase().includes(q) ||
          st.className.toLowerCase().includes(q) ||
          st.comboLabel.toLowerCase().includes(q);
        if (!matched) return false;
      }
      return true;
    });
  }, [
    regFilteredStudents,
    selectedSubjectId,
    selectedComboKey,
    selectedClassId,
    searchQuery,
  ]);

  // Tính toán "Tình hình của nhóm đang chọn" (dựa trên activeCohortBeforeTier)
  const cohortSituation = useMemo(() => {
    const getSubjectSpecificTier = (st: EnrichedElectiveStudent): TierKey => {
      if (selectedSubjectId !== 'all') {
        const subAvg =
          st.elective1.id === selectedSubjectId
            ? st.elective1Avg
            : st.elective2Avg;
        return computeTier(subAvg);
      }
      return st.tier;
    };

    const getSubjectSpecificScore = (
      st: EnrichedElectiveStudent
    ): number | null => {
      if (selectedSubjectId !== 'all') {
        return st.elective1.id === selectedSubjectId
          ? st.elective1Avg
          : st.elective2Avg;
      }
      return st.tierScore;
    };

    const counts: Record<TierKey, number> = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      untested: 0,
    };

    let activeStudyStudents = 0;
    let totalStudySessions = 0;
    let totalStudyMinutes = 0;
    let totalElectiveAttempts = 0;
    let totalMockAttempts = 0;
    const validScores: number[] = [];

    for (const st of activeCohortBeforeTier) {
      const t = getSubjectSpecificTier(st);
      counts[t] += 1;

      const sc = getSubjectSpecificScore(st);
      if (sc !== null) validScores.push(sc);

      if (st.studySessions > 0) activeStudyStudents += 1;
      totalStudySessions += st.studySessions;
      totalStudyMinutes += st.studyMinutes;

      if (selectedSubjectId !== 'all') {
        totalElectiveAttempts +=
          st.elective1.id === selectedSubjectId
            ? st.elective1Attempts
            : st.elective2Attempts;
      } else {
        totalElectiveAttempts += st.electiveTotalAttempts;
      }
      totalMockAttempts += st.electiveMockAttempts;
    }

    const avgGroupScore =
      validScores.length > 0
        ? Number(
            (
              validScores.reduce((a, b) => a + b, 0) / validScores.length
            ).toFixed(2)
          )
        : null;

    const passCount = counts.tier1 + counts.tier2 + counts.tier3;
    const testedCount = validScores.length;
    const passRate =
      testedCount > 0 ? Math.round((passCount / testedCount) * 100) : 0;

    return {
      totalInCohort: activeCohortBeforeTier.length,
      counts,
      activeStudyStudents,
      totalStudySessions,
      totalStudyMinutes,
      totalElectiveAttempts,
      totalMockAttempts,
      avgGroupScore,
      testedCount,
      passRate,
      getSubjectSpecificTier,
      getSubjectSpecificScore,
    };
  }, [activeCohortBeforeTier, selectedSubjectId]);

  // Danh sách cuối cùng hiển thị trong bảng (sau khi áp dụng thêm bộ lọc Nhóm năng lực)
  const finalFilteredStudents = useMemo(() => {
    if (selectedTier === 'all') return activeCohortBeforeTier;
    return activeCohortBeforeTier.filter(
      (st) => cohortSituation.getSubjectSpecificTier(st) === selectedTier
    );
  }, [activeCohortBeforeTier, selectedTier, cohortSituation]);

  const totalPages = Math.max(
    1,
    Math.ceil(finalFilteredStudents.length / pageSize)
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return finalFilteredStudents.slice(start, start + pageSize);
  }, [finalFilteredStudents, safePage]);

  // Thống kê tổng quan toàn khối
  const totalStudentsCount = enrichedStudents.length;
  const totalExplicitCount = useMemo(
    () => enrichedStudents.filter((s) => s.isExplicit).length,
    [enrichedStudents]
  );
  const explicitPct =
    totalStudentsCount > 0
      ? Math.round((totalExplicitCount / totalStudentsCount) * 100)
      : 0;
  const topSubjectStat = subjectBreakdown[0] || null;
  const topComboStat = comboBreakdown[0] || null;

  // Nhãn mô tả nhóm đang xem
  const activeGroupTitle = useMemo(() => {
    const parts: string[] = [];
    if (selectedSubjectId !== 'all') {
      const s = subjectById.get(selectedSubjectId);
      if (s) parts.push(`Môn ${s.name}`);
    }
    if (selectedComboKey !== 'all') {
      const c = comboBreakdown.find((x) => x.comboKey === selectedComboKey);
      if (c) parts.push(`Tổ hợp ${c.comboLabel}`);
    }
    if (selectedClassId !== 'all') {
      const cls = classes.find((x: any) => x.id === selectedClassId);
      if (cls) parts.push(`Lớp ${cls.name}`);
    }
    if (regMode === 'explicit') parts.push('Đã tự đăng ký');
    if (regMode === 'default') parts.push('Mặc định phân ban');

    return parts.length > 0 ? parts.join(' • ') : 'Toàn bộ Học sinh Khối 12';
  }, [
    selectedSubjectId,
    selectedComboKey,
    selectedClassId,
    regMode,
    subjectById,
    comboBreakdown,
    classes,
  ]);

  const hasActiveFilter =
    regMode !== 'all' ||
    selectedSubjectId !== 'all' ||
    selectedComboKey !== 'all' ||
    selectedClassId !== 'all' ||
    selectedTier !== 'all' ||
    searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setRegMode('all');
    setSelectedSubjectId('all');
    setSelectedComboKey('all');
    setSelectedClassId('all');
    setSelectedTier('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Xuất báo cáo Excel đầy đủ danh sách học sinh & tình hình nhóm đang lọc
  const handleExportExcel = () => {
    if (finalFilteredStudents.length === 0) {
      alert('Không có học sinh nào trong danh sách lọc hiện tại để xuất Excel.');
      return;
    }

    const exportRows = finalFilteredStudents.map((st, idx) => {
      const tierKey = cohortSituation.getSubjectSpecificTier(st);
      return {
        STT: idx + 1,
        'Mã số HS (MSHS)': st.mshs,
        'Họ và tên': st.fullName,
        Lớp: st.className,
        'Ban học': `Ban ${st.groupType}`,
        'Trạng thái đăng ký': st.isExplicit
          ? 'Đã tự đăng ký'
          : 'Mặc định theo phân ban',
        'Môn tự chọn 1': st.elective1.name,
        'Số lần giải đề TC1': st.elective1Attempts,
        'Điểm TB TC1': st.elective1Avg !== null ? st.elective1Avg : 'Chưa thi',
        'Môn tự chọn 2': st.elective2.name,
        'Số lần giải đề TC2': st.elective2Attempts,
        'Điểm TB TC2': st.elective2Avg !== null ? st.elective2Avg : 'Chưa thi',
        'Tổ hợp 2 môn tự chọn': st.comboLabel,
        'Tổng lượt giải đề 2 môn TC': st.electiveTotalAttempts,
        'Lượt giải đề thi thử TC': st.electiveMockAttempts,
        'Điểm TB 2 môn tự chọn':
          st.electiveAvgScore !== null ? st.electiveAvgScore : 'Chưa thi',
        'Lượt tự học bài giảng': st.studySessions,
        'Thời lượng tự học (phút)': st.studyMinutes,
        'Tổng lượt làm đề (tất cả môn)': st.overallAttempts,
        'Điểm TB tất cả môn':
          st.overallAvgScore !== null ? st.overallAvgScore : 'Chưa thi',
        'Phân tầng năng lực': TIER_META[tierKey].label,
      };
    });

    const summaryRows = subjectBreakdown.map((item, idx) => ({
      STT: idx + 1,
      'Môn tự chọn': item.subject.name,
      'Tổng số HS chọn': item.countInMode,
      'Tỷ lệ toàn khối (%)': `${item.pctOfGrade}%`,
      'Đã tự đăng ký': item.explicitCount,
      'Mặc định phân ban': item.defaultCount,
      'Tổng lượt giải đề': item.totalAttempts,
      'Điểm TB môn': item.avgScore !== null ? item.avgScore : 'Chưa có',
      'Nhóm 1 (≥8.0)': item.tiers.tier1,
      'Nhóm 2 (6.5-7.9)': item.tiers.tier2,
      'Nhóm 3 (5.0-6.4)': item.tiers.tier3,
      'Nhóm 4 (<5.0)': item.tiers.tier4,
      'Chưa thi': item.tiers.untested,
    }));

    const wb = XLSX.utils.book_new();
    const wsStudents = XLSX.utils.json_to_sheet(exportRows);
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    XLSX.utils.book_append_sheet(wb, wsStudents, 'Danh_Sach_Hoc_Sinh');
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Thong_Ke_Mon_Tu_Chon');

    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `FPREP_ThongKe_2MonTuChon_THPT_${dateTag}.xlsx`);
  };

  return (
    <div className="bg-white dark:bg-[#0B1B55]/90 border border-[#E2E8F0] dark:border-[#1B317A] rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
      {/* =================================================================== */}
      {/* HEADER PHÂN HỆ THỐNG KÊ 2 MÔN TỰ CHỌN TỐT NGHIỆP THPT */}
      {/* =================================================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1B317A] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F26F21]/15 border border-[#F26F21]/30 px-3 py-0.5 text-[11px] font-extrabold text-[#D95B12] dark:text-[#FF9E64]">
            <Target className="h-3.5 w-3.5" /> Kỳ thi Tốt nghiệp THPT 2026 • Toán & Ngữ văn bắt buộc + 2 Môn tự chọn
          </div>
          <h3 className="font-extrabold font-heading text-base sm:text-xl text-[#14213D] dark:text-white tracking-tight m-0 flex items-center gap-2">
            Thống kê Học sinh Đăng ký 2 Môn Tự chọn & Tình hình Học tập – Luyện đề
          </h3>
          <p className="text-xs text-[#475569] dark:text-slate-300 m-0 font-medium">
            Theo dõi số lượng học sinh theo từng môn tự chọn, tổ hợp 2 môn, tiến độ tự học và phân tầng 4 nhóm năng lực để nhà trường chủ động xếp lớp ôn tập.
          </p>
        </div>

        {/* Bộ chuyển chế độ Nguồn đăng ký + Xuất Excel */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex rounded-xl bg-[#F1F5F9] dark:bg-[#091540] p-1 border border-[#CBD5E1] dark:border-[#1B317A]">
            <button
              type="button"
              onClick={() => {
                setRegMode('all');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                regMode === 'all'
                  ? 'bg-[#1746D1] text-white shadow-xs'
                  : 'text-[#334155] dark:text-slate-300 hover:text-[#1746D1]'
              }`}
            >
              Tất cả HS ({totalStudentsCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setRegMode('explicit');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                regMode === 'explicit'
                  ? 'bg-[#1746D1] text-white shadow-xs'
                  : 'text-[#334155] dark:text-slate-300 hover:text-[#1746D1]'
              }`}
            >
              Đã tự ĐK ({totalExplicitCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setRegMode('default');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                regMode === 'default'
                  ? 'bg-[#1746D1] text-white shadow-xs'
                  : 'text-[#334155] dark:text-slate-300 hover:text-[#1746D1]'
              }`}
            >
              Chưa tự ĐK ({totalStudentsCount - totalExplicitCount})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Xuất danh sách Excel ({finalFilteredStudents.length})</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4 THẺ CHỈ SỐ TỔNG QUAN ĐĂNG KÝ 2 MÔN TỰ CHỌN */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#091540]/80 border border-[#E2E8F0] dark:border-[#1B317A] p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
              Tiến độ HS tự chọn môn
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-heading text-[#14213D] dark:text-white">
                {totalExplicitCount}/{totalStudentsCount}
              </span>
              <span className="text-xs font-extrabold text-[#1746D1] dark:text-cyan-300">
                ({explicitPct}%)
              </span>
            </div>
            <span className="text-[11px] text-[#475569] dark:text-slate-400 font-medium block mt-0.5">
              Còn {totalStudentsCount - totalExplicitCount} HS đang tính theo phân ban lớp
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1746D1]/10 text-[#1746D1] dark:text-cyan-300 border border-[#1746D1]/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#091540]/80 border border-[#E2E8F0] dark:border-[#1B317A] p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
              Môn tự chọn đông nhất
            </span>
            <div className="text-lg font-black font-heading text-[#14213D] dark:text-white truncate mt-1">
              {topSubjectStat ? topSubjectStat.subject.name : '—'}
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold block mt-0.5">
              {topSubjectStat
                ? `${topSubjectStat.countInMode} học sinh (${topSubjectStat.pctOfGrade}%)`
                : 'Chưa có dữ liệu'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#091540]/80 border border-[#E2E8F0] dark:border-[#1B317A] p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
              Tổ hợp 2 môn phổ biến nhất
            </span>
            <div className="text-base sm:text-lg font-black font-heading text-[#14213D] dark:text-white truncate mt-1">
              {topComboStat ? topComboStat.comboLabel : '—'}
            </div>
            <span className="text-[11px] text-[#1746D1] dark:text-cyan-300 font-bold block mt-0.5">
              {topComboStat
                ? `${topComboStat.count} học sinh (${topComboStat.pct}% nhóm)`
                : 'Chưa có dữ liệu'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#087CFF]/10 text-[#087CFF] border border-[#087CFF]/20 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl bg-[#F8FAFC] dark:bg-[#091540]/80 border border-[#E2E8F0] dark:border-[#1B317A] p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] dark:text-slate-400 block">
              ĐTB & Tỷ lệ đạt (≥ 5.0)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-heading text-[#14213D] dark:text-white">
                {cohortSituation.avgGroupScore !== null
                  ? cohortSituation.avgGroupScore.toFixed(2)
                  : '—'}
              </span>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                {cohortSituation.testedCount > 0
                  ? `${cohortSituation.passRate}% đạt ≥ 5.0`
                  : 'Chưa có điểm'}
              </span>
            </div>
            <span className="text-[11px] text-[#475569] dark:text-slate-400 font-medium block mt-0.5">
              {cohortSituation.testedCount}/{cohortSituation.totalInCohort} HS trong nhóm đã làm đề
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BẢNG THẺ SỐ LƯỢNG HỌC SINH THEO TỪNG MÔN TỰ CHỌN (BẤM ĐỂ LỌC) */}
      {/* =================================================================== */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#1746D1] dark:text-cyan-300" />
            <h4 className="font-extrabold font-heading text-sm sm:text-base text-[#14213D] dark:text-white m-0">
              1. Số lượng & Chất lượng theo từng Môn tự chọn (Bấm vào môn để xem danh sách & tình hình nhóm)
            </h4>
          </div>
          {selectedSubjectId !== 'all' && (
            <button
              type="button"
              onClick={() => {
                setSelectedSubjectId('all');
                setCurrentPage(1);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1746D1] dark:text-cyan-300 hover:underline cursor-pointer"
            >
              <X className="h-3.5 w-3.5" /> Bỏ lọc môn tự chọn
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {subjectBreakdown.map((item) => {
            const isSelected = selectedSubjectId === item.subject.id;
            const theme = getSubjectColorTheme(item.subject.name);
            const totalForBar = Math.max(1, item.countInMode);

            return (
              <button
                key={item.subject.id}
                type="button"
                onClick={() => {
                  setSelectedSubjectId(isSelected ? 'all' : item.subject.id);
                  setSelectedComboKey('all');
                  setCurrentPage(1);
                }}
                className={`text-left rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? 'bg-[#1746D1]/8 dark:bg-[#1746D1]/25 border-[#1746D1] dark:border-[#00DFFF] ring-2 ring-[#1746D1]/25 shadow-sm'
                    : 'bg-white dark:bg-[#091540]/60 border-[#E2E8F0] dark:border-[#1B317A] hover:border-[#087CFF] hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
                    >
                      <SubjectIcon name={item.subject.name} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold font-heading text-sm text-[#14213D] dark:text-white truncate">
                        {item.subject.name}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400 font-semibold">
                        {item.explicitCount} đã ĐK • {item.defaultCount} phân ban
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 shrink-0">
                    {item.pctOfGrade}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#F1F5F9] dark:border-[#1B317A]/70">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-slate-400 block">
                      Số HS chọn
                    </span>
                    <span className="text-base font-black font-heading text-[#14213D] dark:text-white">
                      {item.countInMode}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-slate-400 block">
                      Giải đề
                    </span>
                    <span className="text-base font-black font-heading text-[#1746D1] dark:text-cyan-300">
                      {item.totalAttempts}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#64748B] dark:text-slate-400 block">
                      Điểm TB
                    </span>
                    <span
                      className={`text-base font-black font-heading ${
                        item.avgScore === null
                          ? 'text-slate-400'
                          : item.avgScore >= 6.5
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.avgScore >= 5.0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.avgScore !== null ? item.avgScore.toFixed(1) : '—'}
                    </span>
                  </div>
                </div>

                {/* Thanh mini phân tầng 4 nhóm của môn */}
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    {item.tiers.tier1 > 0 && (
                      <div
                        style={{ width: `${(item.tiers.tier1 / totalForBar) * 100}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Nhóm 1 (≥8.0): ${item.tiers.tier1} HS`}
                      />
                    )}
                    {item.tiers.tier2 > 0 && (
                      <div
                        style={{ width: `${(item.tiers.tier2 / totalForBar) * 100}%` }}
                        className="bg-[#087CFF] h-full"
                        title={`Nhóm 2 (6.5-7.9): ${item.tiers.tier2} HS`}
                      />
                    )}
                    {item.tiers.tier3 > 0 && (
                      <div
                        style={{ width: `${(item.tiers.tier3 / totalForBar) * 100}%` }}
                        className="bg-amber-500 h-full"
                        title={`Nhóm 3 (5.0-6.4): ${item.tiers.tier3} HS`}
                      />
                    )}
                    {item.tiers.tier4 > 0 && (
                      <div
                        style={{ width: `${(item.tiers.tier4 / totalForBar) * 100}%` }}
                        className="bg-rose-500 h-full"
                        title={`Nhóm 4 (<5.0): ${item.tiers.tier4} HS`}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#64748B] dark:text-slate-400">
                    <span className="text-emerald-700 dark:text-emerald-400">
                      G:{item.tiers.tier1}
                    </span>
                    <span className="text-[#1746D1] dark:text-cyan-300">
                      K:{item.tiers.tier2}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">
                      TB:{item.tiers.tier3}
                    </span>
                    <span className="text-rose-700 dark:text-rose-400">
                      Y:{item.tiers.tier4}
                    </span>
                    <span>Chưa thi:{item.tiers.untested}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =================================================================== */}
      {/* THỐNG KÊ THEO TỔ HỢP CẶP 2 MÔN TỰ CHỌN */}
      {/* =================================================================== */}
      {comboBreakdown.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#087CFF]" />
              <h4 className="font-extrabold font-heading text-sm sm:text-base text-[#14213D] dark:text-white m-0">
                2. Phân bố theo Cặp tổ hợp 2 môn tự chọn ({comboBreakdown.length} tổ hợp)
              </h4>
            </div>
            {selectedComboKey !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedComboKey('all');
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1746D1] dark:text-cyan-300 hover:underline cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Bỏ lọc tổ hợp
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {comboBreakdown.map((combo) => {
              const isSelected = selectedComboKey === combo.comboKey;
              return (
                <button
                  key={combo.comboKey}
                  type="button"
                  onClick={() => {
                    setSelectedComboKey(isSelected ? 'all' : combo.comboKey);
                    setSelectedSubjectId('all');
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1746D1] text-white border-[#1746D1] shadow-xs font-extrabold'
                      : 'bg-[#F8FAFC] dark:bg-[#091540]/70 text-[#14213D] dark:text-slate-200 border-[#CBD5E1] dark:border-[#1B317A] hover:border-[#087CFF] font-bold'
                  }`}
                >
                  <span>{combo.comboLabel}</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300'
                    }`}
                  >
                    {combo.count} HS ({combo.pct}%)
                  </span>
                  {combo.avgScore !== null && (
                    <span
                      className={`text-[11px] font-extrabold ${
                        isSelected
                          ? 'text-amber-200'
                          : 'text-[#475569] dark:text-slate-400'
                      }`}
                    >
                      • ĐTB {combo.avgScore.toFixed(1)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TÌNH HÌNH HỌC TẬP & PHÂN TẦNG 4 NHÓM CỦA NHÓM ĐANG XEM */}
      {/* =================================================================== */}
      <div className="rounded-2xl bg-gradient-to-br from-[#F8FAFF] to-[#EEF4FF] dark:from-[#091540] dark:to-[#0D1E59] border border-[#CBD5E1] dark:border-[#1B317A] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-[#1746D1] dark:text-[#00DFFF]" />
              <h4 className="font-extrabold font-heading text-sm sm:text-base text-[#14213D] dark:text-white m-0">
                3. Tình hình Học tập & Phân tầng Năng lực của nhóm:{' '}
                <span className="text-[#1746D1] dark:text-[#00DFFF]">
                  {activeGroupTitle} ({cohortSituation.totalInCohort} HS)
                </span>
              </h4>
            </div>
            <p className="text-xs text-[#475569] dark:text-slate-300 m-0 mt-0.5 font-medium">
              {hasAnyMockElectiveAttempt
                ? 'Phân tầng dựa trên Điểm trung bình đề thi thử / luyện đề của môn tự chọn đã đăng ký. Bấm vào từng nhóm để lọc danh sách học sinh cần khen thưởng hoặc phụ đạo.'
                : 'Phân tầng dựa trên Điểm trung bình các lần giải đề môn tự chọn (hệ thống tự động ưu tiên điểm đề thi thử khi có lượt nộp). Bấm vào từng nhóm để lọc danh sách.'}
            </p>
          </div>

          {/* Tóm tắt chuyên cần của nhóm */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1B55] border border-[#CBD5E1] dark:border-[#1B317A] font-bold text-[#14213D] dark:text-slate-200 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-[#1746D1] dark:text-cyan-300" />
              <span>
                Tự học: <strong>{cohortSituation.activeStudyStudents}/{cohortSituation.totalInCohort}</strong> HS ({cohortSituation.totalStudySessions} lượt)
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1B55] border border-[#CBD5E1] dark:border-[#1B317A] font-bold text-[#14213D] dark:text-slate-200 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Giải đề TC: <strong>{cohortSituation.totalElectiveAttempts}</strong> lượt
              </span>
            </div>
            {cohortSituation.counts.tier4 > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30 font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Cần kèm sát: {cohortSituation.counts.tier4} HS</span>
              </div>
            )}
          </div>
        </div>

        {/* 5 thẻ Phân tầng (Nhóm 1 -> Nhóm 4 + Chưa làm đề) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(['tier1', 'tier2', 'tier3', 'tier4', 'untested'] as TierKey[]).map(
            (tKey) => {
              const meta = TIER_META[tKey];
              const count = cohortSituation.counts[tKey];
              const pct =
                cohortSituation.totalInCohort > 0
                  ? Math.round((count / cohortSituation.totalInCohort) * 100)
                  : 0;
              const isSelected = selectedTier === tKey;

              return (
                <button
                  key={tKey}
                  type="button"
                  onClick={() => {
                    setSelectedTier(isSelected ? 'all' : tKey);
                    setCurrentPage(1);
                  }}
                  className={`text-left rounded-xl p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-[#1746D1] border-[#1746D1] bg-white dark:bg-[#0B1B55] shadow-sm'
                      : `${meta.cardBg} ${meta.cardBorder}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-extrabold ${meta.textColor}`}>
                      {meta.shortLabel}
                    </span>
                    <span className="text-[11px] font-black text-[#475569] dark:text-slate-300">
                      {pct}%
                    </span>
                  </div>
                  <div className="text-2xl font-black font-heading text-[#14213D] dark:text-white mt-1">
                    {count}{' '}
                    <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">
                      HS
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#475569] dark:text-slate-400 mt-0.5">
                    {meta.rangeLabel}
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* BỘ LỌC CHI TIẾT & BẢNG DANH SÁCH HỌC SINH */}
      {/* =================================================================== */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#1746D1] dark:text-cyan-300" />
            <h4 className="font-extrabold font-heading text-sm sm:text-base text-[#14213D] dark:text-white m-0">
              4. Danh sách chi tiết học sinh ({finalFilteredStudents.length} học sinh)
            </h4>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" /> Xóa bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full lg:w-auto">
            {/* Lọc theo Môn tự chọn */}
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                setSelectedSubjectId(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-[#CBD5E1] dark:border-[#1B317A] bg-white dark:bg-[#091540] px-3 py-2 text-xs font-bold text-[#14213D] dark:text-white focus:outline-none focus:border-[#1746D1]"
            >
              <option value="all">Tất cả môn tự chọn</option>
              {subjectBreakdown.map((item) => (
                <option key={item.subject.id} value={item.subject.id}>
                  {item.subject.name} ({item.countInMode} HS)
                </option>
              ))}
            </select>

            {/* Lọc theo Lớp */}
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-[#CBD5E1] dark:border-[#1B317A] bg-white dark:bg-[#091540] px-3 py-2 text-xs font-bold text-[#14213D] dark:text-white focus:outline-none focus:border-[#1746D1]"
            >
              <option value="all">Tất cả các lớp ({sortedClasses.length})</option>
              {sortedClasses.map((cls: any) => (
                <option key={cls.id} value={cls.id}>
                  Lớp {cls.name} (Ban {cls.group_type || 'T'})
                </option>
              ))}
            </select>

            {/* Lọc theo Nhóm phân tầng */}
            <select
              value={selectedTier}
              onChange={(e) => {
                setSelectedTier(e.target.value as 'all' | TierKey);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-[#CBD5E1] dark:border-[#1B317A] bg-white dark:bg-[#091540] px-3 py-2 text-xs font-bold text-[#14213D] dark:text-white focus:outline-none focus:border-[#1746D1]"
            >
              <option value="all">Tất cả nhóm năng lực</option>
              <option value="tier1">Nhóm 1: Giỏi / XS (≥ 8.0)</option>
              <option value="tier2">Nhóm 2: Khá (6.5 – 7.9)</option>
              <option value="tier3">Nhóm 3: Trung bình (5.0 – 6.4)</option>
              <option value="tier4">Nhóm 4: Cần kèm sát (&lt; 5.0)</option>
              <option value="untested">Chưa làm đề môn tự chọn</option>
            </select>

            {/* Tìm kiếm tên / MSHS */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm tên HS, MSHS, lớp..."
                className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#1B317A] bg-white dark:bg-[#091540] pl-8 pr-3 py-2 text-xs font-semibold text-[#14213D] dark:text-white placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1746D1]"
              />
            </div>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] dark:border-[#1B317A]">
          <table className="w-full text-left border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-[#F1F5F9] dark:bg-[#091540] border-b border-[#E2E8F0] dark:border-[#1B317A] text-[11px] font-extrabold uppercase tracking-wider text-[#334155] dark:text-slate-300">
                <th className="py-3 px-3.5 w-12 text-center">STT</th>
                <th className="py-3 px-3.5">Học sinh & MSHS</th>
                <th className="py-3 px-3">Lớp</th>
                <th className="py-3 px-3.5">2 Môn Tự Chọn & Điểm Từng Môn</th>
                <th className="py-3 px-3 text-center">Trạng thái ĐK</th>
                <th className="py-3 px-3 text-center">Tự học</th>
                <th className="py-3 px-3 text-center">Giải đề TC</th>
                <th className="py-3 px-3 text-center">ĐTB 2 Môn TC</th>
                <th className="py-3 px-3.5">Tình hình / Phân tầng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1B317A]/70 text-xs">
              {paginatedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-10 text-center text-sm font-semibold text-[#64748B] dark:text-slate-400"
                  >
                    Không tìm thấy học sinh nào phù hợp với điều kiện lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((st, idx) => {
                  const rowNum = (safePage - 1) * pageSize + idx + 1;
                  const rowTier = cohortSituation.getSubjectSpecificTier(st);
                  const tierMeta = TIER_META[rowTier];
                  const t1 = getSubjectColorTheme(st.elective1.name);
                  const t2 = getSubjectColorTheme(st.elective2.name);

                  return (
                    <tr
                      key={st.studentId || rowNum}
                      className="hover:bg-[#F8FAFC] dark:hover:bg-[#11256E]/40 transition-colors"
                    >
                      <td className="py-3 px-3.5 text-center font-bold text-[#64748B] dark:text-slate-400">
                        {rowNum}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-extrabold text-[#14213D] dark:text-white text-xs sm:text-sm">
                          {st.fullName}
                        </div>
                        <div className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400">
                          MSHS: {st.mshs}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-[#1746D1]/10 text-[#1746D1] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[#1746D1]/20">
                          {st.className}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${t1.badgeBg} ${t1.badgeText} ${t1.badgeBorder}`}
                          >
                            <span>{st.elective1.name}</span>
                            <span className="opacity-85 font-extrabold">
                              ({st.elective1Attempts} đề •{' '}
                              {st.elective1Avg !== null
                                ? st.elective1Avg.toFixed(1)
                                : '—'}
                              )
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${t2.badgeBg} ${t2.badgeText} ${t2.badgeBorder}`}
                          >
                            <span>{st.elective2.name}</span>
                            <span className="opacity-85 font-extrabold">
                              ({st.elective2Attempts} đề •{' '}
                              {st.elective2Avg !== null
                                ? st.elective2Avg.toFixed(1)
                                : '—'}
                              )
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {st.isExplicit ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Đã tự ĐK
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/80 dark:bg-slate-800 text-[#475569] dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            Phân ban
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-extrabold text-[#14213D] dark:text-white">
                          {st.studySessions} lượt
                        </div>
                        {st.studyMinutes > 0 && (
                          <div className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400">
                            {st.studyMinutes} phút
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-extrabold text-[#1746D1] dark:text-cyan-300">
                          {st.electiveTotalAttempts} lần
                        </div>
                        {st.electiveMockAttempts > 0 && (
                          <div className="text-[10px] font-bold text-[#D95B12] dark:text-[#FF9E64]">
                            {st.electiveMockAttempts} thi thử
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {st.electiveAvgScore !== null ? (
                          <span
                            className={`text-sm font-black font-heading ${
                              st.electiveAvgScore >= 8.0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : st.electiveAvgScore >= 6.5
                                ? 'text-[#1746D1] dark:text-cyan-300'
                                : st.electiveAvgScore >= 5.0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {st.electiveAvgScore.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${tierMeta.badgeClass}`}
                        >
                          {tierMeta.shortLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {finalFilteredStudents.length > pageSize && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <span className="text-xs font-semibold text-[#475569] dark:text-slate-300">
              Hiển thị{' '}
              <strong>
                {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, finalFilteredStudents.length)}
              </strong>{' '}
              trong tổng số <strong>{finalFilteredStudents.length}</strong> học sinh
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] dark:border-[#1B317A] bg-white dark:bg-[#091540] px-3 py-1.5 text-xs font-bold text-[#14213D] dark:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </button>
              <span className="text-xs font-extrabold text-[#14213D] dark:text-white px-2">
                Trang {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] dark:border-[#1B317A] bg-white dark:bg-[#091540] px-3 py-1.5 text-xs font-bold text-[#14213D] dark:text-white disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Sau <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
