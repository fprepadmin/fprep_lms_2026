import React, { useState, useEffect, useRef } from 'react';
import {
  PlayCircle, FileText, Download, Eye, Search, Filter,
  Video, Clock, Sparkles, X, CheckCircle2,
  PlusCircle, Trash2, Link2, ExternalLink,
  AlertCircle, Loader2, Info, ImagePlus
} from 'lucide-react';
import { resourceService } from '../../services/resourceService';
import { uploadImageToCloudinary } from '../../config/cloudinary';
import { useAppStore } from '../../store/useAppStore';

// ============================================================
//  GOOGLE DRIVE UTILS
//  Chuyển đổi link Google Drive chia sẻ → link embed / download
// ============================================================

/**
 * Trích xuất File ID từ nhiều dạng link Google Drive:
 * - https://drive.google.com/file/d/{ID}/view?usp=sharing
 * - https://drive.google.com/open?id={ID}
 * - https://drive.google.com/uc?id={ID}
 * - https://docs.google.com/document/d/{ID}/edit
 */
const extractDriveId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/document\/d\/([a-zA-Z0-9_-]+)/,
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/,
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/** Chuyển link Drive → link nhúng (iframe) */
const toDriveEmbedUrl = (url: string): string => {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return url; // trả nguyên nếu không nhận dạng được
};

/** Chuyển link Drive → link tải xuống trực tiếp */
const toDriveDownloadUrl = (url: string): string => {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return url;
};

/** Kiểm tra URL có phải link Google Drive không */
const isGoogleDriveLink = (url: string): boolean =>
  url.includes('drive.google.com') || url.includes('docs.google.com');

