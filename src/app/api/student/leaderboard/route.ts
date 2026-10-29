import { NextResponse } from 'next/server';
import { fetchLeaderboardFromPython } from '@/lib/pythonBackend';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    // 1. Thử lấy từ Python Acceleration Server (FastAPI cache)
    const pythonData = await fetchLeaderboardFromPython(limit, forceRefresh);
    if (pythonData && pythonData.length > 0) {
      return NextResponse.json({
        success: true,
        source: 'python_cache',
        count: pythonData.length,
        data: pythonData
      });
    }

    // 2. Fallback sang tính toán trực tiếp từ Supabase nếu Python server chưa sẵn sàng
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, data: [] }, { status: 500 });
    }

    const [studentsRes, progressRes, examsRes, logsRes] = await Promise.all([
      supabaseAdmin.from('student_details').select('student_id, full_name, mshs, classes(name, academic_year)').limit(100),
      supabaseAdmin.from('study_progress').select('student_id, completed').eq('completed', true),
      supabaseAdmin.from('exam_results').select('student_id, score'),
      supabaseAdmin.from('study_logs').select('student_id, duration_seconds')
    ]);

    const students = studentsRes.data || [];
    const progress = progressRes.data || [];
    const exams = examsRes.data || [];
    const logs = logsRes.data || [];

    // Map số bài học hoàn thành
    const progressMap: Record<string, number> = {};
    progress.forEach((p: any) => {
      if (p.student_id) progressMap[p.student_id] = (progressMap[p.student_id] || 0) + 1;
    });

    // Map thời gian học (phút)
    const logsMap: Record<string, number> = {};
    logs.forEach((l: any) => {
      if (l.student_id) logsMap[l.student_id] = (logsMap[l.student_id] || 0) + Math.floor((l.duration_seconds || 0) / 60);
    });

    // Map điểm thi và số đề đã làm
    const examMap: Record<string, { count: number; totalScore: number }> = {};
    exams.forEach((e: any) => {
      if (e.student_id && e.score !== null) {
        if (!examMap[e.student_id]) examMap[e.student_id] = { count: 0, totalScore: 0 };
        examMap[e.student_id].count += 1;
        examMap[e.student_id].totalScore += Number(e.score) || 0;
      }
    });

    const leaderboard = students.map((s: any) => {
      const sid = s.student_id;
      const completedCount = progressMap[sid] || 0;
      const studyMins = logsMap[sid] || 0;
      const ex = examMap[sid] || { count: 0, totalScore: 0 };
      const avgScore = ex.count > 0 ? Math.round((ex.totalScore / ex.count) * 10) / 10 : 0;

      // Tính tổng XP chuẩn hóa
      const xp = (completedCount * 50) + (studyMins * 2) + Math.round(ex.totalScore * 20);
      const level = Math.max(1, Math.min(12, Math.floor(xp / 300) + 1));

      return {
        student_id: sid,
        name: s.full_name || 'Học sinh',
        mshs: s.mshs || '---',
        className: s.classes?.name || '12T3',
        totalXp: xp,
        level,
        levelTitle: level >= 8 ? 'Thủ Lĩnh Học Tập' : level >= 5 ? 'Bứt Phá Điểm Số' : 'Khởi Động Luyện Thi',
        badgeRank: (level >= 10 ? 'master' : level >= 8 ? 'diamond' : level >= 6 ? 'platinum' : level >= 4 ? 'gold' : 'silver') as any,
        completedCount,
        examCount: ex.count,
        avgScore,
        totalScore: xp,
        rank: 0
      };
    });

    // Sắp xếp theo tổng XP giảm dần
    leaderboard.sort((a, b) => b.totalXp - a.totalXp || b.avgScore - a.avgScore);
    const rankedList = leaderboard.slice(0, limit).map((item, idx) => ({
      ...item,
      rank: idx + 1
    }));

    return NextResponse.json({
      success: true,
      source: 'supabase_direct',
      count: rankedList.length,
      data: rankedList
    });
  } catch (error: any) {
    console.error('Error fetching leaderboard API:', error);
    return NextResponse.json({ success: false, data: [], error: error?.message }, { status: 500 });
  }
}
