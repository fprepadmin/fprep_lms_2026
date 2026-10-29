import { createClient } from '@supabase/supabase-js';

const fprepUrl = 'https://oxkrzvsywlfmavxnwhze.supabase.co';
const fprepKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94a3J6dnN5d2xmbWF2eG53aHplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1ODY1OTMsImV4cCI6MjEwMTE2MjU5M30.jIhtQJGvKnwYj5qxEVPRBMdOpCv77D0dp5uFchs6vzQ';

const supabase = createClient(fprepUrl, fprepKey);

async function cleanStudentData() {
  console.log('=== ĐANG KIỂM TRA DỮ LIỆU HỌC SINH TRÊN FPREP SUPABASE ===');

  // 1. Kiểm tra profiles role = 'student'
  const { data: studentProfiles, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student');

  console.log(`Số lượng profiles học sinh: ${studentProfiles?.length || 0}`);

  // 2. Xóa các bảng liên quan đến học sinh
  console.log('Đang xóa study_logs...');
  const { error: err1 } = await supabase.from('study_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.log('study_logs error/empty:', err1.message);

  console.log('Đang xóa study_progress...');
  const { error: err2 } = await supabase.from('study_progress').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err2) console.log('study_progress error/empty:', err2.message);

  console.log('Đang xóa exam_results...');
  const { error: err3 } = await supabase.from('exam_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err3) console.log('exam_results error/empty:', err3.message);

  console.log('Đang xóa support_requests của học sinh...');
  const { error: err4 } = await supabase.from('support_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err4) console.log('support_requests error/empty:', err4.message);

  console.log('Đang xóa student_details...');
  const { error: err5 } = await supabase.from('student_details').delete().neq('student_id', 'NON_EXISTENT');
  if (err5) console.log('student_details error/empty:', err5.message);

  console.log('Đang xóa profiles học sinh...');
  const { error: err6 } = await supabase.from('profiles').delete().eq('role', 'student');
  if (err6) console.log('profiles student delete error:', err6.message);

  // 3. Nếu có bảng users (từ sync)
  console.log('Đang kiểm tra bảng users nếu có...');
  const { error: err7 } = await supabase.from('users').delete().eq('role', 'student');
  if (err7) console.log('users table error/not existing:', err7.message);

  console.log('=== HOÀN TẤT DỌN DẸP DỮ LIỆU HỌC SINH TRÊN FPREP ===');
}

cleanStudentData().catch(console.error);
