"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Newspaper, Youtube, Settings, LogOut, 
  Plus, Edit, Trash2, Save, X, Image as ImageIcon, Link as LinkIcon,
  Video, Bold, AlertCircle, CheckCircle, UploadCloud, Loader2, Lock, Menu, Rocket, ImagePlus
} from 'lucide-react';

export default function AdminPanel() {
  // === STATE AUTHENTICATION & UI ===
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // === STATE DATA (MongoDB Source) ===
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [tools, setTools] = useState([]);
  const [heroImages, setHeroImages] = useState([]);
  const [cloudConfig, setCloudConfig] = useState({ name: '', preset: '' });

  // === STATE FORMS ===
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [currentNews, setCurrentNews] = useState(null);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', images: [], date: '' });
  
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ judul: '', deskripsi: '', url: '' });

  const [isEditingTool, setIsEditingTool] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [toolForm, setToolForm] = useState({ name: '', url: '', type: 'link', fileUrl: '' });

  const [isUploading, setIsUploading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const savedPass = sessionStorage.getItem('tk_admin_pass');
    if (savedPass) {
      setAdminPass(savedPass);
      setIsLoggedIn(true);
      fetchData(savedPass);
    } else {
      setIsLoading(false);
    }
  }, []);

  // === HARDWARE BACK BUTTON (HP SWIPE BACK) ===
  useEffect(() => {
    const handlePopState = () => {
      if (isMobileMenuOpen) setIsMobileMenuOpen(false);
      else if (isEditingNews) setIsEditingNews(false);
      else if (isEditingVideo) setIsEditingVideo(false);
      else if (isEditingTool) setIsEditingTool(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobileMenuOpen, isEditingNews, isEditingVideo, isEditingTool]);

  const pushHistory = () => {
    window.history.pushState({ open: true }, '');
  };

  // === FUNGSI FETCH API (BACA DATA) ===
  const fetchData = async (password) => {
    setIsLoading(true);
    try {
      // 1. Fetch Publik (Berita & Video)
      const resContent = await fetch('/api/content?t=' + new Date().getTime());
      if (resContent.ok) {
        const data = await resContent.json();
        if (data.news) setNews(data.news);
        if (data.videos) setVideos(data.videos);
      }

      // 2. Fetch Terlindungi (Tools, Hero, Config)
      const reqHeaders = { 'x-admin-pass': password };
      
      const resCloud = await fetch('/api/admin?action=cloud_config', { headers: reqHeaders });
      if (resCloud.ok) {
        const cloudData = await resCloud.json();
        setCloudConfig({ name: cloudData.name || '', preset: cloudData.preset || '' });
      } else {
        sessionStorage.removeItem('tk_admin_pass');
        setIsLoggedIn(false);
        showNotif('Sesi kedaluwarsa atau password salah.', 'error');
        setIsLoading(false);
        return;
      }

      const resHero = await fetch('/api/admin?action=hero', { headers: reqHeaders });
      if (resHero.ok) {
        const hData = await resHero.json();
        setHeroImages(hData.images || []);
      }

      const resTools = await fetch('/api/admin?action=tools', { headers: reqHeaders });
      if (resTools.ok) {
        const tData = await resTools.json();
        setTools(tData || []);
      }

    } catch (e) {
      console.error(e);
      showNotif('Gagal memuat data dari server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // === FUNGSI API MUTASI ===
  const apiCall = async (method, payload) => {
    try {
      const res = await fetch('/api/admin', {
        method: method,
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': adminPass },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi Kesalahan Server');
      return { success: true, data };
    } catch (err) {
      showNotif(err.message, 'error');
      return { success: false };
    }
  };

  const showNotif = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // === AUTHENTICATION ===
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/admin?action=cloud_config', { headers: { 'x-admin-pass': adminPass } });
      if (res.ok) {
        sessionStorage.setItem('tk_admin_pass', adminPass);
        setIsLoggedIn(true);
        fetchData(adminPass);
        showNotif('Login Berhasil!');
      } else {
        showNotif('Password Salah!', 'error');
      }
    } catch (err) {
      showNotif('Gagal terhubung ke server.', 'error');
    }
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tk_admin_pass');
    setIsLoggedIn(false);
    setAdminPass('');
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    setIsEditingNews(false);
    setIsEditingVideo(false);
    setIsEditingTool(false);
  };

  // === FUNGSI CLOUDINARY UPLOAD (Auto Compress WebP) ===
  const uploadToCloudinary = async (files) => {
    if (!cloudConfig.name || !cloudConfig.preset) {
      showNotif('Pengaturan Cloudinary belum diisi!', 'error');
      return [];
    }
    setIsUploading(true);
    const uploadedUrls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', cloudConfig.preset);
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudConfig.name}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.secure_url) {
          const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
          uploadedUrls.push(optimizedUrl);
        } else {
          showNotif(`Gagal upload: ${data.error?.message}`, 'error');
        }
      } catch (err) {
        showNotif('Error jaringan saat upload.', 'error');
      }
    }
    setIsUploading(false);
    return uploadedUrls;
  };

  // Handlers for News Images
  const handleNewsFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const urls = await uploadToCloudinary(files);
    if (urls.length > 0) {
      setNewsForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      showNotif(`Berhasil unggah ${urls.length} foto.`);
    }
    e.target.value = '';
  };
  const addNewsImageViaUrl = () => {
    const url = prompt("Masukkan URL Gambar Publik:");
    if (url) setNewsForm(prev => ({ ...prev, images: [...prev.images, url] }));
  };
  const removeNewsImage = (index) => {
    setNewsForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== index) }));
  };

  // Handlers for Hero Images
  const handleHeroFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const urls = await uploadToCloudinary(files);
    if (urls.length > 0) {
      setHeroImages(prev => [...prev, ...urls]);
      showNotif(`Berhasil unggah ${urls.length} foto Header.`);
    }
    e.target.value = '';
  };
  const addHeroImageViaUrl = () => {
    const url = prompt("Masukkan URL Gambar Publik:");
    if (url) setHeroImages(prev => [...prev, url]);
  };
  const removeHeroImage = (index) => {
    setHeroImages(prev => prev.filter((_, idx) => idx !== index));
  };
  const saveHeroImages = async () => {
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'hero', data: { images: heroImages } });
    if (res.success) showNotif('Foto Header Beranda berhasil diperbarui!');
    setIsLoading(false);
  };

  // === EDITOR RICH TEXT ===
  const insertAtCursor = (textToInsert) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, startPos) + textToInsert + text.substring(endPos, text.length);
    setNewsForm(prev => ({ ...prev, content: newText }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + textToInsert.length;
      textarea.selectionEnd = startPos + textToInsert.length;
    }, 10);
  };

  const handleToolbarClick = (action) => {
    switch(action) {
      case 'bold': insertAtCursor('<b>Teks Tebal</b>'); break;
      case 'link': 
        const url = prompt('Masukkan URL Link:');
        if (url) insertAtCursor(`<a href="${url}" target="_blank" class="text-blue-600 underline">Teks Link</a>`);
        break;
      case 'image':
        const imgUrl = prompt('Masukkan URL Gambar:');
        if (imgUrl) insertAtCursor(`<img src="${imgUrl}" alt="Gambar" loading="lazy" class="rounded-xl my-4 w-full h-auto shadow-sm" />`);
        break;
      case 'youtube':
        const yt = prompt('Masukkan Link YouTube:');
        if (yt) {
          const m = yt.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
          if (m && m[1]) insertAtCursor(`<div class="aspect-video w-full my-4 rounded-xl overflow-hidden shadow-sm bg-gray-900"><iframe src="https://www.youtube.com/embed/${m[1]}" class="w-full h-full border-0" allowfullscreen></iframe></div>`);
          else alert('Link YouTube tidak valid!');
        }
        break;
      default: break;
    }
  };

  // === CRUD BERITA ===
  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) return showNotif('Judul dan isi wajib!', 'error');
    const finalDate = newsForm.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const payload = { ...newsForm, date: finalDate };
    
    setIsLoading(true);
    let res = currentNews ? await apiCall('PUT', { type: 'news', id: currentNews._id, data: payload }) : await apiCall('POST', { type: 'news', data: payload });
    if (res.success) {
      showNotif(currentNews ? 'Berita diperbarui!' : 'Berita ditambahkan!');
      setIsEditingNews(false);
      fetchData(adminPass);
    }
    setIsLoading(false);
  };

  const deleteNews = async (id) => {
    if (confirm('Hapus berita ini secara permanen dari Database?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'news', id });
      if (res.success) { showNotif('Berita dihapus.'); fetchData(adminPass); }
      setIsLoading(false);
    }
  };

  // === CRUD VIDEO ===
  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!videoForm.judul || !videoForm.url) return showNotif('Judul & URL wajib!', 'error');
    setIsLoading(true);
    let res = currentVideo ? await apiCall('PUT', { type: 'videos', id: currentVideo._id, data: videoForm }) : await apiCall('POST', { type: 'videos', data: videoForm });
    if (res.success) {
      showNotif('Video tersimpan!');
      setIsEditingVideo(false);
      fetchData(adminPass);
    }
    setIsLoading(false);
  };

  const deleteVideo = async (id) => {
    if (confirm('Hapus video permanen?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'videos', id });
      if (res.success) { showNotif('Video dihapus.'); fetchData(adminPass); }
      setIsLoading(false);
    }
  };

  // === CRUD TOOLS/HTML ===
  const handleSaveTool = async (e) => {
    e.preventDefault();
    if (!toolForm.name) return showNotif('Nama Tool wajib diisi!', 'error');
    setIsLoading(true);
    let res = currentTool ? await apiCall('PUT', { type: 'tools', id: currentTool._id, data: toolForm }) : await apiCall('POST', { type: 'tools', data: toolForm });
    if (res.success) {
      showNotif('Tool/Aplikasi tersimpan!');
      setIsEditingTool(false);
      fetchData(adminPass);
    }
    setIsLoading(false);
  };

  const deleteTool = async (id) => {
    if (confirm('Hapus Tool permanen?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'tools', id });
      if (res.success) { showNotif('Tool dihapus.'); fetchData(adminPass); }
      setIsLoading(false);
    }
  };

  const handleSaveCloudConfig = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'cloud_config', data: { name: cloudConfig.name, preset: cloudConfig.preset } });
    if (res.success) showNotif('Pengaturan Cloudinary disimpan ke Database!');
    setIsLoading(false);
  };

  // === UI KOMPONEN ===

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_black_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
        <form onSubmit={handleLogin} className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] shadow-2xl border border-white/50 w-full max-w-md relative z-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock size={32} className="text-blue-600" />
          </div>
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">Panel Admin TK</h1>
          <p className="text-gray-500 font-medium mb-8">Silakan masukkan sandi untuk mengakses sistem.</p>
          <input 
            type="password" 
            value={adminPass}
            onChange={e => setAdminPass(e.target.value)}
            required autoFocus
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-center text-xl tracking-widest font-bold text-gray-800 mb-6"
            placeholder="••••••••"
          />
          <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 flex justify-center items-center gap-2">
            {isLoggingIn ? <Loader2 className="animate-spin" size={24} /> : 'Masuk Sistem'}
          </button>
        </form>
        {notification && (
          <div className="fixed top-6 right-6 z-50">
            <div className={`px-6 py-4 rounded-2xl shadow-xl font-bold border ${notification.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
              {notification.message}
            </div>
          </div>
        )}
      </div>
    );
  }

  const renderLoader = () => (
    <div className={`fixed inset-0 bg-white/80 backdrop-blur-sm z-[50000] flex justify-center items-center transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <Loader2 size={48} className="text-blue-600 animate-spin mb-4" />
        <p className="font-bold text-gray-700">Sinkronisasi Server...</p>
      </div>
    </div>
  );

  const renderNotification = () => {
    if (!notification) return null;
    return (
      <div className="fixed top-6 right-4 md:right-6 z-[60000] animate-in slide-in-from-right-8 fade-in duration-300">
        <div className={`flex items-center gap-3 px-5 py-3 md:px-6 md:py-4 rounded-2xl shadow-xl backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-700' : 'bg-green-50/90 border-green-200 text-green-700'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <>
      {/* MOBILE HEADER */}
      <div className="md:hidden bg-white/90 backdrop-blur-xl border-b border-gray-100 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center text-white shadow-md">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-gray-900 leading-tight">Admin TK</h1>
            <p className="text-[10px] text-green-600 font-bold tracking-wider">ONLINE</p>
          </div>
        </div>
        <button onClick={() => { pushHistory(); setIsMobileMenuOpen(true); }} className="p-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-700 transition-colors border border-gray-200">
          <Menu size={22} />
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* SIDEBAR */}
      <aside className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white/95 backdrop-blur-3xl border-r border-white/50 shadow-[20px_0_60px_rgba(0,0,0,0.05)] flex flex-col z-[9999] transform transition-transform duration-500 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 md:p-8 pb-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <LayoutDashboard size={24} />
             </div>
             <div>
               <h2 className="font-bold text-xl text-gray-900 tracking-tight leading-tight">Admin TK</h2>
               <p className="text-[11px] font-bold text-gray-500 tracking-wider">DATABASE PANEL</p>
             </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 bg-gray-50 rounded-full text-gray-500">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto mt-4">
          <button onClick={() => selectTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button onClick={() => selectTab('hero')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'hero' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <ImagePlus size={20} /> Header / Profil
          </button>
          <button onClick={() => selectTab('news')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'news' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <Newspaper size={20} /> Kelola Berita
          </button>
          <button onClick={() => selectTab('videos')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'videos' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <Youtube size={20} /> Kelola Video
          </button>
          <button onClick={() => selectTab('tools')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'tools' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <Rocket size={20} /> Tools / HTML
          </button>
          <div className="h-px bg-gray-100 my-4 mx-4"></div>
          <button onClick={() => selectTab('settings')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
            <Settings size={20} /> Pengaturan
          </button>
        </nav>

        <div className="p-5 mt-auto">
          <button onClick={handleLogout} className="w-full mb-3 flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300">
            <LogOut size={18} /> Logout
          </button>
          <a href="/" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-700 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 border border-gray-200">
            Lihat Web Publik
          </a>
        </div>
      </aside>
    </>
  );

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Dashboard Utama</h1>
      <p className="text-gray-500 font-medium mb-8 text-sm md:text-base">Sistem Manajemen Konten Terintegrasi (MongoDB & Cloudinary).</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-lg transition-all duration-300">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><Newspaper size={24} /></div>
          <div><p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Berita</p><h3 className="font-bold text-2xl text-gray-900 leading-none">{news.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-lg transition-all duration-300">
          <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform"><Youtube size={24} /></div>
          <div><p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Video</p><h3 className="font-bold text-2xl text-gray-900 leading-none">{videos.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-lg transition-all duration-300">
          <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform"><Rocket size={24} /></div>
          <div><p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Tools</p><h3 className="font-bold text-2xl text-gray-900 leading-none">{tools.length}</h3></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5 group hover:shadow-lg transition-all duration-300">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform"><UploadCloud size={24} /></div>
          <div className="overflow-hidden"><p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Cloud</p><h3 className="font-bold text-base text-gray-900 truncate leading-tight">{cloudConfig.name ? 'Aktif' : 'Belum'}</h3></div>
        </div>
      </div>
    </div>
  );

  const renderHeroManager = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Header Beranda</h1>
          <p className="text-gray-500 font-medium text-sm md:text-base">Kelola foto-foto besar yang berganti otomatis di web utama.</p>
        </div>
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
        <div className="flex flex-wrap gap-4 mb-6">
          <label className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors">
            <UploadCloud size={18} /> Upload File
            <input type="file" multiple accept="image/*" onChange={handleHeroFileUpload} className="hidden" disabled={isUploading} />
          </label>
          <button onClick={addHeroImageViaUrl} className="bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors">
            <LinkIcon size={18} /> Tambah via URL
          </button>
        </div>

        {isUploading && <div className="text-blue-600 flex items-center gap-2 font-bold mb-4 text-sm"><Loader2 size={16} className="animate-spin" /> Mengompres & Mengunggah...</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {heroImages.length === 0 ? <p className="text-gray-400 font-medium col-span-2">Belum ada foto. (Akan menggunakan bawaan web jika kosong).</p> : null}
          {heroImages.map((img, idx) => (
            <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden group shadow-sm border border-gray-200">
              <img src={img} alt="Hero" loading="lazy" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <button onClick={() => removeHeroImage(idx)} className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button onClick={saveHeroImages} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
          <Save size={20} /> Simpan Susunan Foto Header
        </button>
      </div>
    </div>
  );

  const renderNewsManager = () => {
    if (isEditingNews) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setIsEditingNews(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
              <X size={20} className="text-gray-600" />
            </button>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-gray-900 tracking-tight">
              {currentNews ? 'Edit Berita' : 'Tulis Berita'}
            </h1>
          </div>

          <form onSubmit={handleSaveNews} className="space-y-6 md:space-y-8 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Judul Artikel / Berita</label>
              <input type="text" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-900 font-bold text-base md:text-lg" placeholder="Contoh: Kegiatan Porseni" />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Berita (Opsional)</label>
              <input type="text" value={newsForm.date} onChange={e => setNewsForm({...newsForm, date: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" placeholder="Hari ini jika kosong" />
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <label className="text-sm font-bold text-gray-700">Galeri Foto Utama</label>
                <div className="flex gap-2">
                  <label className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                    <UploadCloud size={14} /> Upload <input type="file" multiple accept="image/*" onChange={handleNewsFileUpload} className="hidden" disabled={isUploading} />
                  </label>
                  <button type="button" onClick={addNewsImageViaUrl} className="bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                    <LinkIcon size={14} /> URL Link
                  </button>
                </div>
              </div>
              
              {isUploading && <div className="text-blue-600 flex items-center gap-2 font-bold mb-3 text-xs"><Loader2 size={14} className="animate-spin" /> Mengompres & Mengunggah...</div>}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {newsForm.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-gray-100 bg-gray-100">
                    <img src={img} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeNewsImage(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Isi Berita Lengkap</label>
              
              <div className="flex flex-wrap gap-1.5 mb-2 p-1.5 bg-gray-50 border border-gray-200 rounded-xl">
                <button type="button" onClick={() => handleToolbarClick('bold')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-sm"><Bold size={16} /></button>
                <div className="w-px bg-gray-200 my-1"></div>
                <button type="button" onClick={() => handleToolbarClick('link')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-sm"><LinkIcon size={16} /></button>
                <div className="w-px bg-gray-200 my-1"></div>
                <button type="button" onClick={() => handleToolbarClick('image')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-sm"><ImageIcon size={16} /></button>
                <button type="button" onClick={() => handleToolbarClick('youtube')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-red-500 transition-colors shadow-sm"><Video size={16} /></button>
              </div>

              <textarea ref={contentRef} value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} required rows="10" className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 leading-relaxed resize-y text-sm md:text-base" placeholder="Tulis isi berita... HTML dasar otomatis terbaca."></textarea>
            </div>

            <div className="pt-2">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 hover:-translate-y-1 text-base md:text-lg">
                <Save size={20} /> Simpan Data Berita
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
          <div>
            <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Kelola Berita</h1>
            <p className="text-gray-500 font-medium text-sm md:text-base">Atur artikel dan foto kegiatan TK.</p>
          </div>
          <button onClick={() => { pushHistory(); setCurrentNews(null); setNewsForm({ title: '', content: '', images: [], date: '' }); setIsEditingNews(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-2xl md:rounded-full font-bold shadow-lg shadow-blue-500/30 hover:-translate-y-1 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            <Plus size={20} /> Tulis Berita
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {news.length === 0 ? <p className="text-gray-500 font-medium col-span-3">Belum ada berita.</p> : null}
          {news.map((item) => {
            let thumb = item.images && item.images.length > 0 ? item.images[0] : "https://files.catbox.moe/3tf995.png";
            if (typeof thumb === 'string' && thumb.includes('cloudinary')) thumb = thumb.replace('/upload/', '/upload/w_400,q_auto,f_auto/');
            
            return (
              <div key={item._id || item.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="w-full aspect-video relative bg-gray-100">
                  <img src={thumb} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div className="p-5 md:p-6 flex-1 flex flex-col">
                  <span className="text-orange-500 text-[10px] md:text-[11px] font-bold tracking-wider uppercase mb-1">{item.date}</span>
                  <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-4 line-clamp-2 leading-tight flex-1">{item.title}</h3>
                  <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                    <button onClick={() => { pushHistory(); setCurrentNews(item); setNewsForm({ title: item.title, content: item.content, images: item.images || [], date: item.date }); setIsEditingNews(true); }} className="flex-1 bg-gray-50 hover:bg-blue-50 text-blue-600 py-2.5 rounded-xl font-bold text-xs md:text-sm flex justify-center items-center gap-1 border border-gray-200 transition-colors">
                      <Edit size={16} /> Edit
                    </button>
                    <button onClick={() => deleteNews(item._id || item.id)} className="w-12 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex justify-center items-center transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderVideosManager = () => {
    if (isEditingVideo) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setIsEditingVideo(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"><X size={20} className="text-gray-600" /></button>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-gray-900 tracking-tight">{currentVideo ? 'Edit Video' : 'Video Baru'}</h1>
          </div>
          <form onSubmit={handleSaveVideo} className="space-y-6 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Judul Video</label><input type="text" value={videoForm.judul} onChange={e => setVideoForm({...videoForm, judul: e.target.value})} required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Singkat</label><textarea value={videoForm.deskripsi} onChange={e => setVideoForm({...videoForm, deskripsi: e.target.value})} required rows="3" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none text-sm md:text-base"></textarea></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Link YouTube</label><input type="url" value={videoForm.url} onChange={e => setVideoForm({...videoForm, url: e.target.value})} required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-sm md:text-base" placeholder="https://youtu.be/..." /></div>
            <div className="pt-2"><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2 hover:-translate-y-1"><Save size={20} /> Simpan Video</button></div>
          </form>
        </div>
      );
    }
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
          <div><h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Kelola Video</h1><p className="text-gray-500 font-medium text-sm md:text-base">Pengaturan video YouTube di beranda.</p></div>
          <button onClick={() => { pushHistory(); setCurrentVideo(null); setVideoForm({ judul: '', deskripsi: '', url: '' }); setIsEditingVideo(true); }} className="w-full md:w-auto bg-orange-500 text-white px-6 py-3.5 rounded-2xl md:rounded-full font-bold shadow-lg shadow-orange-500/30 hover:-translate-y-1 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"><Plus size={20} /> Tambah Video</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {videos.length === 0 ? <p className="text-gray-500 font-medium col-span-2">Belum ada video.</p> : null}
          {videos.map((vid) => {
            const m = vid.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
            const thumb = m && m[1] ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : "https://files.catbox.moe/3tf995.png";
            return (
              <div key={vid._id || vid.id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4 md:gap-5">
                <div className="w-full sm:w-32 h-40 sm:h-24 relative rounded-xl overflow-hidden bg-black shrink-0"><img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-80" /><Youtube className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" size={24} /></div>
                <div className="flex-1 w-full overflow-hidden text-center sm:text-left"><h4 className="font-bold text-gray-900 truncate mb-1">{vid.judul}</h4><p className="text-xs text-gray-500 truncate mb-3">{vid.url}</p>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <button onClick={() => { pushHistory(); setCurrentVideo(vid); setVideoForm({ judul: vid.judul, deskripsi: vid.deskripsi, url: vid.url }); setIsEditingVideo(true); }} className="flex-1 sm:flex-none sm:px-6 bg-gray-50 text-blue-600 py-2 rounded-xl font-bold text-xs flex justify-center items-center gap-1 border border-gray-200"><Edit size={14} /> Edit</button>
                    <button onClick={() => deleteVideo(vid._id || vid.id)} className="w-12 bg-red-50 text-red-500 rounded-xl flex justify-center items-center"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderToolsManager = () => {
    if (isEditingTool) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setIsEditingTool(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"><X size={20} className="text-gray-600" /></button>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-gray-900 tracking-tight">{currentTool ? 'Edit Tool' : 'Tool / HTML Baru'}</h1>
          </div>
          <form onSubmit={handleSaveTool} className="space-y-6 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Nama Aplikasi / Menu</label><input type="text" value={toolForm.name} onChange={e => setToolForm({...toolForm, name: e.target.value})} required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold" /></div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipe Tujuan</label>
                  <select value={toolForm.type} onChange={e => setToolForm({...toolForm, type: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none font-bold text-gray-800 cursor-pointer">
                    <option value="link">Link Web (URL)</option>
                    <option value="html">Embed HTML Code</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Ikon (Otomatis)</label>
                  <div className="w-full px-5 py-4 rounded-2xl bg-blue-50 text-blue-600 flex justify-center border border-blue-100"><Rocket size={24}/></div>
               </div>
            </div>
            {toolForm.type === 'link' ? (
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Link Tujuan URL</label><input type="url" value={toolForm.url} onChange={e => setToolForm({...toolForm, url: e.target.value})} required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none text-sm md:text-base" placeholder="https://..." /></div>
            ) : (
              <div><label className="block text-sm font-bold text-gray-700 mb-2">URL File HTML Mentah</label><input type="url" value={toolForm.fileUrl} onChange={e => setToolForm({...toolForm, fileUrl: e.target.value})} required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none text-sm md:text-base" placeholder="URL Raw File HTML untuk dirender..." /></div>
            )}
            <div className="pt-2"><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2 hover:-translate-y-1"><Save size={20} /> Simpan Tool Menu</button></div>
          </form>
        </div>
      );
    }
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
          <div><h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Kelola Tools / HTML</h1><p className="text-gray-500 font-medium text-sm md:text-base">Aplikasi tambahan di menu Tools.</p></div>
          <button onClick={() => { pushHistory(); setCurrentTool(null); setToolForm({ name: '', url: '', type: 'link', fileUrl: '' }); setIsEditingTool(true); }} className="w-full md:w-auto bg-purple-600 text-white px-6 py-3.5 rounded-2xl md:rounded-full font-bold shadow-lg shadow-purple-500/30 hover:-translate-y-1 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"><Plus size={20} /> Tambah Tool</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tools.length === 0 ? <p className="text-gray-500 font-medium col-span-4">Belum ada tools.</p> : null}
          {tools.map((t) => (
             <div key={t._id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center group">
               <div className="w-14 h-14 bg-purple-50 rounded-2xl flex justify-center items-center text-purple-600 mb-3"><Rocket size={24}/></div>
               <h4 className="font-bold text-gray-900 line-clamp-1 mb-1 text-sm md:text-base">{t.name}</h4>
               <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md mb-4">{t.type.toUpperCase()}</span>
               <div className="flex gap-2 w-full mt-auto">
                 <button onClick={() => { pushHistory(); setCurrentTool(t); setToolForm({ name: t.name, url: t.url||'', type: t.type||'link', fileUrl: t.fileUrl||'' }); setIsEditingTool(true); }} className="flex-1 bg-gray-50 text-blue-600 py-2 rounded-xl text-xs font-bold border border-gray-200"><Edit size={14} className="mx-auto"/></button>
                 <button onClick={() => deleteTool(t._id)} className="w-10 bg-red-50 text-red-500 rounded-xl flex justify-center items-center"><Trash2 size={14}/></button>
               </div>
             </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Pengaturan Cloudinary</h1>
      <p className="text-gray-500 font-medium mb-8 md:mb-10 text-sm md:text-base">Konfigurasi penyimpanan gambar agar ringan & cepat.</p>

      <form onSubmit={handleSaveCloudConfig} className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
        <div className="bg-blue-50 border border-blue-100 p-4 md:p-5 rounded-2xl flex items-start gap-4 mb-4 md:mb-8">
          <Info size={24} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-blue-800 font-medium leading-relaxed">
            Pastikan <strong>Upload Preset</strong> di akun Cloudinary kamu disetel ke mode <span className="font-bold bg-blue-200 px-1 rounded">Unsigned</span>. Foto otomatis terkompresi ke <strong>WebP</strong>.
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Cloud Name</label>
          <input type="text" value={cloudConfig.name || ''} onChange={e => setCloudConfig({...cloudConfig, name: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" placeholder="Contoh: dxyzabcde" required />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Upload Preset (Unsigned)</label>
          <input type="text" value={cloudConfig.preset || ''} onChange={e => setCloudConfig({...cloudConfig, preset: e.target.value})} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" placeholder="Contoh: tk_upload_unsigned" required />
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold text-base md:text-lg py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 flex justify-center items-center gap-3">
             <Save size={20} /> Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f6] font-sans text-gray-800 flex flex-col md:flex-row">
      {renderLoader()}
      {renderNotification()}
      {renderSidebar()}
      
      <main className="flex-1 md:ml-72 p-4 pt-6 md:p-12 overflow-x-hidden min-h-screen">
        <div className="max-w-6xl mx-auto pb-24">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'hero' && renderHeroManager()}
          {activeTab === 'news' && renderNewsManager()}
          {activeTab === 'videos' && renderVideosManager()}
          {activeTab === 'tools' && renderToolsManager()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
}
