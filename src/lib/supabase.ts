import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceRoleKey = 
  (process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('THAY_THE_BANG'))
    ? process.env.SUPABASE_SERVICE_ROLE_KEY 
    : supabaseAnonKey;

// Đăng ký chế độ Demo khi thiếu biến môi trường
export const isDemoMode = 
  supabaseUrl === 'https://placeholder.supabase.co' || 
  supabaseAnonKey === 'placeholder-anon-key' || 
  !process.env.NEXT_PUBLIC_SUPABASE_URL;

// =========================================================================
// GIẢ LẬP LỚP TRUY VẤN MOCK SUPABASE CLIENT (DEMO MODE)
// =========================================================================

async function queryMockDb(table: string, action: string, payloadData: any, filters: any[], onConflict?: string) {
  if (typeof window !== 'undefined') {
    // Client-side: Gọi qua HTTP API
    const res = await fetch('/api/mock-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, action, data: payloadData, filters, onConflict })
    });
    return res.json();
  } else {
    // Server-side: Đọc/ghi trực tiếp vào file mock_db.json để tránh lỗi gọi fetch tương đối
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(process.cwd(), 'mock_db.json');
    let db = {};
    try {
      db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
      db = {};
    }

    const dbAny = db as any;
    if (!dbAny[table]) dbAny[table] = [];
    let tableData = dbAny[table] as any[];

    const matchFilters = (item: any) => {
      if (!filters) return true;
      for (const filter of filters) {
        const { type, column, value, values } = filter;
        if (type === 'eq') {
          if (item[column] !== value) return false;
        } else if (type === 'in') {
          if (!values || !Array.isArray(values) || !values.includes(item[column])) return false;
        }
      }
      return true;
    };

    if (action === 'select') {
      let result = tableData.filter(matchFilters);

      // Mô phỏng JOIN
      if (table === 'student_details') {
        result = result.map(item => ({
          ...item,
          classes: dbAny.classes?.find((c: any) => c.id === item.class_id) || null
        }));
      } else if (table === 'teacher_classes') {
        result = result.map(item => ({
          ...item,
          classes: dbAny.classes?.find((c: any) => c.id === item.class_id) || null,
          subjects: dbAny.subjects?.find((s: any) => s.id === item.subject_id) || null
        }));
      } else if (table === 'chapters') {
        result = result.map(item => {
          let lessonsList = dbAny.lessons?.filter((l: any) => l.chapter_id === item.id) || [];
          lessonsList = lessonsList.map((l: any) => ({
            ...l,
            lesson_materials: dbAny.lesson_materials?.filter((m: any) => m.lesson_id === l.id) || []
          }));
          return { ...item, lessons: lessonsList };
        });
        result.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      } else if (table === 'lessons') {
        result = result.map(item => {
          const chap = dbAny.chapters?.find((c: any) => c.id === item.chapter_id);
          const sub = chap ? dbAny.subjects?.find((s: any) => s.id === chap.subject_id) : null;
          return {
            ...item,
            chapters: chap ? { ...chap, subjects: sub } : null
          };
        });
      } else if (table === 'study_progress') {
        result = result.map(item => {
          const lesson = dbAny.lessons?.find((l: any) => l.id === item.lesson_id);
          const chap = lesson ? dbAny.chapters?.find((c: any) => c.id === lesson.chapter_id) : null;
          const sub = chap ? dbAny.subjects?.find((s: any) => s.id === chap.subject_id) : null;
          return {
            ...item,
            lessons: lesson ? { ...lesson, chapters: chap ? { ...chap, subjects: sub } : null } : null
          };
        });
      } else if (table === 'audit_logs') {
        result = result.map(item => ({
          ...item,
          actor: dbAny.profiles?.find((p: any) => p.id === item.actor_id) || null
        }));
      } else if (table === 'exams') {
        result = result.map(item => {
          const sub = dbAny.subjects?.find((s: any) => s.id === item.subject_id);
          const les = dbAny.lessons?.find((l: any) => l.id === item.lesson_id);
          const qs = dbAny.questions?.filter((q: any) => q.exam_id === item.id) || [];
          return {
            ...item,
            subjects: sub || null,
            lessons: les || null,
            questions: qs
          };
        });
      } else if (table === 'exam_results') {
        result = result.map(item => {
          const ex = dbAny.exams?.find((e: any) => e.id === item.exam_id);
          const student = dbAny.student_details?.find((s: any) => s.student_id === item.student_id);
          return {
            ...item,
            exams: ex || null,
            student: student || null
          };
        });
      }

      return { data: result, error: null };
    }

    if (action === 'insert') {
      const records = Array.isArray(payloadData) ? payloadData : [payloadData];
      const inserted = [];
      for (const rec of records) {
        const newRec = { 
          id: rec.id || crypto.randomUUID(), 
          ...rec, 
          created_at: rec.created_at || new Date().toISOString() 
        };
        tableData.push(newRec);
        inserted.push(newRec);
      }
      dbAny[table] = tableData;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      return { data: Array.isArray(payloadData) ? inserted : inserted[0], error: null };
    }

    if (action === 'update') {
      const updated: any[] = [];
      dbAny[table] = tableData.map(item => {
        if (matchFilters(item)) {
          const oldItem = { ...item };
          const newItem = { ...item, ...payloadData, updated_at: new Date().toISOString() };
          updated.push(newItem);

          if (table === 'profiles' && payloadData.role && oldItem.role !== payloadData.role) {
            if (!dbAny.audit_logs) dbAny.audit_logs = [];
            dbAny.audit_logs.push({
              id: crypto.randomUUID(),
              actor_id: 'demo-admin-id',
              action: 'UPDATE_PROFILE_ROLE',
              target_table: 'profiles',
              target_id: item.id,
              old_values: { role: oldItem.role },
              new_values: { role: payloadData.role },
              created_at: new Date().toISOString()
            });
          }
          return newItem;
        }
        return item;
      });
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      return { data: updated, error: null };
    }

    if (action === 'delete') {
      const deleted = tableData.filter(matchFilters);
      dbAny[table] = tableData.filter(item => !matchFilters(item));
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      return { data: deleted, error: null };
    }

    if (action === 'upsert') {
      const records = Array.isArray(payloadData) ? payloadData : [payloadData];
      const resultData = [];
      for (const rec of records) {
        let index = -1;
        if (onConflict) {
          const conflictFields = onConflict.split(',');
          index = tableData.findIndex(item => {
            return conflictFields.every((field: string) => item[field.trim()] === rec[field.trim()]);
          });
        } else {
          index = tableData.findIndex(item => item.id === rec.id || (rec.student_id && item.student_id === rec.student_id && item.lesson_id === rec.lesson_id));
        }

        if (index > -1) {
          const oldItem = { ...tableData[index] };
          const newItem = { ...tableData[index], ...rec, updated_at: new Date().toISOString() };
          tableData[index] = newItem;
          resultData.push(newItem);

          if (table === 'profiles' && rec.role && oldItem.role !== rec.role) {
            if (!dbAny.audit_logs) dbAny.audit_logs = [];
            dbAny.audit_logs.push({
              id: crypto.randomUUID(),
              actor_id: 'demo-admin-id',
              action: 'UPDATE_PROFILE_ROLE',
              target_table: 'profiles',
              target_id: oldItem.id,
              old_values: { role: oldItem.role },
              new_values: { role: rec.role },
              created_at: new Date().toISOString()
            });
          }
        } else {
          const newRec = { 
            id: rec.id || crypto.randomUUID(), 
            ...rec, 
            created_at: rec.created_at || new Date().toISOString() 
          };
          tableData.push(newRec);
          resultData.push(newRec);
        }
      }
      dbAny[table] = tableData;
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
      return { data: Array.isArray(payloadData) ? resultData : resultData[0], error: null };
    }
    
    return { data: [], error: null };
  }
}