/** Lấy thumbnail preview từ Drive ID (cho tài liệu) */
const toDrivePreviewThumb = (url: string): string => {
  const id = extractDriveId(url);
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
  return '';
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
const Resources = () => {
  const { currentUser } = useAppStore();
  const isTeacherOrAdmin = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'video' | 'document'>('video');
  const [selectedChapter, setSelectedChapter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  const [videos, setVideos] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

  // ── Video Modal State ──
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoForm, setVideoForm] = useState({
    title: '', chapter: '', duration: '', teacher: '',
    thumbnail: '', video_url: '', description: ''
  });
  const [savingVideo, setSavingVideo] = useState(false);

  // ── Doc Modal State ──
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '', chapter: '', pages: 0, size: '', category: '', download_url: ''
  });
  const [savingDoc, setSavingDoc] = useState(false);

  // Upload ảnh bìa
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const [thumbProgress, setThumbProgress] = useState(0);

  const handleThumbUpload = async (file: File) => {
    setThumbUploading(true);
    setThumbProgress(0);
    try {
      // Giả lập progress (Cloudinary image upload không có progress callback)
      const timer = setInterval(() => setThumbProgress(p => Math.min(p + 20, 90)), 200);
      const url = await uploadImageToCloudinary(file);
      clearInterval(timer);
      setThumbProgress(100);
      setVideoForm(prev => ({ ...prev, thumbnail: url }));
      setTimeout(() => setThumbProgress(0), 1500);
    } catch (err: any) {
      alert('Lỗi upload ảnh bìa: ' + err.message);
    }
    setThumbUploading(false);
  };

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [videoData, docData] = await Promise.all([
      resourceService.getVideoLectures(),
      resourceService.getStudyDocuments()
    ]);
    setVideos(videoData);
    setDocs(docData);
    setLoading(false);
  };

  // ── Derived chapter list ──
  const chaptersFromData = Array.from(new Set([
    ...videos.map(v => v.chapter).filter(Boolean),
    ...docs.map(d => d.chapter).filter(Boolean)
  ])) as string[];
  const CHAPTERS_LIST = ['Tất cả', ...chaptersFromData];

  const filteredVideos = videos.filter(v => {
    const matchChapter = selectedChapter === 'Tất cả' || v.chapter === selectedChapter;
    const matchSearch = v.title?.toLowerCase().includes(searchQuery.toLowerCase())
      || v.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchChapter && matchSearch;
  });

  const filteredDocs = docs.filter(d => {
    const matchChapter = selectedChapter === 'Tất cả' || d.chapter === selectedChapter;
    const matchSearch = d.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchChapter && matchSearch;
  });

  // ── Save handlers ──
  const handleSaveVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.video_url.trim()) {
      alert('Vui lòng nhập tiêu đề và link video!');
      return;
    }
    setSavingVideo(true);
    // Chuẩn hoá link Drive → embed URL để lưu vào DB
    const normalizedUrl = isGoogleDriveLink(videoForm.video_url)
      ? toDriveEmbedUrl(videoForm.video_url)
      : videoForm.video_url;

    // Tự lấy thumbnail từ Drive nếu chưa nhập
    const thumb = videoForm.thumbnail.trim() ||
      (isGoogleDriveLink(videoForm.video_url) ? toDrivePreviewThumb(videoForm.video_url) : '');

    const result = await resourceService.createVideoLecture({
      ...videoForm,
      video_url: normalizedUrl,
      thumbnail: thumb
    });
    if (result) {
      setVideos(prev => [result, ...prev]);
      setShowVideoModal(false);
      setVideoForm({ title: '', chapter: '', duration: '', teacher: '', thumbnail: '', video_url: '', description: '' });
    }
    setSavingVideo(false);
  };

  const handleSaveDoc = async () => {
    if (!docForm.title.trim() || !docForm.download_url.trim()) {
      alert('Vui lòng nhập tiêu đề và link tài liệu!');
      return;
    }
    setSavingDoc(true);
    // Chuẩn hoá link Drive → download URL
    const normalizedUrl = isGoogleDriveLink(docForm.download_url)
      ? toDriveDownloadUrl(docForm.download_url)
      : docForm.download_url;

    const result = await resourceService.createStudyDocument({
      ...docForm,
      download_url: normalizedUrl
    });
    if (result) {
      setDocs(prev => [result, ...prev]);
      setShowDocModal(false);
      setDocForm({ title: '', chapter: '', pages: 0, size: '', category: '', download_url: '' });
    }
    setSavingDoc(false);
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá video này?')) return;
    const ok = await resourceService.deleteVideoLecture(id);
    if (ok) setVideos(prev => prev.filter(v => v.id !== id));
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xoá tài liệu này?')) return;
    const ok = await resourceService.deleteStudyDocument(id);
    if (ok) setDocs(prev => prev.filter(d => d.id !== id));
  };

  // Hiển thị preview URL link Drive được nhập
  const videoDriveId = extractDriveId(videoForm.video_url);
  const docDriveId = extractDriveId(docForm.download_url);

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      <div className="page-content">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* BANNER */}
          <div className="bg-[#e7f1ff] border border-[#b6d4fe] p-6 md:p-8 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white text-primary px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider mb-2 border border-[#dee2e6]">
                <Sparkles size={14} /> Học liệu phụ bổ trợ
              </div>
              <h1 className="page-header m-0 mb-1">Kho Học Liệu & Tài Liệu</h1>
              <p className="text-[#084298] text-[14px] m-0 max-w-2xl leading-relaxed">
                Video bài giảng và tài liệu PDF chuyên đề giúp củng cố kiến thức Toán 12.
              </p>
            </div>

            <div className="flex bg-white p-1 rounded-xl border border-[#dee2e6] shrink-0">
              <button onClick={() => setActiveTab('video')}
                className={`px-5 py-2.5 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all ${activeTab === 'video' ? 'bg-primary text-white' : 'text-[#495057] hover:text-[#212529]'}`}>
                <Video size={16} /> Video ({videos.length})
              </button>
              <button onClick={() => setActiveTab('document')}
                className={`px-5 py-2.5 rounded-lg font-bold text-[13px] flex items-center gap-2 transition-all ${activeTab === 'document' ? 'bg-primary text-white' : 'text-[#495057] hover:text-[#212529]'}`}>
                <FileText size={16} /> Tài liệu ({docs.length})
              </button>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="bg-white p-4 rounded-xl border border-[#dee2e6] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              <span className="text-[12px] font-bold text-[#6c757d] uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
                <Filter size={14} /> Chương:
              </span>
              {CHAPTERS_LIST.map((chap) => (
                <button key={chap} onClick={() => setSelectedChapter(chap)}
                  className={`px-3.5 py-1.5 rounded-lg font-bold text-[13px] whitespace-nowrap border transition-colors ${
                    selectedChapter === chap ? 'bg-[#e7f1ff] border-primary text-primary' : 'bg-[#f8f9fa] border-[#dee2e6] text-[#495057] hover:bg-[#e9ecef]'
                  }`}>
                  {chap}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-60">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={16} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm..." className="w-full bg-[#f8f9fa] border border-[#dee2e6] rounded-lg pl-10 pr-4 py-2 text-[13px] outline-none focus:border-primary focus:bg-white transition-colors" />
              </div>
              {isTeacherOrAdmin && (
                <button onClick={() => activeTab === 'video' ? setShowVideoModal(true) : setShowDocModal(true)}
                  className="btn-primary whitespace-nowrap">
                  <PlusCircle size={16} /> Thêm {activeTab === 'video' ? 'Video' : 'Tài liệu'}
                </button>
              )}
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="flat-card p-12 text-center">
              <Loader2 size={32} className="animate-spin text-primary mx-auto mb-3" />
              <p className="text-[#6c757d] font-bold">Đang tải tài nguyên...</p>
            </div>
          )}

          {/* VIDEO LIST */}
          {!loading && activeTab === 'video' && (
            filteredVideos.length === 0 ? (
              <div className="flat-card p-12 text-center">
                <Video size={48} className="mx-auto mb-3 opacity-30 text-[#adb5bd]" />
                <p className="font-bold text-[15px] text-[#212529] mb-1">Chưa có video bài giảng nào</p>
                <p className="text-[13px] text-[#6c757d] mb-4">{isTeacherOrAdmin ? 'Nhấn "Thêm Video" để đăng tải bài giảng.' : 'Giáo viên chưa đăng tải video.'}</p>
                {isTeacherOrAdmin && <button onClick={() => setShowVideoModal(true)} className="btn-primary"><PlusCircle size={16} /> Thêm Video Đầu Tiên</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((vid) => (
                  <div key={vid.id} className="flat-card flex flex-col overflow-hidden hover:border-primary transition-all group">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-[#212529] cursor-pointer overflow-hidden" onClick={() => setSelectedVideo(vid)}>
                      {vid.thumbnail
                        ? <img src={vid.thumbnail} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" />
                        : <div className="w-full h-full flex items-center justify-center bg-[#e7f1ff]"><Video size={48} className="text-primary opacity-30" /></div>
                      }
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/10 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                          <PlayCircle size={28} />
                        </div>
                      </div>
                      {vid.duration && (
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock size={12} /> {vid.duration}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        {vid.chapter && <span className="bg-[#e7f1ff] text-primary px-2.5 py-1 rounded font-bold text-[11px] mb-2 inline-block">{vid.chapter}</span>}
                        <h3 className="font-bold text-[15px] text-[#212529] font-heading mb-2 line-clamp-2 group-hover:text-primary transition-colors">{vid.title}</h3>
                        <p className="text-[13px] text-[#6c757d] line-clamp-2 leading-relaxed">{vid.description}</p>
                      </div>
                      <div className="pt-3 border-t border-[#e9ecef] flex items-center justify-between mt-3">
                        <span className="text-[12px] font-bold text-[#495057]">{vid.teacher}</span>
                        <div className="flex items-center gap-2">
                          {isTeacherOrAdmin && (
                            <button onClick={() => handleDeleteVideo(vid.id)} className="p-1.5 text-[#adb5bd] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded-lg transition-colors"><Trash2 size={14} /></button>
                          )}
                          <button onClick={() => setSelectedVideo(vid)} className="btn-primary py-1.5 px-4 text-[13px]">
                            <PlayCircle size={14} /> Xem
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* DOCUMENT LIST */}
          {!loading && activeTab === 'document' && (
            filteredDocs.length === 0 ? (
              <div className="flat-card p-12 text-center">
                <FileText size={48} className="mx-auto mb-3 opacity-30 text-[#adb5bd]" />
                <p className="font-bold text-[15px] text-[#212529] mb-1">Chưa có tài liệu nào</p>
                <p className="text-[13px] text-[#6c757d] mb-4">{isTeacherOrAdmin ? 'Nhấn "Thêm Tài liệu" để đăng tải.' : 'Giáo viên chưa đăng tải tài liệu.'}</p>
                {isTeacherOrAdmin && <button onClick={() => setShowDocModal(true)} className="btn-primary"><PlusCircle size={16} /> Thêm Tài Liệu Đầu Tiên</button>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDocs.map((doc) => (
                  <div key={doc.id} className="flat-card p-5 hover:border-primary transition-all flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#f8d7da] text-[#dc3545] border border-[#f5c2c7] flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {doc.category && <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f8f9fa] text-[#495057] border border-[#dee2e6] px-2 py-0.5 rounded">{doc.category}</span>}
                        {doc.pages ? <span className="text-[11px] text-[#6c757d] font-bold">{doc.pages} trang</span> : null}
                        {doc.size ? <span className="text-[11px] text-[#6c757d]">• {doc.size}</span> : null}
                      </div>
                      <h3 className="font-bold text-[15px] text-[#212529] font-heading mb-1 truncate">{doc.title}</h3>
                      {doc.chapter && <p className="text-[12px] text-[#6c757d] mb-3 truncate">{doc.chapter}</p>}
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedDoc(doc)} className="btn-secondary py-1.5 px-3 text-[12px]"><Eye size={14} /> Xem trước</button>
                        <a href={doc.download_url} target="_blank" rel="noopener noreferrer" className="btn-primary py-1.5 px-3 text-[12px]"><Download size={14} /> Tải xuống</a>
                        {isTeacherOrAdmin && (
                          <button onClick={() => handleDeleteDoc(doc.id)} className="p-1.5 text-[#adb5bd] hover:text-[#dc3545] hover:bg-[#f8d7da] rounded-lg transition-colors"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>

      {/* ── MODAL XEM VIDEO ── */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full overflow-hidden shadow-2xl border border-[#dee2e6]">
            <div className="p-4 bg-[#f8f9fa] border-b border-[#dee2e6] flex items-center justify-between">
              <div>
                {selectedVideo.chapter && <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">{selectedVideo.chapter}</span>}
                <h3 className="font-bold text-[16px] text-[#212529] font-heading m-0 truncate">{selectedVideo.title}</h3>
              </div>
              <button onClick={() => setSelectedVideo(null)} className="p-1 text-[#adb5bd] hover:text-[#dc3545]"><X size={20} /></button>
            </div>
            <div className="relative aspect-video bg-black">
              <iframe className="w-full h-full"
                src={selectedVideo.video_url?.includes('youtube.com/watch')
                  ? selectedVideo.video_url.replace('watch?v=', 'embed/') + '?autoplay=1'
                  : selectedVideo.video_url}
                title={selectedVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen />
            </div>
            {isGoogleDriveLink(selectedVideo.video_url) && (
              <div className="px-5 py-3 bg-[#fff3cd] border-b border-[#ffecb5] text-[#664d03] text-[13px] flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div>
                  Nếu video không phát được hoặc hiển thị màn hình trống, vui lòng nhấn{' '}
                  <a href={selectedVideo.video_url.replace('/preview', '/view')} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-[#4d3a02]">
                    Mở trong tab mới <ExternalLink size={12} className="inline mb-0.5" />
                  </a>.
                   Hãy đảm bảo tài liệu này được chia sẻ ở chế độ <strong>"Bất kỳ ai có liên kết"</strong> trên Google Drive.
                </div>
              </div>
            )}
            {selectedVideo.description && (
              <div className="p-5">
                <h4 className="font-bold text-[14px] text-[#212529] mb-1">Mô tả:</h4>
                <p className="text-[13px] text-[#495057] leading-relaxed">{selectedVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL XEM TÀI LIỆU ── */}
      {selectedDoc && (
        <div className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-[#dee2e6] flex flex-col">
            <div className="p-4 bg-[#f8f9fa] border-b border-[#dee2e6] flex items-center justify-between">
              <div>
                {selectedDoc.category && <span className="text-[11px] font-bold text-[#dc3545] uppercase tracking-wider block">{selectedDoc.category}</span>}
                <h3 className="font-bold text-[16px] text-[#212529] font-heading m-0 truncate">{selectedDoc.title}</h3>
              </div>
              <button onClick={() => setSelectedDoc(null)} className="p-1 text-[#adb5bd] hover:text-[#dc3545]"><X size={20} /></button>
            </div>

            {/* Nhúng Google Drive Preview */}
            {extractDriveId(selectedDoc.download_url || '') ? (
              <>
                <iframe
                  className="flex-1 w-full"
                  src={`https://drive.google.com/file/d/${extractDriveId(selectedDoc.download_url)}/preview`}
                  allow="autoplay"
                  title={selectedDoc.title}
                />
                <div className="px-5 py-3 bg-[#fff3cd] border-t border-b border-[#ffecb5] text-[#664d03] text-[13px] flex items-start gap-2 shrink-0">
                  <Info size={16} className="shrink-0 mt-0.5" />
                  <div>
                    Nếu tài liệu hiển thị màn hình trắng hoặc từ chối kết nối, vui lòng nhấn{' '}
                    <a href={`https://drive.google.com/file/d/${extractDriveId(selectedDoc.download_url)}/view`} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-[#4d3a02]">
                      Mở trong tab mới <ExternalLink size={12} className="inline mb-0.5" />
                    </a>{' '}
                    hoặc tải trực tiếp ở nút bên dưới. Đảm bảo file được chia sẻ chế độ <strong>"Bất kỳ ai có liên kết"</strong>.
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center flex-1 flex flex-col items-center justify-center bg-[#f8f9fa]">
                <FileText size={64} className="mx-auto text-[#dc3545] mb-3 opacity-60" />
                <p className="font-bold text-[15px] text-[#212529] mb-1">{selectedDoc.title}</p>
                <p className="text-[13px] text-[#6c757d] mb-4">
                  {selectedDoc.size ? `Dung lượng: ${selectedDoc.size}` : ''}{selectedDoc.pages ? ` • ${selectedDoc.pages} trang` : ''}
                </p>
                <div className="inline-flex items-center gap-2 bg-[#d1e7dd] text-[#0f5132] px-4 py-2 rounded-lg text-[13px] font-bold border border-[#a3cfbb]">
                  <CheckCircle2 size={16} /> File sẵn sàng tải xuống
                </div>
              </div>
            )}

            <div className="p-4 border-t border-[#dee2e6] flex justify-end gap-3 bg-white">
              <button onClick={() => setSelectedDoc(null)} className="btn-secondary">Đóng</button>
              <a href={selectedDoc.download_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <Download size={16} /> Tải xuống
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM VIDEO (Giáo viên/Admin) ── */}
      {showVideoModal && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dee2e6]">
            <div className="sticky top-0 bg-white border-b border-[#dee2e6] p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-[17px] text-[#212529] font-heading flex items-center gap-2">
                <Video size={18} className="text-primary" /> Thêm Video Bài Giảng
              </h3>
              <button onClick={() => setShowVideoModal(false)} className="p-1 text-[#adb5bd] hover:text-[#dc3545]"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">

              {/* Hướng dẫn */}
              <div className="flex items-start gap-3 bg-[#e7f1ff] border border-[#b6d4fe] rounded-xl p-4">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <div className="text-[13px] text-[#084298]">
                  <p className="font-bold mb-1">Hướng dẫn lấy link Google Drive:</p>
                  <ol className="list-decimal list-inside space-y-0.5 font-medium">
                    <li>Mở file video trên Google Drive</li>
                    <li>Nhấn chuột phải → <strong>Chia sẻ</strong> → đặt quyền <strong>"Bất kỳ ai có đường liên kết"</strong></li>
                    <li>Sao chép link và dán vào ô bên dưới</li>
                  </ol>
                </div>
              </div>

              {/* Link Video */}
              <div className="flat-card space-y-3">
                <label className="block text-[12px] font-bold text-[#212529] uppercase tracking-wider">
                  Link Video <span className="text-[#dc3545]">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={16} />
                  <input
                    value={videoForm.video_url}
                    onChange={e => setVideoForm(p => ({ ...p, video_url: e.target.value }))}
                    className="w-full border border-[#dee2e6] rounded-lg pl-9 pr-4 py-2.5 text-[13px] font-mono outline-none focus:border-primary bg-[#f8f9fa] focus:bg-white"
                    placeholder="https://drive.google.com/file/d/... hoặc https://youtube.com/..."
                  />
                </div>
                {/* Preview kiểm tra link */}
                {videoDriveId && (
                  <div className="flex items-center gap-2 bg-[#d1e7dd] border border-[#a3cfbb] rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} className="text-[#198754]" />
                    <span className="text-[12px] font-bold text-[#0f5132]">Nhận diện Google Drive ID:</span>
                    <code className="text-[12px] text-[#0f5132] font-mono">{videoDriveId.slice(0, 20)}...</code>
                  </div>
                )}
                {videoForm.video_url && !videoDriveId && !videoForm.video_url.includes('youtube') && (
                  <div className="flex items-center gap-2 bg-[#fff3cd] border border-[#ffecb5] rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="text-[#664d03]" />
                    <span className="text-[12px] text-[#664d03] font-medium">Không nhận dạng được link Drive. Sẽ lưu nguyên link.</span>
                  </div>
                )}
              </div>

              {/* Thông tin bài giảng */}
              <div className="flat-card space-y-4">
                <h4 className="font-bold text-[12px] text-[#6c757d] uppercase tracking-wider">Thông tin bài giảng</h4>
                <div>
                  <label className="block text-[12px] font-bold text-[#212529] mb-1">Tiêu đề <span className="text-[#dc3545]">*</span></label>
                  <input value={videoForm.title} onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                    placeholder="VD: Tính đơn điệu và Cực trị Hàm số (Toàn tập)" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Chương / Phần</label>
                    <input value={videoForm.chapter} onChange={e => setVideoForm(p => ({ ...p, chapter: e.target.value }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="VD: Chương 1" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Thời lượng</label>
                    <input value={videoForm.duration} onChange={e => setVideoForm(p => ({ ...p, duration: e.target.value }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="VD: 45 phút" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Giáo viên</label>
                    <input value={videoForm.teacher} onChange={e => setVideoForm(p => ({ ...p, teacher: e.target.value }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="Thầy / Cô..." />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Ảnh bìa (tuỳ chọn)</label>
                    {/* Input ẩn để chọn file */}
                    <input
                      ref={thumbInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleThumbUpload(f);
                        e.target.value = '';
                      }}
                    />
                    <div className="flex gap-2">
                      <input
                        value={videoForm.thumbnail}
                        onChange={e => setVideoForm(p => ({ ...p, thumbnail: e.target.value }))}
                        className="flex-1 border border-[#dee2e6] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary"
                        placeholder="URL ảnh hoặc tải lên →" />
                      <button
                        type="button"
                        onClick={() => thumbInputRef.current?.click()}
                        disabled={thumbUploading}
                        className="shrink-0 flex items-center gap-1.5 bg-[#e7f1ff] border border-primary text-primary px-3 py-2 rounded-lg text-[12px] font-bold hover:bg-primary hover:text-white transition-colors disabled:opacity-60"
                        title="Tải ảnh lên Cloudinary"
                      >
                        {thumbUploading
                          ? <><Loader2 size={14} className="animate-spin" /> {thumbProgress}%</>
                          : <><ImagePlus size={14} /> Tải lên</>}
                      </button>
                    </div>
                    {/* Progress bar */}
                    {thumbUploading && (
                      <div className="mt-1.5 w-full bg-[#dee2e6] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${thumbProgress}%` }} />
                      </div>
                    )}
                    {videoForm.thumbnail && !thumbUploading && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-[#198754]" />
                        <span className="text-[11px] font-bold text-[#198754]">Ảnh bìa đã sẵn sàng</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#212529] mb-1">Mô tả ngắn</label>
                  <textarea value={videoForm.description} onChange={e => setVideoForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary resize-none"
                    placeholder="Nội dung chính của bài giảng..." />
                </div>
              </div>

              {/* Preview thumbnail nếu có */}
              {(videoForm.thumbnail || videoDriveId) && (
                <div className="flat-card">
                  <h4 className="font-bold text-[12px] text-[#6c757d] uppercase tracking-wider mb-3">Xem trước ảnh bìa</h4>
                  <div className="aspect-video rounded-lg overflow-hidden bg-[#f8f9fa] border border-[#dee2e6]">
                    <img
                      src={videoForm.thumbnail || toDrivePreviewThumb(videoForm.video_url)}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-[#f8f9fa] border-t border-[#dee2e6] p-4 flex justify-end gap-3">
              <button onClick={() => setShowVideoModal(false)} className="btn-secondary">Huỷ</button>
              <button onClick={handleSaveVideo} disabled={savingVideo || !videoForm.title.trim() || !videoForm.video_url.trim()} className="btn-primary disabled:opacity-50">
                {savingVideo ? <><Loader2 size={16} className="animate-spin" /> Đang lưu...</> : <><PlusCircle size={16} /> Đăng Tải Video</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL THÊM TÀI LIỆU (Giáo viên/Admin) ── */}
      {showDocModal && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-[#dee2e6]">
            <div className="sticky top-0 bg-white border-b border-[#dee2e6] p-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-[17px] text-[#212529] font-heading flex items-center gap-2">
                <FileText size={18} className="text-[#dc3545]" /> Thêm Tài Liệu PDF
              </h3>
              <button onClick={() => setShowDocModal(false)} className="p-1 text-[#adb5bd] hover:text-[#dc3545]"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">

              {/* Hướng dẫn */}
              <div className="flex items-start gap-3 bg-[#e7f1ff] border border-[#b6d4fe] rounded-xl p-4">
                <Info size={16} className="text-primary shrink-0 mt-0.5" />
                <div className="text-[13px] text-[#084298]">
                  <p className="font-bold mb-1">Hướng dẫn lấy link Google Drive:</p>
                  <ol className="list-decimal list-inside space-y-0.5 font-medium">
                    <li>Tải file PDF lên Google Drive</li>
                    <li>Chuột phải → <strong>Chia sẻ</strong> → đặt quyền <strong>"Bất kỳ ai có đường liên kết"</strong></li>
                    <li>Nhấn <strong>Sao chép đường liên kết</strong> và dán vào đây</li>
                  </ol>
                </div>
              </div>

              {/* Link tài liệu */}
              <div className="flat-card space-y-3">
                <label className="block text-[12px] font-bold text-[#212529] uppercase tracking-wider">
                  Link Google Drive <span className="text-[#dc3545]">*</span>
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-[#adb5bd]" size={16} />
                  <input
                    value={docForm.download_url}
                    onChange={e => setDocForm(p => ({ ...p, download_url: e.target.value }))}
                    className="w-full border border-[#dee2e6] rounded-lg pl-9 pr-4 py-2.5 text-[13px] font-mono outline-none focus:border-primary bg-[#f8f9fa] focus:bg-white"
                    placeholder="https://drive.google.com/file/d/..."
                  />
                </div>
                {docDriveId && (
                  <div className="flex items-center gap-2 bg-[#d1e7dd] border border-[#a3cfbb] rounded-lg px-3 py-2">
                    <CheckCircle2 size={14} className="text-[#198754]" />
                    <span className="text-[12px] font-bold text-[#0f5132]">Nhận diện Google Drive ID:</span>
                    <code className="text-[12px] text-[#0f5132] font-mono">{docDriveId.slice(0, 20)}...</code>
                  </div>
                )}
                {docForm.download_url && !docDriveId && (
                  <div className="flex items-center gap-2 bg-[#fff3cd] border border-[#ffecb5] rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="text-[#664d03]" />
                    <span className="text-[12px] text-[#664d03] font-medium">Không nhận dạng được link Drive. Sẽ lưu nguyên link.</span>
                  </div>
                )}
              </div>

              {/* Thông tin tài liệu */}
              <div className="flat-card space-y-4">
                <h4 className="font-bold text-[12px] text-[#6c757d] uppercase tracking-wider">Thông tin tài liệu</h4>
                <div>
                  <label className="block text-[12px] font-bold text-[#212529] mb-1">Tiêu đề <span className="text-[#dc3545]">*</span></label>
                  <input value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                    placeholder="VD: Tổng hợp Công thức Giải nhanh Toán 12" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Chương / Phần</label>
                    <input value={docForm.chapter} onChange={e => setDocForm(p => ({ ...p, chapter: e.target.value }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="VD: Chương 1" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Danh mục</label>
                    <input value={docForm.category} onChange={e => setDocForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="VD: Sổ tay công thức" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Số trang</label>
                    <input type="number" min={0} value={docForm.pages || ''}
                      onChange={e => setDocForm(p => ({ ...p, pages: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="VD: 28" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-[#212529] mb-1">Kích thước</label>
                    <input value={docForm.size} onChange={e => setDocForm(p => ({ ...p, size: e.target.value }))}
                      className="w-full border border-[#dee2e6] rounded-lg px-3 py-2 text-[14px] outline-none focus:border-primary"
                      placeholder="VD: 4.2 MB" />
                  </div>
                </div>
              </div>

              {/* Preview tài liệu Drive */}
              {docDriveId && (
                <div className="flat-card">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-[12px] text-[#6c757d] uppercase tracking-wider">Xem trước tài liệu</h4>
                    <a href={`https://drive.google.com/file/d/${docDriveId}/view`} target="_blank" rel="noopener noreferrer"
                      className="text-[12px] text-primary font-bold flex items-center gap-1 hover:underline">
                      <ExternalLink size={12} /> Mở trong Drive
                    </a>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-[#dee2e6]" style={{ height: 200 }}>
                    <iframe
                      src={`https://drive.google.com/file/d/${docDriveId}/preview`}
                      className="w-full h-full"
                      allow="autoplay"
                      title="Preview tài liệu"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-[#f8f9fa] border-t border-[#dee2e6] p-4 flex justify-end gap-3">
              <button onClick={() => setShowDocModal(false)} className="btn-secondary">Huỷ</button>
              <button onClick={handleSaveDoc} disabled={savingDoc || !docForm.title.trim() || !docForm.download_url.trim()} className="btn-primary disabled:opacity-50">
                {savingDoc ? <><Loader2 size={16} className="animate-spin" /> Đang lưu...</> : <><PlusCircle size={16} /> Đăng Tải Tài Liệu</>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Resources;
