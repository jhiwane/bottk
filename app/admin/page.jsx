"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Newspaper, Youtube, Settings, LogOut, 
  Plus, Edit, Trash2, Save, X, Image as ImageIcon, Link as LinkIcon,
  Video, Bold, AlertCircle, CheckCircle, UploadCloud, Loader2, Lock
} from 'lucide-react';

export default function AdminPanel() {
  // === STATE AUTHENTICATION ===
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // === STATE GLOBAL ===
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // === STATE DATA (MongoDB Source) ===
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  
  // === STATE CLOUDINARY PENGATURAN ===
  const [cloudConfig, setCloudConfig] = useState({
    name: '', 
    preset: '' 
  });

  // === STATE FORM BERITA ===
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [currentNews, setCurrentNews] = useState(null);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', images: [], date: '' });
  const [isUploading, setIsUploading] = useState(false);
  
  // === STATE FORM VIDEO ===
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ judul: '', deskripsi: '', url: '' });

  const contentRef = useRef(null);

  // Cek session login saat komponen dimuat
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
      if (isEditingNews) {
        setIsEditingNews(false);
      } else if (isEditingVideo) {
        setIsEditingVideo(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isEditingNews, isEditingVideo]);

  const pushHistory = () => {
    window.history.pushState({ open: true }, '');
  };

  // === FUNGSI FETCH API (BACA DATA) ===
  const fetchData = async (password) => {
    setIsLoading(true);
    try {
      // FIX BUG: Gunakan path relatif, hindari window.location.origin agar tidak error parse URL
      const resContent = await fetch('/api/content?t=' + new Date().getTime());
      if (resContent.ok) {
        const data = await resContent.json();
        if (data.news) setNews(data.news);
        if (data.videos) setVideos(data.videos);
      }

      const resCloud = await fetch('/api/admin?action=cloud_config', {
        headers: { 'x-admin-pass': password }
      });
      if (resCloud.ok) {
        const cloudData = await resCloud.json();
        setCloudConfig({ name: cloudData.name || '', preset: cloudData.preset || '' });
      } else {
        sessionStorage.removeItem('tk_admin_pass');
        setIsLoggedIn(false);
        showNotif('Sesi kedaluwarsa atau password salah.', 'error');
      }
    } catch (e) {
      console.error(e);
      showNotif('Gagal memuat data dari server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // === FUNGSI API MUTASI (CREATE, UPDATE, DELETE) ===
  const apiCall = async (method, payload) => {
    try {
      const res = await fetch('/api/admin', {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pass': adminPass
        },
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const res = await fetch('/api/admin?action=cloud_config', {
        headers: { 'x-admin-pass': adminPass }
      });

      if (res.ok) {
        sessionStorage.setItem('tk_admin_pass', adminPass);
        setIsLoggedIn(true);
        fetchData(adminPass);
        showNotif('Login Berhasil!');
      } else {
        showNotif('Password Salah!', 'error');
      }
    } catch (err) {
      console.error(err);
      showNotif('Gagal terhubung ke server.', 'error');
    }
    
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tk_admin_pass');
    setIsLoggedIn(false);
    setAdminPass('');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (!cloudConfig.name || !cloudConfig.preset) {
      showNotif('Pengaturan Cloudinary belum diisi! Silakan isi di menu Pengaturan.', 'error');
      return;
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
          showNotif(`Gagal upload: ${data.error?.message || 'Kesalahan tak dikenal'}`, 'error');
        }
      } catch (err) {
        showNotif('Terjadi kesalahan jaringan saat upload.', 'error');
      }
    }

    if (uploadedUrls.length > 0) {
      setNewsForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      showNotif(`Berhasil mengunggah ${uploadedUrls.length} gambar.`);
    }
    
    setIsUploading(false);
    e.target.value = '';
  };

  const removeImage = (indexToRemove) => {
    setNewsForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove)
    }));
  };

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
      case 'bold':
        insertAtCursor('<b>Teks Tebal</b>');
        break;
      case 'link':
        const url = prompt('Masukkan URL Link:');
        if (url) insertAtCursor(`<a href="${url}" target="_blank" class="text-blue-600 underline">Teks Link</a>`);
        break;
      case 'image':
        const imgUrl = prompt('Masukkan URL Gambar:');
        if (imgUrl) insertAtCursor(`<img src="${imgUrl}" alt="Gambar Sisipan" loading="lazy" class="rounded-xl my-4 w-full h-auto shadow-sm" />`);
        break;
      case 'youtube':
        const yt = prompt('Masukkan Link YouTube:');
        if (yt) {
          const m = yt.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
          const vidId = m ? m[1] : null;
          if (vidId) {
            insertAtCursor(`<div class="aspect-video w-full my-4 rounded-xl overflow-hidden shadow-sm bg-gray-900"><iframe src="https://www.youtube.com/embed/${vidId}" class="w-full h-full border-0" allowfullscreen></iframe></div>`);
          } else {
            alert('Link YouTube tidak valid!');
          }
        }
        break;
      default:
        break;
    }
  };

  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsForm.title || !newsForm.content) {
      showNotif('Judul dan isi berita wajib diisi!', 'error');
      return;
    }

    const finalDate = newsForm.date || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const payload = { ...newsForm, date: finalDate };
    
    setIsLoading(true);
    let res;
    if (currentNews) {
      res = await apiCall('PUT', { type: 'news', id: currentNews._id, data: payload });
    } else {
      res = await apiCall('POST', { type: 'news', data: payload });
    }

    if (res.success) {
      showNotif(currentNews ? 'Berita diperbarui!' : 'Berita ditambahkan!');
      setIsEditingNews(false);
      setCurrentNews(null);
      fetchData(adminPass);
    }
    setIsLoading(false);
  };

  const deleteNews = async (id) => {
    if (confirm('Yakin ingin menghapus berita ini secara permanen dari Database?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'news', id });
      if (res.success) {
        showNotif('Berita berhasil dihapus.');
        fetchData(adminPass);
      }
      setIsLoading(false);
    }
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!videoForm.judul || !videoForm.url) {
      showNotif('Judul dan URL wajib diisi!', 'error'); return;
    }
    
    setIsLoading(true);
    let res;
    if (currentVideo) {
      res = await apiCall('PUT', { type: 'videos', id: currentVideo._id, data: videoForm });
    } else {
      res = await apiCall('POST', { type: 'videos', data: videoForm });
    }

    if (res.success) {
      showNotif('Video tersimpan!');
      setIsEditingVideo(false);
      setCurrentVideo(null);
      fetchData(adminPass);
    }
    setIsLoading(false);
  };

  const deleteVideo = async (id) => {
    if (confirm('Yakin ingin menghapus video ini?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'videos', id });
      if (res.success) {
        showNotif('Video dihapus.');
        fetchData(adminPass);
      }
      setIsLoading(false);
    }
  };

  const handleSaveCloudConfig = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'cloud_config', data: cloudConfig });
    if (res.success) showNotif('Pengaturan Cloudinary disimpan ke Database!');
    setIsLoading(false);
  };

  // === UI KOMPONEN ===

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_black_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
        
        <form onSubmit={handleLogin} className="bg-white/80 backdrop-blur-xl p-10 rounded-[3rem] shadow-2xl border border-white/50 w-full max-w-md relative z-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Lock size={32} className="text-blue-600" />
          </div>
          <h1 className="font-display font-bold text-3xl text-gray-900 mb-2">Panel Admin TK</h1>
          <p className="text-gray-500 font-medium mb-8">Silakan masukkan password admin.</p>
          
          <input 
            type="password" 
            value={adminPass}
            onChange={e => setAdminPass(e.target.value)}
            required 
            autoFocus
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
        <p className="font-bold text-gray-700">Sinkronisasi Database...</p>
      </div>
    </div>
  );

  const renderNotification = () => {
    if (!notification) return null;
    return (
      <div className="fixed top-6 right-6 z-[60000] animate-in slide-in-from-right-8 fade-in duration-300">
        <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-700' : 'bg-green-50/90 border-green-200 text-green-700'}`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <aside className="fixed left-0 top-0 h-full w-72 bg-white/80 backdrop-blur-3xl border-r border-gray-100 shadow-[20px_0_60px_rgba(0,0,0,0.02)] flex flex-col z-40">
      <div className="p-8 pb-4">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <LayoutDashboard size={24} />
           </div>
           <div>
             <h2 className="font-bold text-xl text-gray-900 tracking-tight leading-tight">Admin TK</h2>
             <p className="text-xs font-semibold text-gray-500">MongoDB Connected</p>
           </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button onClick={() => { setActiveTab('news'); setIsEditingNews(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'news' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
          <Newspaper size={20} /> Kelola Berita
        </button>
        <button onClick={() => { setActiveTab('videos'); setIsEditingVideo(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'videos' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
          <Youtube size={20} /> Kelola Video
        </button>
        <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'}`}>
          <Settings size={20} /> Pengaturan
        </button>
      </nav>

      <div className="p-6 mt-auto">
        <button onClick={handleLogout} className="w-full mb-3 flex items-center justify-center gap-3 bg-red-50 hover:bg-red-100 text-red-600 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300">
          <LogOut size={20} /> Kunci & Logout
        </button>
        <a href="/" target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 text-gray-700 px-5 py-3.5 rounded-2xl font-bold transition-all duration-300 border border-gray-200">
          Buka Web Publik
        </a>
      </div>
    </aside>
  );

  const renderDashboard = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="font-display font-bold text-4xl text-gray-900 mb-2 tracking-tight">Dashboard</h1>
      <p className="text-gray-500 font-medium mb-10">Ringkasan database konten website TK Baiturrohman.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
            <Newspaper size={28} />
          </div>
          <div>
            <p className="text-gray-500 font-semibold mb-1">Total Berita</p>
            <h3 className="font-bold text-3xl text-gray-900">{news.length}</h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <Youtube size={28} />
          </div>
          <div>
            <p className="text-gray-500 font-semibold mb-1">Total Video</p>
            <h3 className="font-bold text-3xl text-gray-900">{videos.length}</h3>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 flex items-center gap-6 group hover:-translate-y-1 transition-all duration-300">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
            <UploadCloud size={28} />
          </div>
          <div>
            <p className="text-gray-500 font-semibold mb-1">Cloudinary</p>
            <h3 className="font-bold text-lg text-gray-900">{cloudConfig.name ? 'Terhubung' : 'Belum Diatur'}</h3>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNewsManager = () => {
    if (isEditingNews) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setIsEditingNews(false)} className="w-12 h-12 bg-white rounded-full flex justify-center items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
              <X size={20} className="text-gray-600" />
            </button>
            <h1 className="font-display font-bold text-3xl text-gray-900 tracking-tight">
              {currentNews ? 'Edit Berita' : 'Tulis Berita Baru'}
            </h1>
          </div>

          <form onSubmit={handleSaveNews} className="space-y-8 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Judul Artikel / Berita</label>
              <input 
                type="text" 
                value={newsForm.title} 
                onChange={e => setNewsForm({...newsForm, title: e.target.value})}
                required 
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-900 font-bold text-lg" 
                placeholder="Contoh: Kegiatan Porseni 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal Berita (Boleh Kosong)</label>
              <input 
                type="text" 
                value={newsForm.date} 
                onChange={e => setNewsForm({...newsForm, date: e.target.value})}
                className="w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" 
                placeholder="Contoh: 15 Maret 2026 (Otomatis hari ini jika kosong)"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Galeri Foto Berita (Cloudinary)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {newsForm.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm border border-gray-100 bg-gray-100">
                    <img src={img} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(idx)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 hover:scale-110 transition-all shadow-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <label className="relative aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-blue-500 group">
                  <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                  {isUploading ? (
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                  ) : (
                    <>
                      <UploadCloud size={32} className="mb-2 group-hover:-translate-y-1 transition-transform" />
                      <span className="text-xs font-bold text-center px-2">Tambah<br/>Foto</span>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500 font-medium">*Foto pertama akan menjadi cover Thumbnail.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Isi Berita</label>
              
              <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-xl">
                <button type="button" onClick={() => handleToolbarClick('bold')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-sm" title="Tebal">
                  <Bold size={18} />
                </button>
                <div className="w-px bg-gray-200 my-1"></div>
                <button type="button" onClick={() => handleToolbarClick('link')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-sm" title="Sisipkan Link">
                  <LinkIcon size={18} />
                </button>
                <div className="w-px bg-gray-200 my-1"></div>
                <button type="button" onClick={() => handleToolbarClick('image')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-blue-600 transition-colors shadow-sm" title="Sisipkan Gambar via URL">
                  <ImageIcon size={18} />
                </button>
                <button type="button" onClick={() => handleToolbarClick('youtube')} className="p-2 hover:bg-white rounded-lg text-gray-700 hover:text-red-500 transition-colors shadow-sm" title="Embed YouTube Video">
                  <Video size={18} />
                </button>
              </div>

              <textarea 
                ref={contentRef}
                value={newsForm.content} 
                onChange={e => setNewsForm({...newsForm, content: e.target.value})}
                required 
                rows="10"
                className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 leading-relaxed resize-y" 
                placeholder="Tulis isi berita di sini. Mendukung tag HTML dasar..."
              ></textarea>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-4">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                <Save size={20} /> Simpan Berita ke Database
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="font-display font-bold text-4xl text-gray-900 mb-2 tracking-tight">Kelola Berita</h1>
            <p className="text-gray-500 font-medium">Data diambil langsung dari MongoDB.</p>
          </div>
          <button onClick={() => { 
            pushHistory();
            setCurrentNews(null); 
            setNewsForm({ title: '', content: '', images: [], date: '' }); 
            setIsEditingNews(true); 
          }} className="bg-blue-600 text-white px-6 py-3.5 rounded-full font-bold shadow-lg shadow-blue-500/30 hover:-translate-y-1 hover:bg-blue-700 transition-all flex items-center gap-2">
            <Plus size={20} /> Tambah Berita Baru
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.length === 0 ? (
            <p className="text-gray-500 font-medium col-span-3">Belum ada berita. Silakan tambahkan baru.</p>
          ) : (
            news.map((item) => {
              let thumb = item.images && item.images.length > 0 ? item.images[0] : "https://files.catbox.moe/3tf995.png";
              if (typeof thumb === 'string' && thumb.includes('cloudinary')) {
                  thumb = thumb.replace('/upload/', '/upload/w_400,q_auto,f_auto/');
              }
              return (
                <div key={item._id || item.id} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden group">
                  <div className="w-full aspect-video relative bg-gray-100">
                    <img src={thumb} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-gray-700 uppercase tracking-wider shadow-sm">
                      {item.images?.length || 0} Foto
                    </div>
                  </div>
                  <div className="p-6">
                    <span className="text-orange-500 text-[11px] font-bold tracking-wider uppercase">{item.date}</span>
                    <h3 className="font-bold text-xl text-gray-900 mt-1 mb-4 line-clamp-2 leading-tight">{item.title}</h3>
                    
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <button onClick={() => {
                        pushHistory();
                        setCurrentNews(item);
                        setNewsForm({ title: item.title, content: item.content, images: item.images || [], date: item.date });
                        setIsEditingNews(true);
                      }} className="flex-1 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-colors border border-gray-200">
                        <Edit size={16} /> Edit
                      </button>
                      <button onClick={() => deleteNews(item._id || item.id)} className="w-12 h-10 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex justify-center items-center transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderVideosManager = () => {
    if (isEditingVideo) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setIsEditingVideo(false)} className="w-12 h-12 bg-white rounded-full flex justify-center items-center shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors">
              <X size={20} className="text-gray-600" />
            </button>
            <h1 className="font-display font-bold text-3xl text-gray-900 tracking-tight">
              {currentVideo ? 'Edit Video Slider' : 'Tambah Video Baru'}
            </h1>
          </div>

          <form onSubmit={handleSaveVideo} className="space-y-6 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Judul Video</label>
              <input 
                type="text" 
                value={videoForm.judul} 
                onChange={e => setVideoForm({...videoForm, judul: e.target.value})}
                required 
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-900 font-bold" 
                placeholder="Contoh: Lomba Mewarnai 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Singkat</label>
              <textarea 
                value={videoForm.deskripsi} 
                onChange={e => setVideoForm({...videoForm, deskripsi: e.target.value})}
                required 
                rows="3"
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 resize-none" 
                placeholder="Penjelasan singkat aktivitas video..."
              ></textarea>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Link YouTube</label>
              <input 
                type="url" 
                value={videoForm.url} 
                onChange={e => setVideoForm({...videoForm, url: e.target.value})}
                required 
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800" 
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
            <div className="pt-4 border-t border-gray-100">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2 hover:-translate-y-1">
                <Save size={20} /> Simpan Video
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="font-display font-bold text-4xl text-gray-900 mb-2 tracking-tight">Kelola Video</h1>
            <p className="text-gray-500 font-medium">Pengaturan video kegiatan yang tampil di beranda.</p>
          </div>
          <button onClick={() => {
            pushHistory();
            setCurrentVideo(null);
            setVideoForm({ judul: '', deskripsi: '', url: '' });
            setIsEditingVideo(true);
          }} className="bg-orange-500 text-white px-6 py-3.5 rounded-full font-bold shadow-lg shadow-orange-500/30 hover:-translate-y-1 hover:bg-orange-600 transition-all flex items-center gap-2">
            <Plus size={20} /> Tambah Video YouTube
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.length === 0 ? (
            <p className="text-gray-500 font-medium col-span-2">Belum ada video.</p>
          ) : (
            videos.map((vid) => {
              const m = vid.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
              const ytId = m ? m[1] : null;
              const thumb = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : "https://files.catbox.moe/3tf995.png";
              
              return (
                <div key={vid._id || vid.id} className="bg-white p-4 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-gray-100 flex items-center gap-5">
                  <div className="w-32 h-24 relative rounded-xl overflow-hidden bg-black shrink-0">
                    <img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-80" />
                    <Youtube className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" size={24} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <h4 className="font-bold text-gray-900 truncate mb-1">{vid.judul}</h4>
                    <p className="text-xs text-gray-500 truncate mb-3">{vid.url}</p>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        pushHistory();
                        setCurrentVideo(vid);
                        setVideoForm({ judul: vid.judul, deskripsi: vid.deskripsi, url: vid.url });
                        setIsEditingVideo(true);
                      }} className="flex-1 bg-gray-50 hover:bg-blue-50 text-blue-600 py-2 rounded-lg font-bold text-xs flex justify-center items-center gap-1 border border-gray-200">
                        <Edit size={14} /> Edit
                      </button>
                      <button onClick={() => deleteVideo(vid._id || vid.id)} className="w-10 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex justify-center items-center transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
      <h1 className="font-display font-bold text-4xl text-gray-900 mb-2 tracking-tight">Pengaturan Cloudinary</h1>
      <p className="text-gray-500 font-medium mb-10">Konfigurasi akun penyimpanan gambar otomatis.</p>

      <form onSubmit={handleSaveCloudConfig} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 space-y-6">
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex items-start gap-4 mb-8">
          <Info size={24} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 font-medium leading-relaxed">
            Agar upload di panel ini berhasil, pastikan <strong>Upload Preset</strong> di akun Cloudinary kamu telah disetel ke mode <span className="font-bold bg-blue-200 px-1 rounded">Unsigned</span>. Konfigurasi ini akan langsung disimpan ke MongoDB.
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Cloud Name</label>
          <input 
            type="text" 
            value={cloudConfig.name}
            onChange={e => setCloudConfig({...cloudConfig, name: e.target.value})}
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" 
            placeholder="Contoh: dxyzabcde"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Upload Preset (Unsigned)</label>
          <input 
            type="text" 
            value={cloudConfig.preset}
            onChange={e => setCloudConfig({...cloudConfig, preset: e.target.value})}
            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" 
            placeholder="Contoh: tk_upload_unsigned"
            required
          />
        </div>

        <div className="pt-6">
          <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold text-lg py-4 rounded-2xl shadow-xl shadow-gray-900/20 transition-all hover:-translate-y-1 flex justify-center items-center gap-3">
             <Save size={20} /> Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f6] font-sans text-gray-800 flex">
      {renderLoader()}
      {renderNotification()}
      {renderSidebar()}
      
      <main className="flex-1 ml-72 p-8 md:p-12 overflow-x-hidden">
        <div className="max-w-6xl mx-auto pb-24">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'news' && renderNewsManager()}
          {activeTab === 'videos' && renderVideosManager()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
}
