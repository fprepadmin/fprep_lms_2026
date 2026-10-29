import math
from typing import List, Dict, Any

LEVEL_TIERS_DATA = [
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

def calculate_gamification_stats(progress: List[Dict[str, Any]], logs: List[Dict[str, Any]], exams: List[Dict[str, Any]]) -> Dict[str, Any]:
    # 1. Tính toán điểm kinh nghiệm (XP) thống nhất
    completed_lessons = sum(1 for p in progress if p.get("completed"))
    lesson_xp = completed_lessons * 100

    total_study_seconds = sum(l.get("duration_seconds", 0) for l in logs)
    study_minutes = total_study_seconds // 60
    study_time_xp = study_minutes * 2

    exam_xp = 0
    passed_exams = 0
    high_score_exams = 0
    
    for ex in exams:
        try:
            score = float(ex.get("score", 0))
            exam_xp += 50
            if score >= 10.0:
                exam_xp += 200
            elif score >= 9.0:
                exam_xp += 100
                high_score_exams += 1
            elif score >= 8.0:
                exam_xp += 50
                high_score_exams += 1
            elif score >= 5.0:
                exam_xp += 30
                passed_exams += 1
        except (ValueError, TypeError):
            continue

    total_xp = lesson_xp + study_time_xp + exam_xp

    # 2. Tính toán Cấp độ
    level = 1
    level_title = "Tân Binh Khối 12"
    badge_rank = "bronze"

    for min_xp, lvl, title, rk in LEVEL_TIERS_DATA:
        if total_xp >= min_xp:
            level = lvl
            level_title = title
            badge_rank = rk
            break

    return {
        "total_xp": total_xp,
        "level": level,
        "level_title": level_title,
        "badge_rank": badge_rank,
        "completed_lessons": completed_lessons,
        "study_minutes": study_minutes,
        "total_exams": len(exams),
        "passed_exams": passed_exams,
        "high_score_exams": high_score_exams
    }
