import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'mock_db.json');

function readDb() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Nếu tệp chưa tồn tại hoặc lỗi, trả về cấu trúc rỗng
    return {};
  }
}

function writeDb(data: any) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table, action, data: payload, filters, onConflict } = body;
    
    const db = readDb();
    if (!db[table]) {
      db[table] = [];
    }
    
    let tableData = db[table] as any[];
    
    // Hàm so khớp bộ lọc
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
      
      // Giả lập JOIN của Supabase
      if (table === 'student_details') {
        result = result.map(item => {
          const cls = db.classes?.find((c: any) => c.id === item.class_id);
          return { ...item, classes: cls || null };
        });
      } else if (table === 'teacher_classes') {
        result = result.map(item => {
          const cls = db.classes?.find((c: any) => c.id === item.class_id);
          const sub = db.subjects?.find((s: any) => s.id === item.subject_id);
          return { ...item, classes: cls || null, subjects: sub || null };
        });
      } else if (table === 'chapters') {
        // JOIN lessons và materials
        result = result.map(item => {
          let lessonsList = db.lessons?.filter((l: any) => l.chapter_id === item.id) || [];
          lessonsList = lessonsList.map((l: any) => {
            const mats = db.lesson_materials?.filter((m: any) => m.lesson_id === l.id) || [];
            return { ...l, lesson_materials: mats };
          });
          return { ...item, lessons: lessonsList };
        });
        // Sắp xếp chapters theo order_index
        result.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      } else if (table === 'lessons') {
        result = result.map(item => {
          const chap = db.chapters?.find((c: any) => c.id === item.chapter_id);
          const sub = chap ? db.subjects?.find((s: any) => s.id === chap.subject_id) : null;
          return {
            ...item,
            chapters: chap ? { ...chap, subjects: sub } : null
          };
        });
      } else if (table === 'study_progress') {
        result = result.map(item => {
          const lesson = db.lessons?.find((l: any) => l.id === item.lesson_id);
          const chap = lesson ? db.chapters?.find((c: any) => c.id === lesson.chapter_id) : null;
          const sub = chap ? db.subjects?.find((s: any) => s.id === chap.subject_id) : null;
          return {
            ...item,
            lessons: lesson ? { ...lesson, chapters: chap ? { ...chap, subjects: sub } : null } : null
          };
        });
      } else if (table === 'audit_logs') {
        result = result.map(item => {
          const actor = db.profiles?.find((p: any) => p.id === item.actor_id);
          return { ...item, actor: actor || null };
        });
      } else if (table === 'exams') {
        result = result.map(item => {
          const sub = db.subjects?.find((s: any) => s.id === item.subject_id);
          const les = db.lessons?.find((l: any) => l.id === item.lesson_id);
          const qs = db.questions?.filter((q: any) => q.exam_id === item.id) || [];
          return {
            ...item,
            subjects: sub || null,
            lessons: les || null,
            questions: qs
          };
        });
      } else if (table === 'exam_results') {
        result = result.map(item => {
          const ex = db.exams?.find((e: any) => e.id === item.exam_id);
          const student = db.student_details?.find((s: any) => s.student_id === item.student_id);
          return {
            ...item,
            exams: ex || null,
            student: student || null
          };
        });
      }
      
      return NextResponse.json({ data: result });
    }
    
    if (action === 'insert') {
      const records = Array.isArray(payload) ? payload : [payload];
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
      db[table] = tableData;
      writeDb(db);
      return NextResponse.json({ data: Array.isArray(payload) ? inserted : inserted[0] });
    }
    
    if (action === 'update') {
      const updated: any[] = [];
      db[table] = tableData.map(item => {
        if (matchFilters(item)) {
          const oldItem = { ...item };
          const newItem = { ...item, ...payload, updated_at: new Date().toISOString() };
          updated.push(newItem);
          
          // Tự động ghi nhận Audit Log khi cập nhật Role tài khoản ở chế độ Demo
          if (table === 'profiles' && payload.role && oldItem.role !== payload.role) {
            if (!db.audit_logs) db.audit_logs = [];
            db.audit_logs.push({
              id: crypto.randomUUID(),
              actor_id: 'demo-admin-id',
              action: 'UPDATE_PROFILE_ROLE',
              target_table: 'profiles',
              target_id: item.id,
              old_values: { role: oldItem.role },
              new_values: { role: payload.role },
              created_at: new Date().toISOString()
            });
          }
          return newItem;
        }
        return item;
      });
      writeDb(db);
      return NextResponse.json({ data: updated });
    }
    
    if (action === 'delete') {
      const deleted = tableData.filter(matchFilters);
      db[table] = tableData.filter(item => !matchFilters(item));
      writeDb(db);
      return NextResponse.json({ data: deleted });
    }
    
    if (action === 'upsert') {
      const records = Array.isArray(payload) ? payload : [payload];
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
          
          // Trigger Audit Log
          if (table === 'profiles' && rec.role && oldItem.role !== rec.role) {
            if (!db.audit_logs) db.audit_logs = [];
            db.audit_logs.push({
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
      db[table] = tableData;
      writeDb(db);
      return NextResponse.json({ data: Array.isArray(payload) ? resultData : resultData[0] });
    }
    
    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Lỗi Mock DB API:', error);
    return NextResponse.json({ error: error.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
