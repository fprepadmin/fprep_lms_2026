import React, { useState, useEffect } from 'react';
import { 
  Clock, Users, BookOpen, GraduationCap, 
  ChevronDown, ChevronRight, Loader2, Target, 
  CheckCircle2, ListChecks, FileText
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { examService } from '../../services/examService';

const TABS = ['Đề theo bài', 'Chuyên đề', 'Đề luyện thi', 'ĐGNL', 'VSAT'];

const QuizList = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();
  
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('Đề theo bài');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchExams = async () => {
      if (!currentUser?.id) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const data = await examService.getActiveExams(currentUser.id);
        setExams(data || []);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách đề thi:", error);
      } finally {
        setIsLoading(false);
      }

      if (location.state && (location.state as any).activeTab) {
        setActiveTab((location.state as any).activeTab);
      }
    };
    
    fetchExams();
  }, [currentUser, location.key]);

  const filteredExams = exams.filter(exam => exam.type === activeTab);

  const groupedExams = filteredExams.reduce((acc, exam) => {
    const group = exam.group_name?.trim() || 'Khác (Chưa phân nhóm)';
    if (!acc[group]) acc[group] = [];
    acc[group].push(exam);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: prev[groupName] === false ? true : false }));
  };

  return (
    <div className="page-container animate-in fade-in duration-300">
      <div className="page-content">
        <div className="max-w-7xl mx-auto w-full">
        
        {/* ==========================================
            HEADER 
            ========================================== */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-[#212529] mb-1 flex items-center gap-2">
            <Target className="text-primary" size={24} /> Danh sách Đề thi
          </h1>
          <p className="text-[#6c757d] text-[14px]">
            Lựa chọn bộ đề phù hợp để luyện tập và đánh giá năng lực của bạn.
          </p>
        </div>

        {/* ==========================================
            TABS PHÂN LOẠI 
            ========================================== */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar mb-8 border-b border-[#dee2e6]">
          {TABS.map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-5 py-3 font-semibold text-[14px] transition-all flex items-center gap-2 -mb-[1px] border-b-2 ${
                activeTab === tab 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-[#6c757d] hover:text-[#212529] hover:border-[#adb5bd]'
              }`}
            >
              {tab === 'Đề theo bài' || tab === 'Chuyên đề' ? <BookOpen size={16} /> : <GraduationCap size={16} />}
              {tab}
            </button>
          ))}
        </div>

        {/* ==========================================
            TRẠNG THÁI LOADING / TRỐNG 
            ========================================== */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#6c757d]">
            <Loader2 className="animate-spin mb-3 text-primary" size={32}/>
            <p className="text-[14px] font-medium">Đang tải danh sách đề thi...</p>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center p-16 text-[#6c757d] bg-white border border-[#dee2e6] rounded-2xl shadow-sm">
            <FileText className="mx-auto mb-4 opacity-30" size={48}/>
            <p className="text-[15px] m-0">Hệ thống chưa có đề thi nào trong danh mục <strong className="text-[#212529]">{activeTab}</strong>.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ==========================================
                DANH SÁCH ĐỀ THI THEO NHÓM
                ========================================== */}
            {Object.entries(groupedExams).map(([groupName, groupExams]) => {
              const isExpanded = expandedGroups[groupName] !== false;
              
              return (
                <div key={groupName} className="animate-in fade-in">
                  
                  {/* Tiêu đề Nhóm */}
                  <div 
                    onClick={() => toggleGroup(groupName)}
                    className="flex items-center justify-between cursor-pointer py-3 mb-4 bg-white border border-[#dee2e6] px-5 rounded-xl hover:bg-[#e7f1ff] hover:border-[#b6d4fe] transition-colors group select-none shadow-sm"
                  >
                    <h3 className="text-[15px] font-bold text-[#212529] group-hover:text-[#084298] flex items-center gap-2 m-0 transition-colors">
                      {groupName} 
                      <span className="text-[11px] font-bold font-ui text-[#6c757d] group-hover:text-[#084298] bg-[#e9ecef] group-hover:bg-[#cfe2ff] px-2 py-1 rounded-md ml-2 transition-colors uppercase tracking-wider">
                        {groupExams.length} đề
                      </span>
                    </h3>
                    {isExpanded ? <ChevronDown size={18} className="text-[#adb5bd] group-hover:text-[#084298]"/> : <ChevronRight size={18} className="text-[#adb5bd] group-hover:text-[#084298]"/>}
                  </div>

                  {/* Lưới chứa các thẻ đề thi */}
                  {isExpanded && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                      {groupExams.map(exam => {
                        return (
                          <div key={exam.id} className="bg-white border border-[#dee2e6] rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all flex flex-col h-full group">
                            
                            {/* Tags và Trạng thái */}
                            <div className="flex justify-between items-start mb-4">
                              <span className="bg-[#e7f1ff] text-primary text-[11px] font-bold px-2.5 py-1 rounded-md font-ui uppercase tracking-wider">
                                {exam.type}
                              </span>
                              {exam.myAttemptCount > 0 && (
                                <span className="bg-[#d1e7dd] text-[#198754] text-[11px] font-bold px-2.5 py-1 rounded-md font-ui flex items-center gap-1 uppercase tracking-wider">
                                  <CheckCircle2 size={12}/> Đã làm
                                </span>
                              )}
                            </div>
                            
                            {/* Tên Đề Thi */}
                            <h4 className="text-[16px] font-bold text-[#212529] mb-2 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                              {exam.title}
                            </h4>
                            
                            {/* Thông tin meta (số câu, thời gian) */}
                            <div className="flex items-center gap-4 text-[13px] text-[#6c757d] mb-6 mt-1 font-medium">
                              <span className="flex items-center gap-1.5"><ListChecks size={16} className="text-[#adb5bd]"/> {exam.questionsCount || 40} câu</span>
                              <span className="flex items-center gap-1.5"><Clock size={16} className="text-[#adb5bd]"/> {Math.floor(exam.time_limit/60)} phút</span>
                            </div>

                            {/* Nút Hành động và Điểm số */}
                            <div className="mt-auto pt-4 border-t border-[#e9ecef] flex gap-3 items-center">
                              <Link 
                                to={`/quiz/${exam.id}`} 
                                className="btn-primary flex-1 text-center py-2.5 bg-[#f8f9fa] text-[#212529] border border-[#dee2e6] hover:bg-primary hover:text-white hover:border-primary shadow-none"
                              >
                                {exam.myAttemptCount > 0 ? 'Làm lại đề' : 'Làm bài ngay'}
                              </Link>
                              
                              {exam.myAttemptCount > 0 && (
                                <div className="text-center px-4 border-l border-[#dee2e6]">
                                  <span className="block text-[10px] text-[#6c757d] uppercase font-bold tracking-wide">Điểm</span>
                                  <span className="block text-[15px] font-black text-[#198754] font-ui">{exam.myHighestScore || 0}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
  );
};

export default QuizList;