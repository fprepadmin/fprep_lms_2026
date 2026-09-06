'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { 
  X, FileSpreadsheet, Download, Upload, CheckCircle2, 
  AlertCircle, ArrowRight, Check, RefreshCw, Users, FileText
} from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';

export interface ParsedStudentRow {
  stt: number | string;
  fullName: string;
  mshs: string;
  email: string;
  isValid: boolean;
  errorMsg?: string;
}

interface ClassOption {
  id: string;
  name: string;
  group_type?: string;
  academic_year?: string;
}

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassOption[];
  defaultClassId?: string | null;
  token: string;
  onSuccess: (importedCount: number, classId: string) => void;
}

export default function ExcelImportModal({
  isOpen,
  onClose,
  classes,
  defaultClassId,
  token,
  onSuccess
}: ExcelImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>(defaultClassId || classes[0]?.id || '');
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaultClassId) {
      setSelectedClassId(defaultClassId);
    } else if (classes.length > 0 && !selectedClassId) {
      setSelectedClassId(classes[0].id);
    }
  }, [defaultClassId, classes]);

  if (!isOpen || !mounted) return null;

  // 1. TẢI FILE MẪU EXCEL (.xlsx và .csv)
  const handleDownloadSampleExcel = () => {
    const data = [
      {
        'STT': 1,
        'Họ và Tên': 'Nguyễn Văn An',
        'MSHS': 'HS12001',
        'Email': 'hs.annguyen@fpt.edu.vn'
      },
      {
        'STT': 2,
        'Họ và Tên': 'Trần Thị Bình',
        'MSHS': 'HS12002',
        'Email': 'hs.binhtran@fpt.edu.vn'
      },
      {
        'STT': 3,
        'Họ và Tên': 'Lê Hoàng Cường',
        'MSHS': 'HS12003',
        'Email': 'hs.cuongle@fpt.edu.vn'
      },
      {
        'STT': 4,
        'Họ và Tên': 'Phạm Thu Dung',
        'MSHS': 'HS12004',
        'Email': 'hs.dungpham@fpt.edu.vn'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Tùy chỉnh độ rộng cột
    worksheet['!cols'] = [
      { wch: 8 },  // STT
      { wch: 25 }, // Họ và Tên
      { wch: 15 }, // MSHS
      { wch: 30 }, // Email
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachHocSinh');

    XLSX.writeFile(workbook, 'mau_danh_sach_hoc_sinh_FPREP.xlsx');
  };

  // 2. PHÂN TÍCH FILE EXCEL / CSV KHI NGƯỜI DÙNG TẢI LÊN
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessingFile(true);
    setImportResult(null);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Lấy dữ liệu dạng mảng 2 chiều
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawData || rawData.length === 0) {
          alert('File Excel rỗng hoặc không đọc được dữ liệu!');
          setIsProcessingFile(false);
          return;
        }

        // Tự động tìm hàng tiêu đề
        let headerRowIdx = -1;
        let colStt = -1;
        let colName = -1;
        let colMshs = -1;
        let colEmail = -1;

        for (let r = 0; r < Math.min(rawData.length, 10); r++) {
          const row = rawData[r] || [];
          for (let c = 0; c < row.length; c++) {
            const cellVal = String(row[c] || '').toLowerCase().trim();
            if (cellVal.includes('stt') || cellVal === 'no' || cellVal === 'index') colStt = c;
            if (cellVal.includes('họ') || cellVal.includes('tên') || cellVal.includes('name')) colName = c;
            if (cellVal.includes('mshs') || cellVal.includes('mã') || cellVal.includes('code') || cellVal.includes('id')) colMshs = c;
            if (cellVal.includes('email') || cellVal.includes('mail') || cellVal.includes('thư')) colEmail = c;
          }

          // Nếu tìm thấy ít nhất cột Tên hoặc MSHS/Email thì coi như đây là dòng tiêu đề
          if ((colName !== -1 && colMshs !== -1) || (colName !== -1 && colEmail !== -1)) {
            headerRowIdx = r;
            break;
          }
        }

        // Nếu không phát hiện tiêu đề, dùng vị trí mặc định: 0=STT, 1=Họ Tên, 2=MSHS, 3=Email
        if (headerRowIdx === -1) {
          headerRowIdx = 0;
          colStt = 0;
          colName = 1;
          colMshs = 2;
          colEmail = 3;
        } else {
          if (colStt === -1) colStt = 0;
          if (colName === -1) colName = 1;
          if (colMshs === -1) colMshs = 2;
          if (colEmail === -1) colEmail = 3;
        }

        const parsedList: ParsedStudentRow[] = [];
        const dataRows = rawData.slice(headerRowIdx + 1);

        dataRows.forEach((row, idx) => {
          // Bỏ qua dòng trống hoàn toàn
          if (!row || row.every(cell => cell === undefined || cell === null || String(cell).trim() === '')) {
            return;
          }

          const sttRaw = row[colStt] !== undefined ? row[colStt] : idx + 1;
          const fullNameRaw = String(row[colName] || '').trim();
          const mshsRaw = String(row[colMshs] || '').trim().toUpperCase();
          const emailRaw = String(row[colEmail] || '').trim().toLowerCase();

          // Kiểm tra tính hợp lệ
          let isValid = true;
          let errorMsg = '';

          if (!fullNameRaw) {
            isValid = false;
            errorMsg = 'Thiếu họ và tên';
          } else if (!mshsRaw) {
            isValid = false;
            errorMsg = 'Thiếu MSHS';
          } else if (!emailRaw || !emailRaw.includes('@')) {
            isValid = false;
            errorMsg = 'Email không hợp lệ';
          }

          parsedList.push({
            stt: sttRaw,
            fullName: fullNameRaw,
            mshs: mshsRaw,
            email: emailRaw,
            isValid,
            errorMsg
          });
        });

        if (parsedList.length === 0) {
          alert('Không tìm thấy dòng dữ liệu học sinh nào hợp lệ trong file!');
        }

        setParsedRows(parsedList);
      } catch (err: any) {
        console.error('Lỗi khi đọc file Excel:', err);
        alert('Đã xảy ra lỗi khi đọc file Excel: ' + (err.message || 'File hỏng hoặc không đúng định dạng'));
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.onerror = () => {
      alert('Không thể đọc file đã chọn.');
      setIsProcessingFile(false);
    };

    reader.readAsArrayBuffer(file);
  };

  // 3. THỰC HIỆN LƯU VÀO DATABASE SUPABASE / MOCK DB
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Không có học sinh nào hợp lệ để thêm vào lớp!');
      return;
    }

    if (!selectedClassId) {
      alert('Vui lòng chọn lớp học để phân bổ học sinh!');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    const supabase = createSupabaseClient(token);
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const student = validRows[i];
      try {
        const studentUserId = crypto.randomUUID();

        // 1. Tạo hoặc cập nhật Profile học sinh
        const { error: profileErr } = await supabase
          .from('profiles')
          .upsert({
            id: studentUserId,
            email: student.email,
            role: 'student'
          }, { onConflict: 'email' });

        if (profileErr) {
          console.warn('Lỗi tạo profile cho:', student.email, profileErr);
        }

        // 2. Thêm hoặc cập nhật thông tin chi tiết học sinh vào lớp học
        const { error: detailErr } = await supabase
          .from('student_details')
          .upsert({
            student_id: studentUserId,
            mshs: student.mshs,
            full_name: student.fullName,
            class_id: selectedClassId
          }, { onConflict: 'mshs' });

        if (detailErr) {
          console.warn('Lỗi cập nhật student_details:', student.mshs, detailErr);
          failedCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Lỗi khi thêm học sinh:', student, err);
        failedCount++;
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setIsImporting(false);
    setImportResult({ success: successCount, failed: failedCount });

    if (successCount > 0) {
      onSuccess(successCount, selectedClassId);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;
  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || 'Lớp đã chọn';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-card w-full max-w-4xl max-h-[92vh] rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden text-foreground">
        
        {/* 1. HEADER MODAL */}
        <header className="px-6 py-4.5 border-b border-border flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-heading text-secondary dark:text-foreground m-0 flex items-center gap-2">
                Nhập Danh Sách Học Sinh Bằng File Excel
              </h2>
              <p className="text-xs text-muted-foreground m-0">
                Định dạng chuẩn: <strong className="text-primary font-mono">STT - Họ và Tên - MSHS - Email</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isImporting}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* 2. BODY CHÍNH */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-background">

          {/* CHỌN LỚP HỌC VÀ NÚT TẢI FILE MẪU */}
          <div className="grid gap-4 sm:grid-cols-2">
            
            {/* CHỌN LỚP TIẾP NHẬN */}
            <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Lớp học tiếp nhận học sinh:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={isImporting}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Lớp {c.name} {c.academic_year ? `(${c.academic_year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* TẢI FILE MẪU CHUẨN */}
            <div className="p-4 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Chưa có file mẫu?
                </div>
                <p className="text-[11px] text-muted-foreground m-0 mt-1">
                  Tải ngay file Excel mẫu chứa sẵn 4 cột chuẩn: STT, Họ và Tên, MSHS, Email.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadSampleExcel}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors w-full"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Tải file Excel mẫu (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* KHUNG TẢI FILE / CHỌN FILE */}
          <div className="space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-3 ${
                fileName 
                  ? 'border-primary/40 bg-primary/5 hover:bg-primary/10' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/30 bg-card'
              }`}
            >
              <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                <Upload className="h-7 w-7" />
              </div>

              <div className="space-y-1">
                <div className="text-sm font-bold text-foreground">
                  {fileName ? (
                    <span className="text-primary flex items-center justify-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4" /> {fileName}
                    </span>
                  ) : (
                    'Bấm vào đây để chọn file Excel (.xlsx, .xls, .csv)'
                  )}
                </div>
                <p className="text-xs text-muted-foreground m-0">
                  {fileName ? 'Bấm để đổi sang file khác' : 'Hỗ trợ các file chứa 4 cột: STT, Họ và tên, MSHS, Email'}
                </p>
              </div>

              {isProcessingFile && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold animate-pulse">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Đang phân tích dữ liệu bảng...
                </div>
              )}
            </div>
          </div>

          {/* BẢNG XEM TRƯỚC (PREVIEW TABLE) */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground m-0">
                    Xem trước danh sách ({parsedRows.length} dòng)
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    {validCount} hợp lệ
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-bold text-[11px]">
                      {invalidCount} lỗi
                    </span>
                  )}
                </div>

                <span className="text-xs text-muted-foreground">
                  Sẽ thêm vào: <strong className="text-primary">{selectedClassName}</strong>
                </span>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden bg-card">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 border-b border-border font-bold text-foreground sticky top-0 backdrop-blur-xs">
                      <tr>
                        <th className="p-3 w-14 text-center">STT</th>
                        <th className="p-3">Họ và Tên</th>
                        <th className="p-3 w-28">MSHS</th>
                        <th className="p-3">Email</th>
                        <th className="p-3 w-32 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsedRows.map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-muted/20' : 'bg-rose-500/5 hover:bg-rose-500/10'}>
                          <td className="p-3 text-center font-mono font-bold text-muted-foreground">
                            {row.stt || idx + 1}
                          </td>
                          <td className="p-3 font-semibold text-foreground">
                            {row.fullName || <span className="text-rose-500 italic">(Trống)</span>}
                          </td>
                          <td className="p-3 font-mono font-bold text-primary">
                            {row.mshs || <span className="text-rose-500 italic">(Trống)</span>}
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">
                            {row.email || <span className="text-rose-500 italic">(Trống)</span>}
                          </td>
                          <td className="p-3 text-center">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                <CheckCircle2 className="h-3 w-3" /> Hợp lệ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold" title={row.errorMsg}>
                                <AlertCircle className="h-3 w-3" /> {row.errorMsg}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* KẾT QUẢ IMPORT NẾU ĐÃ THỰC HIỆN */}
          {importResult && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 space-y-1 animate-fade-in">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="h-4 w-4" /> Đã hoàn thành quá trình thêm học sinh!
              </div>
              <p className="text-xs text-muted-foreground m-0">
                Thành công: <strong className="text-emerald-600 dark:text-emerald-400">{importResult.success}</strong> học sinh • Lỗi: <strong className="text-rose-600">{importResult.failed}</strong>
              </p>
            </div>
          )}

        </div>

        {/* 3. FOOTER ACTIONS */}
        <footer className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground">
            {parsedRows.length > 0 ? (
              <>Sẵn sàng thêm <strong className="text-foreground">{validCount} học sinh</strong> vào <strong className="text-primary">{selectedClassName}</strong></>
            ) : (
              'Chọn file Excel để bắt đầu phân tích dữ liệu'
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs transition-colors flex-1 sm:flex-none disabled:opacity-50"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isImporting || validCount === 0 || !selectedClassId}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Đang nhập ({importProgress}%)...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Xác nhận nhập {validCount > 0 ? `${validCount} học sinh` : ''}</span>
                </>
              )}
            </button>
          </div>
        </footer>

      </div>
    </div>,
    document.body
  );
}