class MockBuilder {
  private table: string;
  private filters: any[] = [];
  private onConflictFields?: string;

  constructor(table: string) {
    this.table = table;
  }

  select(query?: string) {
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, values });
    return this;
  }

  order(column: string, options?: any) {
    return this;
  }

  limit(n: number) {
    return this;
  }

  maybeSingle() {
    return this.single();
  }

  async single() {
    const res = await queryMockDb(this.table, 'select', null, this.filters);
    const dataList = res.data || [];
    if (dataList.length === 0) {
      return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
    }
    return { data: dataList[0], error: null };
  }

  async insert(data: any) {
    return queryMockDb(this.table, 'insert', data, this.filters);
  }

  async update(data: any) {
    return queryMockDb(this.table, 'update', data, this.filters);
  }

  async delete() {
    return queryMockDb(this.table, 'delete', null, this.filters);
  }

  async upsert(data: any, options?: { onConflict?: string }) {
    return queryMockDb(this.table, 'upsert', data, this.filters, options?.onConflict);
  }

  // Thenable implementation to support direct await on builder (e.g. await supabase.from('...').select('*'))
  then(onfulfilled?: (value: any) => any) {
    const promise = queryMockDb(this.table, 'select', null, this.filters);
    return promise.then(onfulfilled);
  }
}

const mockSupabase = {
  from: (table: string) => new MockBuilder(table),
  auth: {
    getUser: async () => {
      // Đọc thông tin user giả lập từ cookies ở Server hoặc localStorage ở Client
      if (typeof window !== 'undefined') {
        const user = localStorage.getItem('demo-user');
        if (user) {
          const parsed = JSON.parse(user);
          return { data: { user: { id: parsed.id, email: parsed.email } }, error: null };
        }
      } else {
        const { cookies } = require('next/headers');
        const cookieStore = await cookies();
        const token = cookieStore.get('supabase-jwt')?.value;
        if (token) {
          try {
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            return { data: { user: { id: payload.sub, email: payload.email } }, error: null };
          } catch (e) {}
        }
      }
      return { data: { user: null }, error: new Error('Chưa đăng nhập') };
    }
  }
};

// =========================================================================
// INSTANCES EXPORT
// =========================================================================

function decodeTokenPayload(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      (typeof window !== 'undefined' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf-8'))
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const createSupabaseClient = (token?: string) => {
  if (isDemoMode) {
    return mockSupabase as any;
  }
  
  let isFallbackToken = false;
  if (token) {
    const payload = decodeTokenPayload(token);
    if (payload && payload.is_fallback === true) {
      isFallbackToken = true;
    }
  }
  
  if (token && !isFallbackToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
};

export const supabase = isDemoMode ? (mockSupabase as any) : createSupabaseClient();

export const supabaseAdmin = typeof window === 'undefined' 
  ? (isDemoMode ? (mockSupabase as any) : createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }))
  : null;

export async function getSupabaseServerClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseServerClient chỉ được gọi ở phía Server (Server Components / API Routes)');
  }

  if (isDemoMode) {
    return mockSupabase as any;
  }

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('supabase-jwt')?.value;

  return createSupabaseClient(token);
}
