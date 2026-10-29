import asyncio
from typing import List, Dict, Any
from ..cache import cache
from .supabase_service import supabase_service

CACHE_KEY_LEADERBOARD = "leaderboard_grade_12"

async def get_cached_leaderboard(limit: int = 10, force_refresh: bool = False) -> List[Dict[str, Any]]:
    cache_key = f"{CACHE_KEY_LEADERBOARD}_{limit}"
    
    if not force_refresh:
        cached_data = await cache.get(cache_key)
        if cached_data is not None:
            return cached_data

    # Fetch song song danh sách học sinh và kết quả học tập
    students_task = supabase_service.select("student_details", {"select": "student_id,full_name,mshs,classes(name,academic_year)"})
    progress_task = supabase_service.select("study_progress", {"select": "student_id,completed", "completed": "eq.true"})
    exams_task = supabase_service.select("exam_results", {"select": "student_id,score,created_at"})
    logs_task = supabase_service.select("study_logs", {"select": "student_id,duration_seconds"})

    students_data, progress_data, exams_data, logs_data = await asyncio.gather(
        students_task, progress_task, exams_task, logs_task
    )

    if not students_data:
        return []

    # Map hoàn thành bài học theo student_id
    progress_count: Dict[str, int] = {}
    for p in progress_data:
        sid = p.get("student_id")
        if sid:
            progress_count[sid] = progress_count.get(sid, 0) + 1

    # Map thời gian học theo student_id
    study_minutes_by_student: Dict[str, int] = {}
    for l in logs_data:
        sid = l.get("student_id")
        dur = l.get("duration_seconds", 0) or 0
        if sid:
            study_minutes_by_student[sid] = study_minutes_by_student.get(sid, 0) + (dur // 60)

    # Map điểm thi theo student_id
    scores_by_student: Dict[str, List[float]] = {}
    exam_count_by_student: Dict[str, int] = {}
    for e in exams_data:
        sid = e.get("student_id")
        raw_score = e.get("score")
        if sid and raw_score is not None:
            try:
                score_val = float(raw_score)
                if sid not in scores_by_student:
                    scores_by_student[sid] = []
                scores_by_student[sid].append(score_val)
                exam_count_by_student[sid] = exam_count_by_student.get(sid, 0) + 1
            except (ValueError, TypeError):
                continue

    # Bảng cấp độ tính danh hiệu và huy hiệu rank
    LEVEL_TIERS_SERVER = [
        (17000, 12, "Thủ Khoa Tương Lai", "master"),
        (13000, 11, "Thủ Lĩnh Học Đường", "master"),
        (10000, 10, "Huyền Thoại 2026-2027", "diamond"),
        (7600, 9, "Đại Sư Tri Thức", "diamond"),
        (5700, 8, "Tinh Anh F-School", "platinum"),
        (4100, 7, "Bậc Thầy Ôn Luyện", "platinum"),
        (2800, 6, "Cao Thủ FPREP", "gold"),
        (1800, 5, "Bứt Phá Điểm Số", "gold"),
        (1100, 4, "Chiến Binh Kiên Trì", "silver"),
        (600, 3, "Học Sinh Chăm Chỉ", "silver"),
        (250, 2, "Khởi Động Luyện Thi", "bronze"),
        (0, 1, "Tân Binh Khối 12", "bronze")
    ]

    leaderboard = []
    for s in students_data:
        sid = s.get("student_id")
        if not sid:
            continue
        
        c_info = s.get("classes") or {}
        class_name = c_info.get("name") if isinstance(c_info, dict) else ""
        
        completed_lessons = progress_count.get(sid, 0)
        study_mins = study_minutes_by_student.get(sid, 0)
        scores = scores_by_student.get(sid, [])
        exam_count = exam_count_by_student.get(sid, 0)
        avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

        # Tính chuẩn hóa XP theo công thức đồng nhất
        lesson_xp = completed_lessons * 100
        study_xp = study_mins * 2
        exam_xp = 0
        for sc in scores:
            exam_xp += 50
            if sc >= 10.0: exam_xp += 200
            elif sc >= 9.0: exam_xp += 100
            elif sc >= 8.0: exam_xp += 50
            elif sc >= 5.0: exam_xp += 30

        total_xp = lesson_xp + study_xp + exam_xp

        # Xác định Cấp độ & Rank
        level = 1
        level_title = "Tân Binh Khối 12"
        badge_rank = "bronze"
        for min_xp, lvl, title, rk in LEVEL_TIERS_SERVER:
            if total_xp >= min_xp:
                level = lvl
                level_title = title
                badge_rank = rk
                break

        leaderboard.append({
            "student_id": sid,
            "name": s.get("full_name") or "Học sinh FPT",
            "mshs": s.get("mshs") or "---",
            "className": class_name or "12T3",
            "totalXp": total_xp,
            "level": level,
            "levelTitle": level_title,
            "badgeRank": badge_rank,
            "completedCount": completed_lessons,
            "examCount": exam_count,
            "avgScore": avg_score,
            "totalScore": total_xp
        })

    # Sắp xếp theo tổng XP thực tế giảm dần, sau đó điểm TB giảm dần
    leaderboard.sort(key=lambda x: (x["totalXp"], x["avgScore"], x["completedCount"]), reverse=True)
    
    # Gán thứ hạng Rank 1, 2, 3...
    for idx, item in enumerate(leaderboard):
        item["rank"] = idx + 1

    top_leaderboard = leaderboard[:limit]

    # Cache 120s
    await cache.set(cache_key, top_leaderboard, ttl_seconds=120)

    return top_leaderboard
