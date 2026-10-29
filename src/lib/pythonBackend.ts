/**
 * Client kết nối đến Python Acceleration Server (FastAPI)
 * Cung cấp khả năng tăng tốc độ truy vấn, nén tải CSDL và bộ nhớ đệm (Cache) tốc độ cao.
 */

const PYTHON_SERVER_URL = process.env.PYTHON_SERVER_URL || 'http://127.0.0.1:8000';

export interface LeaderboardItem {
  student_id?: string;
  name: string;
  mshs: string;
  className?: string;
  totalXp: number;
  level: number;
  levelTitle: string;
  badgeRank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  completedCount: number;
  examCount?: number;
  avgScore: number;
  totalScore: number;
  rank?: number;
}

export async function fetchLeaderboardFromPython(limit: number = 10, forceRefresh: boolean = false): Promise<LeaderboardItem[] | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const refreshParam = forceRefresh ? '&force_refresh=true' : '';
    const res = await fetch(`${PYTHON_SERVER_URL}/api/v1/leaderboard?limit=${limit}${refreshParam}`, {
      signal: controller.signal,
      next: { revalidate: 60 }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function checkPythonServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800);
    const res = await fetch(`${PYTHON_SERVER_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}
