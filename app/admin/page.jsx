"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Newspaper, Youtube, Settings, LogOut, 
  Plus, Edit, Trash2, Save, X, Image as ImageIcon, Link as LinkIcon,
  Video, Bold, AlertCircle, CheckCircle, UploadCloud, Loader2, Lock, Menu, Rocket, ImagePlus, FileCode
} from 'lucide-react';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Data States
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [tools, setTools] = useState([]);
  
  // Cloudinary States
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [newCloud, setNewCloud] = useState({ name: '', preset: '' });

  // Tampilan (Visuals) States
  const [configForm, setConfigForm] = useState({ heroImages: [], profileImages: [] });

  // Form States
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [currentNews, setCurrentNews] = useState(null);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', images: [], date: '' });
  
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ judul: '', deskripsi: '', url: '' });

  const [isEditingTool, setIsEditingTool] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [toolForm, setToolForm] = useState({ name: '', url: '', type: 'link', content: '' });

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

  const pushHistory = () => window.history.pushState({ open: true }, '');

  const fetchData = async (password) => {
    setIsLoading(true);
    try {
      const resContent = await fetch('/api/content?t=' + new Date().getTime());
      if (resContent.ok) {
        const data = await resContent.json();
        setNews(data.news || []);
        setVideos(data.videos || []);
      }

      const reqHeaders = { 'x-admin-pass': password };
      
      const resCloud = await fetch('/api/admin?action=cloud_config', { headers: reqHeaders });
      if (resCloud.ok) {
        const cData = await resCloud.json();
        setCloudAccounts(Array.isArray(cData) ? cData : []);
      } else {
        sessionStorage.removeItem('tk_admin_pass');
        setIsLoggedIn(false);
        showNotif('Password salah atau sesi berakhir.', 'error');
        setIsLoading(false);
        return;
      }

      const resConfig = await fetch('/api/admin?action=config', { headers: reqHeaders });
      if (resConfig.ok) {
        const confData = await resConfig.json();
        setConfigForm({
          heroImages: confData.heroImages || [],
          profileImages: confData.profileImages || []
        });
      }

      const resTools = await fetch('/api/admin?action=tools', { headers: reqHeaders });
      if (resTools.ok) {
        const tData = await resTools.json();
        setTools(Array.isArray(tData) ? tData : []);
      }

    } catch (e) {
      console.error(e);
      showNotif('Gagal memuat data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const apiCall = async (method, payload) => {
    try {
      const res = await fetch('/api/admin', {
        method: method,
        headers: { 'Content-Type': 'application/json', 'x-admin-pass': adminPass },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server Error');
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
      const res = await fetch('/api/admin?action=cloud_config', { headers: { 'x-admin-pass': adminPass } });
      if (res.ok) {
        sessionStorage.setItem('tk_admin_pass', adminPass);
        setIsLoggedIn(true);
        fetchData(adminPass);
      } else {
        showNotif('Password Salah!', 'error');
      }
    } catch (err) {
      showNotif('Koneksi Gagal.', 'error');
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
    setIsEditingNews(false); setIsEditingVideo(false); setIsEditingTool(false);
  };

  // --- UPLOAD CLOUDINARY ENGINE ---
  const uploadToCloudinary = async (files) => {
    const activeCloud = cloudAccounts.find(c => c.active);
    if (!activeCloud) {
      showNotif('Tidak ada akun Cloudinary yang AKTIF! Silakan cek Menu Cloudinary.', 'error');
      return [];
    }
    setIsUploading(true);
    const uploadedUrls = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', activeCloud.preset);
      try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${activeCloud.name}/auto/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data.secure_url) {
          // Kompresi WebP untuk Image
          const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
          uploadedUrls.push(optimizedUrl);
        } else {
          showNotif(`Gagal upload: ${data.error?.message}`, 'error');
        }
      } catch (err) {
        showNotif('Error jaringan upload.', 'error');
      }
    }
    setIsUploading(false);
    return uploadedUrls;
  };

  // --- CRUD CONFIG TAMPILAN (HERO & PROFILE) ---
  const saveVisualConfig = async () => {
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'config', data: configForm });
    if (res.success) showNotif('Pengaturan Gambar berhasil disimpan secara permanen!');
    setIsLoading(false);
  };

  const handleVisualUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const urls = await uploadToCloudinary(files);
    if (urls.length > 0) {
      setConfigForm(prev => ({
        ...prev,
        [type]: [...prev[type], ...urls]
      }));
      showNotif('Berhasil unggah foto.');
    }
    e.target.value = '';
  };

  const addVisualUrl = (type) => {
    const url = prompt("Masukkan URL Gambar:");
    if (url) {
      setConfigForm(prev => ({
        ...prev,
        [type]: [...prev[type], url]
      }));
    }
  };

  const removeVisual = (type, index) => {
    setConfigForm(prev => ({
      ...prev,
      [type]: prev[type].filter((_, idx) => idx !== index)
    }));
  };

  // --- CLOUDINARY MANAGER ---
  const saveNewCloud = async (e) => {
    e.preventDefault();
    if (!newCloud.name || !newCloud.preset) return;
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'cloud_config', data: newCloud });
    if (res.success) {
      showNotif('Akun Cloudinary Ditambahkan!');
      setNewCloud({ name: '', preset: '' });
      fetchData(adminPass);
    }
    setIsLoading(false);
  };

  const activateCloud = async (id) => {
    setIsLoading(true);
    const res = await apiCall('PUT', { type: 'cloud_activate', id });
    if (res.success) { showNotif('Akun Aktif Diubah!'); fetchData(adminPass); }
    setIsLoading(false);
  };

  const deleteCloud = async (id) => {
    if(confirm('Hapus akun ini?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'cloud_config', id });
      if (res.success) { showNotif('Akun dihapus!'); fetchData(adminPass); }
      setIsLoading(false);
    }
  };

  // --- BERITA MANAGER ---
  const insertAtCursor = (textToInsert) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    setNewsForm(prev => ({ ...prev, content: text.substring(0, start) + textToInsert + text.substring(end) }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  const handleNewsFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const urls = await uploadToCloudinary(files);
    if (urls.length > 0) setNewsForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    e.target.value = '';
  };

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
    if (confirm('Hapus berita ini permanen?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'news', id });
      if (res.success) { showNotif('Berita dihapus.'); fetchData(adminPass); }
      setIsLoading(false);
    }
  };

  // --- VIDEO MANAGER ---
  const handleSaveVideo = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    let res = currentVideo ? await apiCall('PUT', { type: 'videos', id: currentVideo._id, data: videoForm }) : await apiCall('POST', { type: 'videos', data: videoForm });
    if (res.success) { showNotif('Video tersimpan!'); setIsEditingVideo(false); fetchData(adminPass); }
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

  // --- TOOLS MANAGER (WITH HTML UPLOAD) ---
  const handleHtmlFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setToolForm(prev => ({ ...prev, content: evt.target.result, type: 'html_code' }));
      showNotif('File HTML berhasil dibaca. Siap disimpan.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveTool = async (e) => {
    e.preventDefault();
    if (!toolForm.name) return showNotif('Nama wajib diisi!', 'error');
    setIsLoading(true);
    
    // Sesuaikan payload
    const payload = { name: toolForm.name, type: toolForm.type };
    if (toolForm.type === 'link') payload.url = toolForm.url;
    if (toolForm.type === 'html_code') payload.content = toolForm.content;

    let res = currentTool ? await apiCall('PUT', { type: 'tools', id: currentTool._id, data: payload }) : await apiCall('POST', { type: 'tools', data: payload });
    if (res.success) { showNotif('Tool/Aplikasi tersimpan!'); setIsEditingTool(false); fetchData(adminPass); }
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

  // ================= UI RENDERERS ================= //

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        <form onSubmit={handleLogin} className="bg-white/90 p-8 md:p-10 rounded-[3rem] shadow-xl w-full max-w-md relative z-10 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><Lock size={32} className="text-blue-600" /></div>
          <h1 className="font-bold text-3xl text-gray-900 mb-2">Panel Admin TK</h1>
          <p className="text-gray-500 text-sm md:text-base mb-8">Silakan masukkan password.</p>
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} required autoFocus className="w-full px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-xl font-bold tracking-widest text-gray-800 mb-6" placeholder="••••••••" />
          <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all flex justify-center items-center gap-2">
            {isLoggingIn ? <Loader2 className="animate-spin" size={24} /> : 'Masuk Sistem'}
          </button>
        </form>
        {notification && <div className="fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl font-bold border bg-red-50 text-red-600 border-red-200">{notification.message}</div>}
      </div>
    );
  }

  const renderSidebar = () => (
    <>
      <div className="md:hidden bg-white/95 border-b border-gray-100 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><LayoutDashboard size={20} /></div>
          <div><h1 className="font-bold text-gray-900">Admin TK</h1></div>
        </div>
        <button onClick={() => { pushHistory(); setIsMobileMenuOpen(true); }} className="p-2 bg-gray-50 rounded-xl"><Menu size={22} /></button>
      </div>

      <div className={`fixed inset-0 bg-black/50 z-[9998] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      <aside className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white border-r border-gray-100 shadow-xl flex flex-col z-[9999] transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 pb-2 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-md"><LayoutDashboard size={24} /></div>
             <div><h2 className="font-bold text-xl text-gray-900 leading-tight">Admin TK</h2><p className="text-[10px] font-bold text-gray-500 tracking-wider">DATABASE</p></div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2"><X size={20} /></button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <button onClick={() => selectTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => selectTab('visuals')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'visuals' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><ImagePlus size={20} /> Tampilan Web</button>
          <button onClick={() => selectTab('news')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'news' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Newspaper size={20} /> Berita</button>
          <button onClick={() => selectTab('videos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'videos' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Youtube size={20} /> Video</button>
          <button onClick={() => selectTab('tools')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Rocket size={20} /> Tools HTML</button>
          <div className="h-px bg-gray-100 my-2 mx-2"></div>
          <button onClick={() => selectTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={20} /> Akun Cloudinary</button>
        </nav>

        <div className="p-4 mt-auto border-t border-gray-100">
          <button onClick={handleLogout} className="w-full mb-2 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold"><LogOut size={18} /> Logout</button>
          <a href="/" target="_blank" className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-200">Lihat Web</a>
        </div>
      </aside>
    </>
  );

  const renderVisualManager = () => (
    <div className="animate-in fade-in max-w-4xl">
      <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-2">Tampilan Web</h1>
      <p className="text-gray-500 mb-8">Atur gambar Header Beranda dan Foto Profil Sekolah.</p>

      {/* FOTO PROFIL SEKOLAH */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Foto Profil Sekolah (Tentang Kami)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <label className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"><UploadCloud size={18} /> Upload PC/HP <input type="file" multiple accept="image/*" onChange={(e) => handleVisualUpload(e, 'profileImages')} className="hidden" disabled={isUploading} /></label>
          <button onClick={() => addVisualUrl('profileImages')} className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><LinkIcon size={18} /> via URL</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {configForm.profileImages.length === 0 && <p className="text-gray-400 text-sm col-span-4">Belum ada foto profil.</p>}
          {configForm.profileImages.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm bg-gray-100">
              <img src={img} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removeVisual('profileImages', i)} className="bg-red-500 text-white p-2 rounded-full"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOTO HERO HEADER */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Slide Foto Header Beranda</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <label className="bg-blue-50 text-blue-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer"><UploadCloud size={18} /> Upload PC/HP <input type="file" multiple accept="image/*" onChange={(e) => handleVisualUpload(e, 'heroImages')} className="hidden" disabled={isUploading} /></label>
          <button onClick={() => addVisualUrl('heroImages')} className="bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><LinkIcon size={18} /> via URL</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {configForm.heroImages.length === 0 && <p className="text-gray-400 text-sm col-span-2">Belum ada foto slide header.</p>}
          {configForm.heroImages.map((img, i) => (
            <div key={i} className="relative aspect-video rounded-2xl overflow-hidden group shadow-sm bg-gray-100 border border-gray-200">
              <img src={img} alt="Hero" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removeVisual('heroImages', i)} className="bg-red-500 text-white p-2 rounded-full"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={saveVisualConfig} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 hover:-translate-y-1 transition-transform">
        <Save size={20} /> Simpan Semua Tampilan Permanen
      </button>
    </div>
  );

  const renderCloudSettings = () => (
    <div className="animate-in fade-in max-w-4xl">
      <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-2">Akun Cloudinary</h1>
      <p className="text-gray-500 mb-8">Penyimpanan awan untuk auto-kompres WebP.</p>

      {/* Form Tambah */}
      <form onSubmit={saveNewCloud} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Tambah Akun Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="block text-sm font-bold text-gray-700 mb-2">Cloud Name</label><input type="text" value={newCloud.name} onChange={e => setNewCloud({...newCloud, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 focus:bg-white outline-none border border-gray-200" required placeholder="Contoh: dpqzxxx" /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-2">Upload Preset (Unsigned)</label><input type="text" value={newCloud.preset} onChange={e => setNewCloud({...newCloud, preset: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 focus:bg-white outline-none border border-gray-200" required placeholder="Contoh: tk_upload" /></div>
        </div>
        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl shadow-md flex justify-center items-center gap-2">
          <Plus size={20} /> Tambahkan Akun
        </button>
      </form>

      {/* List Akun */}
      <h3 className="font-bold text-xl mb-4 text-gray-900">Daftar Akun Tersimpan</h3>
      <div className="space-y-4">
        {cloudAccounts.length === 0 && <p className="text-gray-500">Belum ada akun.</p>}
        {cloudAccounts.map(c => (
          <div key={c._id} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${c.active ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
            <div>
              <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                {c.name} {c.active && <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-md">AKTIF</span>}
              </h4>
              <p className="text-sm text-gray-500 font-medium">Preset: {c.preset}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {!c.active && <button onClick={() => activateCloud(c._id)} className="flex-1 md:flex-none bg-white text-gray-800 border border-gray-300 font-bold px-4 py-2 rounded-xl text-sm shadow-sm">Gunakan Ini</button>}
              <button onClick={() => deleteCloud(c._id)} className="w-12 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderNewsManager = () => {
    if (isEditingNews) {
      return (
        <div className="animate-in fade-in max-w-4xl">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setIsEditingNews(false)} className="w-10 h-10 bg-white rounded-full flex justify-center items-center border border-gray-200 shadow-sm"><X size={20}/></button>
            <h1 className="font-bold text-2xl md:text-3xl">{currentNews ? 'Edit Berita' : 'Tulis Berita'}</h1>
          </div>
          <form onSubmit={handleSaveNews} className="space-y-6 bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Judul</label><input type="text" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} required className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200" /></div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-gray-700">Foto</label>
                <div className="flex gap-2">
                  <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1"><UploadCloud size={14} /> Upload <input type="file" multiple accept="image/*" onChange={handleNewsFileUpload} className="hidden" disabled={isUploading}/></label>
                  <button type="button" onClick={addNewsImageViaUrl} className="bg-gray-50 text-gray-700 border px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1"><LinkIcon size={14}/> URL</button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {newsForm.images.map((img, idx) => (
                  <div key={idx} className="aspect-square relative rounded-xl overflow-hidden bg-gray-100"><img src={img} className="w-full h-full object-cover"/><button type="button" onClick={() => removeNewsImage(idx)} className="absolute inset-0 m-auto w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100"><Trash2 size={14}/></button></div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Isi Berita</label>
              <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200">
                <button type="button" onClick={() => handleToolbarClick('bold')} className="p-2 text-gray-600"><Bold size={16} /></button>
                <button type="button" onClick={() => handleToolbarClick('link')} className="p-2 text-gray-600"><LinkIcon size={16} /></button>
                <button type="button" onClick={() => handleToolbarClick('image')} className="p-2 text-gray-600"><ImageIcon size={16} /></button>
                <button type="button" onClick={() => handleToolbarClick('youtube')} className="p-2 text-red-500"><Video size={16} /></button>
              </div>
              <textarea ref={contentRef} value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} required rows="8" className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200"></textarea>
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg"><Save size={20} className="inline mr-2"/> Simpan Berita</button>
          </form>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900">Kelola Berita</h1>
          <button onClick={() => { pushHistory(); setCurrentNews(null); setNewsForm({ title: '', content: '', images: [], date: '' }); setIsEditingNews(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md"><Plus size={20} /> Tulis Berita</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.length === 0 && <p className="text-gray-500">Belum ada berita.</p>}
          {news.map(item => (
            <div key={item._id} className="bg-white rounded-2xl border flex flex-col overflow-hidden">
              <div className="aspect-video bg-gray-100"><img src={item.images?.[0] || 'https://files.catbox.moe/3tf995.png'} className="w-full h-full object-cover"/></div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-lg leading-tight mb-4 flex-1 line-clamp-2">{item.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => { pushHistory(); setCurrentNews(item); setNewsForm({ title: item.title, content: item.content, images: item.images || [], date: item.date }); setIsEditingNews(true); }} className="flex-1 bg-gray-50 text-blue-600 py-2.5 rounded-xl font-bold text-sm border"><Edit size={16} className="inline"/></button>
                  <button onClick={() => deleteNews(item._id)} className="w-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderToolsManager = () => {
    if (isEditingTool) {
      return (
        <div className="animate-in fade-in max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setIsEditingTool(false)} className="w-10 h-10 bg-white rounded-full flex justify-center items-center border shadow-sm"><X size={20}/></button>
            <h1 className="font-bold text-2xl">{currentTool ? 'Edit Tool' : 'Tool Baru'}</h1>
          </div>
          <form onSubmit={handleSaveTool} className="space-y-6 bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Nama Menu Aplikasi</label><input type="text" value={toolForm.name} onChange={e => setToolForm({...toolForm, name: e.target.value})} required className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200" /></div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tipe Tujuan</label>
              <select value={toolForm.type} onChange={e => setToolForm({...toolForm, type: e.target.value, url:'', content:''})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 cursor-pointer font-bold text-gray-700">
                <option value="link">Link Web External (URL)</option>
                <option value="html_code">Aplikasi HTML Internal (Kode)</option>
              </select>
            </div>
            {toolForm.type === 'link' ? (
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Link Tujuan (https://...)</label><input type="url" value={toolForm.url} onChange={e => setToolForm({...toolForm, url: e.target.value})} required className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200" /></div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Kode HTML atau Upload File .html</label>
                <input type="file" accept=".html,.htm" onChange={handleHtmlFileUpload} className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"/>
                <textarea value={toolForm.content} onChange={e => setToolForm({...toolForm, content: e.target.value})} required rows="5" placeholder="<html><body>...</body></html>" className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono"></textarea>
              </div>
            )}
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg"><Save size={20} className="inline mr-2"/> Simpan Menu Tool</button>
          </form>
        </div>
      );
    }
    return (
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900">Kelola Tools</h1>
          <button onClick={() => { pushHistory(); setCurrentTool(null); setToolForm({ name: '', url: '', type: 'link', content: '' }); setIsEditingTool(true); }} className="w-full md:w-auto bg-purple-600 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md"><Plus size={20} /> Tambah Tool</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {tools.length === 0 && <p className="col-span-4 text-gray-500">Belum ada tools.</p>}
          {tools.map(t => (
            <div key={t._id} className="bg-white p-5 rounded-2xl border text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 flex justify-center items-center rounded-xl mb-3"><FileCode size={24}/></div>
              <h4 className="font-bold text-gray-900 line-clamp-1 text-sm mb-1">{t.name}</h4>
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold mb-4">{t.type === 'link' ? 'URL LINK' : 'HTML APP'}</span>
              <div className="flex gap-2 w-full mt-auto">
                 <button onClick={() => { pushHistory(); setCurrentTool(t); setToolForm({ name: t.name, url: t.url||'', type: t.type||'link', content: t.content||'' }); setIsEditingTool(true); }} className="flex-1 bg-gray-50 border text-blue-600 py-2 rounded-lg text-xs font-bold"><Edit size={14} className="mx-auto"/></button>
                 <button onClick={() => deleteTool(t._id)} className="w-10 bg-red-50 text-red-500 rounded-lg flex justify-center items-center"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f6] font-sans text-gray-800 flex flex-col md:flex-row">
      {isLoading && renderLoader()}
      {renderNotification()}
      {renderSidebar()}
      <main className="flex-1 md:ml-72 p-4 pt-6 md:p-12 overflow-x-hidden min-h-screen">
        <div className="max-w-5xl mx-auto pb-24">
          {activeTab === 'dashboard' && (
            <div className="animate-in fade-in">
              <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-8">Dashboard Utama</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div onClick={() => selectTab('news')} className="bg-white p-6 rounded-2xl border flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"><Newspaper size={32} className="text-blue-500 mb-2"/><h3 className="font-bold text-xl">{news.length} Berita</h3></div>
                <div onClick={() => selectTab('videos')} className="bg-white p-6 rounded-2xl border flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"><Youtube size={32} className="text-orange-500 mb-2"/><h3 className="font-bold text-xl">{videos.length} Video</h3></div>
                <div onClick={() => selectTab('tools')} className="bg-white p-6 rounded-2xl border flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"><Rocket size={32} className="text-purple-500 mb-2"/><h3 className="font-bold text-xl">{tools.length} Tools</h3></div>
                <div onClick={() => selectTab('visuals')} className="bg-white p-6 rounded-2xl border flex flex-col items-center justify-center cursor-pointer hover:shadow-lg"><ImagePlus size={32} className="text-green-500 mb-2"/><h3 className="font-bold text-xl">Tampilan</h3></div>
              </div>
            </div>
          )}
          {activeTab === 'visuals' && renderVisualManager()}
          {activeTab === 'news' && renderNewsManager()}
          {activeTab === 'videos' && (
             <div className="animate-in fade-in">
               <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                 <h1 className="font-bold text-3xl md:text-4xl text-gray-900">Kelola Video</h1>
                 <button onClick={() => { pushHistory(); setCurrentVideo(null); setVideoForm({ judul: '', deskripsi: '', url: '' }); setIsEditingVideo(true); }} className="w-full md:w-auto bg-orange-500 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md"><Plus size={20} /> Tambah Video</button>
               </div>
               {isEditingVideo ? (
                 <form onSubmit={handleSaveVideo} className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-4 max-w-xl">
                    <input type="text" value={videoForm.judul} onChange={e=>setVideoForm({...videoForm, judul: e.target.value})} required className="w-full p-4 bg-gray-50 rounded-xl" placeholder="Judul Video" />
                    <textarea value={videoForm.deskripsi} onChange={e=>setVideoForm({...videoForm, deskripsi: e.target.value})} required className="w-full p-4 bg-gray-50 rounded-xl" placeholder="Deskripsi"></textarea>
                    <input type="url" value={videoForm.url} onChange={e=>setVideoForm({...videoForm, url: e.target.value})} required className="w-full p-4 bg-gray-50 rounded-xl" placeholder="Link YouTube" />
                    <button type="submit" className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold">Simpan</button>
                 </form>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {videos.map(v => (
                     <div key={v._id} className="bg-white p-4 rounded-2xl border flex gap-4 items-center">
                       <div className="w-24 h-16 bg-black rounded-lg shrink-0 flex items-center justify-center"><Youtube className="text-white"/></div>
                       <div className="flex-1 overflow-hidden"><h4 className="font-bold truncate">{v.judul}</h4><p className="text-xs text-gray-500 truncate mb-2">{v.url}</p>
                         <div className="flex gap-2"><button onClick={() => { pushHistory(); setCurrentVideo(v); setVideoForm({judul: v.judul, deskripsi: v.deskripsi, url: v.url}); setIsEditingVideo(true); }} className="px-4 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg">Edit</button><button onClick={()=>deleteVideo(v._id)} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg"><Trash2 size={14}/></button></div>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
          {activeTab === 'tools' && renderToolsManager()}
          {activeTab === 'settings' && renderCloudSettings()}
        </div>
      </main>
    </div>
  );
}
