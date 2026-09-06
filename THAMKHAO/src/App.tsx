import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';

const LandingPage = lazy(() => import('./pages/common/LandingPage'));
const LoginPage = lazy(() => import('./pages/common/LoginPage'));
const Profile = lazy(() => import('./pages/common/Profile'));
const OverviewSwitcher = lazy(() => import('./pages/common/OverviewSwitcher'));

const Theory = lazy(() => import('./pages/student/Theory'));
const Resources = lazy(() => import('./pages/student/Resources'));
const QuizList = lazy(() => import('./pages/student/QuizList'));
const QuizDetail = lazy(() => import('./pages/student/QuizDetail'));
const QuizTaking = lazy(() => import('./pages/student/QuizTaking')); 
const LiveExamRoom = lazy(() => import('./pages/student/LiveExamRoom')); 
const Classroom = lazy(() => import('./pages/student/Classroom'));
const Leaderboard = lazy(() => import('./pages/student/Leaderboard'));
const JoinClass = lazy(() => import('./pages/student/JoinClass'));
const JoinLive = lazy(() => import('./pages/student/JoinLive'));

const ClassManager = lazy(() => import('./pages/teacher/ClassManager'));
const QuestionBank = lazy(() => import('./pages/teacher/QuestionBank'));
const ExamBank = lazy(() => import('./pages/teacher/ExamBank'));
const ExamCreator = lazy(() => import('./pages/teacher/ExamCreator'));
const TheoryEditor = lazy(() => import('./pages/teacher/TheoryEditor'));
const ExamEditor = lazy(() => import('./pages/teacher/ExamEditor'));
const LiveSessionManager = lazy(() => import('./pages/teacher/LiveSessionManager'));
const LiveMonitor = lazy(() => import('./pages/teacher/LiveMonitor'));

const UserManagement = lazy(() => import('./pages/admin/UserManagement'));

const FullPageLoading = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#f8f9fa] select-none animate-in fade-in">
    <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 border border-primary/20 animate-ping"></div>
        <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-xl shadow-lg font-heading">
          F12
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-extrabold text-[16px] text-[#212529] font-heading m-0">FMath Infinity Studio</h3>
        <p className="text-[13px] text-[#6c757d] font-medium m-0">Hệ thống Học tập & Khảo thí Toán 12 • Đang nạp dữ liệu...</p>
      </div>

      <div className="w-48 h-1.5 bg-[#e9ecef] rounded-full overflow-hidden border border-[#dee2e6]">
        <div className="h-full bg-primary rounded-full w-2/3 animate-pulse"></div>
      </div>
    </div>
  </div>
);

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="bg-white border border-slate-200 p-10 rounded-xl text-center flex flex-col items-center justify-center h-full min-h-[350px] shadow-sm max-w-2xl mx-auto my-8">
    <h2 className="text-xl font-bold text-slate-700 mb-2">{title}</h2>
    <p className="text-slate-500 mb-6 text-sm max-w-sm">Tính năng này đang được phát triển.</p>
    <button onClick={() => window.history.back()} className="btn-secondary px-6">Quay lại</button>
  </div>
);

function App() {
  return (
    // FIX WARNING REACT ROUTER V7 BẰNG CÁCH THÊM CỜ FUTURE NÀY
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Suspense fallback={<FullPageLoading />}><LandingPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<FullPageLoading />}><LoginPage /></Suspense>} />
        
        {/* ==============================================================
            PHÂN HỆ KHẢO THÍ ĐỘC LẬP 100% (STANDALONE EXAMINATION MODULE) 
            ============================================================== */}
        <Route path="/join-live" element={<Suspense fallback={<FullPageLoading />}><JoinLive /></Suspense>} />
        <Route path="/student/exam/:id" element={<Suspense fallback={<FullPageLoading />}><LiveExamRoom /></Suspense>} />
        <Route path="/quiz/:id/take" element={<Suspense fallback={<FullPageLoading />}><QuizTaking /></Suspense>} />
        <Route path="/live-sessions" element={<Suspense fallback={<FullPageLoading />}><LiveSessionManager /></Suspense>} />
        <Route path="/live-monitor/:sessionId" element={<Suspense fallback={<FullPageLoading />}><LiveMonitor /></Suspense>} />

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<OverviewSwitcher />} />
          <Route path="/overview" element={<OverviewSwitcher />} />
          <Route path="/profile" element={<Profile />} />
          
          <Route path="/join/:code" element={<JoinClass />} />
          <Route path="/theory" element={<Theory />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/quiz" element={<QuizList />} />
          <Route path="/quiz/:id" element={<QuizDetail />} />
          <Route path="/classroom" element={<Classroom />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          
          <Route path="/class-manager" element={<ClassManager />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/exam-bank" element={<ExamBank />} />
          <Route path="/exam-creator" element={<ExamCreator />} />
          <Route path="/theory-editor/:lessonId" element={<TheoryEditor />} /> 
          <Route path="/exam-editor" element={<ExamEditor />} />
          
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/grading" element={<PlaceholderPage title="Chấm điểm & Giao bài" />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;