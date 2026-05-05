"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Newspaper, Youtube, Settings, LogOut, 
  Plus, Edit, Trash2, Save, X, Image as ImageIcon, Link as LinkIcon,
  Video, Bold, Italic, Palette, FileCode, CheckCircle, UploadCloud, Loader2, Lock, Menu, Rocket, ImagePlus, History, FolderOpen, Quote, Heading2, Heading3
} from 'lucide-react';

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // === DATA STATES ===
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const [tools, setTools] = useState([]);
  
  // === CLOUDINARY STATES ===
  const [cloudAccounts, setCloudAccounts] = useState([]);
  const [newCloud, setNewCloud] = useState({ name: '', preset: '' });

  // === TAMPILAN (HERO & PROFIL) STATES ===
  const [configForm, setConfigForm] = useState({ heroImages: [], profileImages: [] });

  // === FORM BERITA & GALERI FOLDER ===
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [currentNews, setCurrentNews] = useState(null);
  const [newsForm, setNewsForm] = useState({ title: '', content: '', images: [], gallery: [], date: '' });
  
  const [newGalleryItem, setNewGalleryItem] = useState({ group: '', type: 'image', src: '', caption: '' });

  // === FORM VIDEO & TOOLS ===
  const [isEditingVideo, setIsEditingVideo] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({ judul: '', deskripsi: '', url: '' });

  const [isEditingTool, setIsEditingTool] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [toolForm, setToolForm] = useState({ name: '', url: '', type: 'link', content: '' });

  // === ASSET LIBRARY STATES ===
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [assetTarget, setAssetTarget] = useState(null); 

  const [isUploading, setIsUploading] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const savedPass = sessionStorage.getItem('tk_admin_pass');
    if (savedPass) {
      setAdminPass(savedPass);
      setIsLoggedIn(true);
      fetchData(savedPass);
    } else {
      if (isMounted) setIsLoading(false);
    }
    return () => { isMounted = false; };
  }, []);

  const pushHistory = () => window.history.pushState({ open: true }, '');

  const fetchData = async (password) => {
    setIsLoading(true);
    try {
      const resContent = await fetch('/api/content?t=' + new Date().getTime());
      if (resContent.ok) {
        const data = await resContent.json();
        // PENGAMAN: Pastikan selalu berupa Array agar tidak crash saat di-map
        setNews(Array.isArray(data.news) ? data.news : []);
        setVideos(Array.isArray(data.videos) ? data.videos : []);
        setTools(Array.isArray(data.tools) ? data.tools : []);
        setConfigForm({
           heroImages: Array.isArray(data.config?.heroImages) ? data.config.heroImages : [],
           profileImages: Array.isArray(data.config?.profileImages) ? data.config.profileImages : []
        });
      }

      const reqHeaders = { 'x-admin-pass': password };
      const resCloud = await fetch('/api/admin?action=cloud_config', { headers: reqHeaders });
      
      if (resCloud.ok) {
        const cData = await resCloud.json();
        setCloudAccounts(Array.isArray(cData) ? cData : []);
      } else {
        sessionStorage.removeItem('tk_admin_pass');
        setIsLoggedIn(false);
        showNotif('Sesi kedaluwarsa.', 'error');
        setIsLoading(false);
        return;
      }
    } catch (e) {
      showNotif('Gagal memuat data dari server.', 'error');
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
    setIsEditingNews(false); 
    setIsEditingVideo(false); 
    setIsEditingTool(false);
  };

  // --- UPLOAD CLOUDINARY ENGINE ---
  const uploadToCloudinary = async (files) => {
    const activeCloud = cloudAccounts.find(c => c.active);
    if (!activeCloud) {
      showNotif('Tidak ada akun Cloudinary AKTIF!', 'error');
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
          const optimizedUrl = data.secure_url.replace('/upload/', '/upload/f_auto,q_auto/');
          uploadedUrls.push(optimizedUrl);
        } else {
          showNotif(`Gagal: ${data.error?.message}`, 'error');
        }
      } catch (err) { 
        showNotif('Error upload jaringan.', 'error'); 
      }
    }
    setIsUploading(false);
    return uploadedUrls;
  };

  // --- CONFIG TAMPILAN (HERO & PROFIL) ---
  const handleVisualUpload = async (e, type) => {
    const urls = await uploadToCloudinary(Array.from(e.target.files));
    if (urls.length > 0) setConfigForm(prev => ({ ...prev, [type]: [...(prev[type] || []), ...urls] }));
    e.target.value = '';
  };
  const addVisualUrl = (type) => {
    const url = prompt("Masukkan URL Gambar Publik:");
    if (url) setConfigForm(prev => ({ ...prev, [type]: [...(prev[type] || []), url] }));
  };
  const removeVisual = (type, index) => {
    setConfigForm(prev => ({ ...prev, [type]: (prev[type] || []).filter((_, idx) => idx !== index) }));
  };
  const saveVisualConfig = async () => {
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'config', data: configForm });
    if (res.success) showNotif('Gambar berhasil disimpan permanen!');
    setIsLoading(false);
  };

  // --- CLOUDINARY MANAGER ---
  const saveNewCloud = async (e) => {
    e.preventDefault();
    if (!newCloud.name || !newCloud.preset) return;
    setIsLoading(true);
    const res = await apiCall('POST', { type: 'cloud_config', data: newCloud });
    if (res.success) { showNotif('Akun Ditambahkan!'); setNewCloud({ name: '', preset: '' }); fetchData(adminPass); }
    setIsLoading(false);
  };
  const activateCloud = async (id) => {
    setIsLoading(true);
    const res = await apiCall('PUT', { type: 'cloud_activate', id });
    if (res.success) { showNotif('Akun Diaktifkan!'); fetchData(adminPass); }
    setIsLoading(false);
  };
  const deleteCloud = async (id) => {
    if(confirm('Hapus akun?')) {
      setIsLoading(true);
      const res = await apiCall('DELETE', { type: 'cloud_config', id });
      if (res.success) { showNotif('Akun dihapus!'); fetchData(adminPass); }
      setIsLoading(false);
    }
  };

  // --- ASSET LIBRARY / HISTORY MANAGER ---
  const getAllHistoryAssets = () => {
    const allUrls = new Set();
    // PENGAMAN: Cek Array.isArray untuk mencegah Crash forEach is not a function
    if (Array.isArray(configForm.heroImages)) configForm.heroImages.forEach(u => { if (u) allUrls.add(u); });
    if (Array.isArray(configForm.profileImages)) configForm.profileImages.forEach(u => { if (u) allUrls.add(u); });
    if (Array.isArray(news)) {
      news.forEach(n => {
        if (Array.isArray(n.images)) n.images.forEach(u => { if (u) allUrls.add(u); });
        if (Array.isArray(n.gallery)) n.gallery.forEach(g => { if (g && g.type === 'image' && g.src) allUrls.add(g.src); });
      });
    }
    return Array.from(allUrls);
  };

  const handleSelectAsset = (url) => {
    if (assetTarget === 'news_images') {
      setNewsForm(prev => ({ ...prev, images: [...(prev.images || []), url] }));
    } else if (assetTarget === 'news_gallery') {
      setNewGalleryItem(prev => ({ ...prev, src: url }));
    } else if (assetTarget === 'editor') {
      insertAtCursor(`<img src="${url}" alt="Gambar Sisipan" loading="lazy" class="rounded-xl my-4 w-full h-auto shadow-sm" />`);
    } else if (assetTarget === 'heroImages') {
      setConfigForm(prev => ({ ...prev, heroImages: [...(prev.heroImages || []), url] }));
    } else if (assetTarget === 'profileImages') {
      setConfigForm(prev => ({ ...prev, profileImages: [...(prev.profileImages || []), url] }));
    }
    setIsAssetLibraryOpen(false);
    showNotif('Aset ditambahkan!');
  };

  // --- EDITOR RICH TEXT PROFESIONAL & TEMPLATE ---
  const insertAtCursor = (textToInsert) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value || '';
    setNewsForm(prev => ({ ...prev, content: text.substring(0, start) + textToInsert + text.substring(end) }));
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
    }, 10);
  };

  const applyTemplate = (e) => {
    const type = e.target.value;
    if (!type) return;
    let tpl = '';
    if (type === 'kegiatan') {
      tpl = `<h2>Laporan Kegiatan</h2>\n<p>Pada hari ini anak-anak melakukan aktivitas...</p>\n<blockquote>"Belajar sambil bermain adalah cara terbaik mendidik anak usia dini."</blockquote>\n<p>Acara berjalan lancar dan ditutup dengan doa bersama.</p>`;
    } else if (type === 'pengumuman') {
      tpl = `<h2>Pengumuman Penting</h2>\n<p><span style="color:#ef4444; font-weight:bold;">Perhatian bagi seluruh orang tua murid!</span></p>\n<p>Diberitahukan bahwa...</p>\n<hr>\n<p><i>Demikian informasi ini disampaikan, atas perhatiannya kami ucapkan terima kasih.</i></p>`;
    }
    setNewsForm(prev => ({ ...prev, content: tpl }));
    e.target.value = '';
    showNotif('Template Diterapkan!');
  };

  const handleToolbarClick = (action) => {
    switch(action) {
      case 'bold': insertAtCursor('<b>Teks Tebal</b>'); break;
      case 'italic': insertAtCursor('<i>Teks Miring</i>'); break;
      case 'h2': insertAtCursor('<h2>Judul Besar</h2>'); break;
      case 'h3': insertAtCursor('<h3>Judul Sedang</h3>'); break;
      case 'quote': insertAtCursor('<blockquote>"Kutipan Disini"</blockquote>'); break;
      case 'color': 
        const col = prompt('Ketik warna (contoh: red, blue, green, #ff0000):', 'red');
        if (col) insertAtCursor(`<span style="color:${col};">Teks Berwarna</span>`);
        break;
      case 'link': 
        const url = prompt('Masukkan URL Link:');
        if (url) insertAtCursor(`<a href="${url}" target="_blank" class="text-blue-600 underline">Teks Link</a>`);
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

  // --- BERITA & GALERI MANAGER ---
  const handleNewsFileUpload = async (e) => {
    const urls = await uploadToCloudinary(Array.from(e.target.files));
    if (urls.length > 0) setNewsForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    e.target.value = '';
  };
  
  const handleGalleryUpload = async (e) => {
    const urls = await uploadToCloudinary(Array.from(e.target.files));
    if (urls.length > 0) setNewGalleryItem(prev => ({ ...prev, src: urls[0] })); 
    e.target.value = '';
  };

  const addGalleryItem = () => {
    if (!newGalleryItem.src) return showNotif('Gambar wajib diisi/upload!', 'error');
    if (!newGalleryItem.group) return showNotif('Nama Kategori Folder wajib diisi!', 'error');
    
    setNewsForm(prev => ({ ...prev, gallery: [...(prev.gallery || []), { ...newGalleryItem }] }));
    setNewGalleryItem({ group: '', type: 'image', src: '', caption: '' }); 
    showNotif('Gambar berhasil dimasukkan ke Folder Galeri!');
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

  // --- CRUD VIDEO & TOOLS ---
  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!videoForm.judul || !videoForm.url) return showNotif('Judul & URL wajib!', 'error');
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


  // ================= UI COMPONENTS ================= //

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 relative overflow-hidden">
        <form onSubmit={handleLogin} className="bg-white/90 p-8 md:p-10 rounded-[3rem] shadow-xl w-full max-w-md relative z-10 text-center border border-gray-100">
          <div className="w-20 h-20 bg-blue-100 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock size={32} className="text-blue-600" /></div>
          <h1 className="font-bold text-3xl text-gray-900 mb-2">Panel Admin TK</h1>
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} required autoFocus className="w-full mt-6 px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-xl font-bold tracking-widest text-gray-800 mb-6" placeholder="••••••••" />
          <button disabled={isLoggingIn} type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all">Masuk Sistem</button>
        </form>
        {notification && <div className="fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-xl font-bold border bg-red-50 text-red-600 border-red-200">{notification.message}</div>}
      </div>
    );
  }

  const renderLoader = () => (
    <div className={`fixed inset-0 bg-white/80 backdrop-blur-sm z-[50000] flex justify-center items-center transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="flex flex-col items-center bg-white p-8 rounded-3xl shadow-xl border border-gray-100"><Loader2 size={48} className="text-blue-600 animate-spin mb-4" /><p className="font-bold text-gray-700">Memproses...</p></div>
    </div>
  );

  const renderAssetLibraryModal = () => {
    if (!isAssetLibraryOpen) return null;
    const assets = getAllHistoryAssets();
    return (
      <div className="fixed inset-0 z-[40000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg flex items-center gap-2"><History size={20}/> Riwayat Media Web</h3>
            <button onClick={() => setIsAssetLibraryOpen(false)} className="p-2 bg-white rounded-full hover:bg-gray-100"><X size={20}/></button>
          </div>
          <div className="p-4 overflow-y-auto flex-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {assets.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">Belum ada riwayat gambar di database.</p>}
            {assets.map((url, i) => {
               // PENGAMAN STRING
               const strUrl = String(url || '');
               const thumb = strUrl.includes('cloudinary') ? strUrl.replace('/upload/', '/upload/w_200,q_auto,f_auto/') : strUrl;
               return (
                 <div key={i} onClick={() => handleSelectAsset(strUrl)} className="aspect-square relative rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-blue-500 transition-all shadow-sm bg-gray-100">
                   {thumb && <img src={thumb} className="w-full h-full object-cover" />}
                 </div>
               )
            })}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-sm font-bold text-gray-500">Klik gambar untuk menyisipkan ke dalam form.</div>
        </div>
      </div>
    );
  };

  const renderSidebar = () => (
    <>
      <div className="md:hidden bg-white/95 border-b border-gray-100 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><LayoutDashboard size={20} /></div><h1 className="font-bold text-gray-900">Admin TK</h1></div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-gray-50 rounded-xl"><Menu size={22} /></button>
      </div>

      <div className={`fixed inset-0 bg-black/50 z-[9998] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      <aside className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white border-r border-gray-100 shadow-xl flex flex-col z-[9999] transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 pb-2 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><LayoutDashboard size={24} /></div><div><h2 className="font-bold text-xl text-gray-900">Admin TK</h2><p className="text-[10px] font-bold text-gray-500 tracking-wider">DATABASE</p></div></div><button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2"><X size={20} /></button></div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <button onClick={() => selectTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => selectTab('visuals')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'visuals' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><ImagePlus size={20} /> Tampilan Web</button>
          <button onClick={() => selectTab('news')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'news' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Newspaper size={20} /> Berita & Folder</button>
          <button onClick={() => selectTab('videos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'videos' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Youtube size={20} /> Video Utama</button>
          <button onClick={() => selectTab('tools')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Rocket size={20} /> Tools HTML</button>
          <div className="h-px bg-gray-100 my-2 mx-2"></div>
          <button onClick={() => selectTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={20} /> Multi Cloudinary</button>
        </nav>
        <div className="p-4 mt-auto border-t border-gray-100">
          <button onClick={handleLogout} className="w-full mb-2 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold"><LogOut size={18} /> Logout Aman</button>
          <a href="/" target="_blank" className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-200">Lihat Web Publik</a>
        </div>
      </aside>
    </>
  );

  const renderDashboard = () => {
    const activeCloud = cloudAccounts.find(c => c.active);
    return (
      <div className="animate-in fade-in max-w-5xl">
        <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-2">Dashboard Utama</h1>
        <p className="text-gray-500 mb-8 text-sm md:text-base">Sistem Manajemen Konten Terintegrasi (MongoDB).</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div onClick={() => selectTab('news')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-3"><Newspaper size={24} /></div>
            <h3 className="font-bold text-2xl text-gray-900 leading-none mb-1">{news.length}</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Berita</p>
          </div>
          <div onClick={() => selectTab('videos')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-3"><Youtube size={24} /></div>
            <h3 className="font-bold text-2xl text-gray-900 leading-none mb-1">{videos.length}</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Video</p>
          </div>
          <div onClick={() => selectTab('tools')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-3"><Rocket size={24} /></div>
            <h3 className="font-bold text-2xl text-gray-900 leading-none mb-1">{tools.length}</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tools</p>
          </div>
          <div onClick={() => selectTab('settings')} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 mb-3"><UploadCloud size={24} /></div>
            <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1 truncate px-2 w-full text-center">{activeCloud ? 'Aktif' : 'Kosong'}</h3>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Cloudinary</p>
          </div>
        </div>
      </div>
    );
  };

  const renderVisualManager = () => (
    <div className="animate-in fade-in max-w-4xl">
      <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-2">Tampilan Web</h1>
      <p className="text-gray-500 mb-8">Atur gambar Header Beranda dan Foto Profil Sekolah.</p>

      {/* FOTO PROFIL SEKOLAH */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Foto Profil Sekolah (Bagian Tentang Kami)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => { setAssetTarget('profileImages'); setIsAssetLibraryOpen(true); }} className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><History size={18} /> Riwayat</button>
          <label className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"><UploadCloud size={18} /> Upload PC/HP <input type="file" multiple accept="image/*" onChange={(e) => handleVisualUpload(e, 'profileImages')} className="hidden" disabled={isUploading} /></label>
          <button onClick={() => addVisualUrl('profileImages')} className="bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><LinkIcon size={18} /> via URL</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {(!configForm.profileImages || configForm.profileImages.length === 0) && <p className="text-gray-400 text-sm col-span-4">Belum ada foto profil.</p>}
          {Array.isArray(configForm.profileImages) && configForm.profileImages.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group shadow-sm bg-gray-100 border border-gray-200">
              <img src={img} alt="Profile" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <button onClick={() => removeVisual('profileImages', i)} className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-transform"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOTO HERO HEADER */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Slide Foto Header Beranda Depan</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => { setAssetTarget('heroImages'); setIsAssetLibraryOpen(true); }} className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"><History size={18} /> Riwayat</button>
          <label className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 cursor-pointer transition-colors"><UploadCloud size={18} /> Upload PC/HP <input type="file" multiple accept="image/*" onChange={(e) => handleVisualUpload(e, 'heroImages')} className="hidden" disabled={isUploading} /></label>
          <button onClick={() => addVisualUrl('heroImages')} className="bg-gray-50 border border-gray-200 hover:bg-gray-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><LinkIcon size={18} /> via URL</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {(!configForm.heroImages || configForm.heroImages.length === 0) && <p className="text-gray-400 text-sm col-span-2">Belum ada foto slide header.</p>}
          {Array.isArray(configForm.heroImages) && configForm.heroImages.map((img, i) => (
            <div key={i} className="relative aspect-video rounded-2xl overflow-hidden group shadow-sm bg-gray-100 border border-gray-200">
              <img src={img} alt="Hero" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                <button onClick={() => removeVisual('heroImages', i)} className="bg-red-500 text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={saveVisualConfig} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 hover:-translate-y-1 transition-all">
        <Save size={20} /> Simpan Tampilan
      </button>
    </div>
  );

  const renderNewsManager = () => {
    if (isEditingNews) {
      return (
        <div className="animate-in fade-in max-w-5xl">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setIsEditingNews(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"><X size={20}/></button>
            <h1 className="font-bold text-2xl md:text-3xl text-gray-900">{currentNews ? 'Edit Berita' : 'Tulis Berita Profesional'}</h1>
          </div>
          <form onSubmit={handleSaveNews} className="space-y-6 md:space-y-8 bg-white p-6 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
            {/* Template & Judul */}
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                <label className="text-sm font-bold text-gray-700">Judul Artikel / Berita</label>
                <select onChange={applyTemplate} className="bg-orange-50 text-orange-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-orange-200 outline-none cursor-pointer">
                  <option value="">Gunakan Template Tulisan...</option>
                  <option value="kegiatan">Template Kegiatan Sekolah</option>
                  <option value="pengumuman">Template Pengumuman</option>
                </select>
              </div>
              <input type="text" value={newsForm.title} onChange={e => setNewsForm({...newsForm, title: e.target.value})} required className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-gray-900" placeholder="Contoh: Lomba Mewarnai" />
            </div>

            {/* Thumbnail / Foto Utama */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <label className="text-sm font-bold text-gray-700">Foto Thumbnail & Slider Berita</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAssetTarget('news_images'); setIsAssetLibraryOpen(true); }} className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1"><History size={14}/> Riwayat</button>
                  <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1"><UploadCloud size={14} /> Upload <input type="file" multiple accept="image/*" onChange={handleNewsFileUpload} className="hidden" disabled={isUploading}/></label>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {Array.isArray(newsForm.images) && newsForm.images.map((img, idx) => (
                  <div key={idx} className="aspect-square relative rounded-xl overflow-hidden bg-gray-100 group">
                    <img src={img} className="w-full h-full object-cover"/>
                    <button type="button" onClick={() => setNewsForm(prev=>({...prev, images: prev.images.filter((_,i)=>i!==idx)}))} className="absolute inset-0 m-auto w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* FOLDER GALERI MANAGER */}
            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-4 flex items-center gap-2"><FolderOpen size={18}/> Kelola Galeri Kategori Tambahan</label>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row gap-3">
                <div className="w-full md:w-32 h-32 bg-gray-100 rounded-xl relative overflow-hidden flex items-center justify-center shrink-0 border-2 border-dashed border-gray-300">
                  {newGalleryItem.src ? <img src={newGalleryItem.src} className="w-full h-full object-cover"/> : <ImageIcon className="text-gray-400" size={32}/>}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setAssetTarget('news_gallery'); setIsAssetLibraryOpen(true); }} className="flex-1 bg-purple-50 text-purple-600 px-3 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 border border-purple-100"><History size={14}/> Pilih dari Riwayat</button>
                    <label className="flex-1 cursor-pointer bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1 border border-blue-100"><UploadCloud size={14} /> Upload Baru <input type="file" accept="image/*" onChange={handleGalleryUpload} className="hidden" disabled={isUploading}/></label>
                  </div>
                  <input type="text" value={newGalleryItem.group} onChange={e => setNewGalleryItem({...newGalleryItem, group: e.target.value})} className="w-full px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold" placeholder="Nama Folder (Misal: Lomba Tarik Tambang)" />
                  <div className="flex gap-2">
                    <input type="text" value={newGalleryItem.caption} onChange={e => setNewGalleryItem({...newGalleryItem, caption: e.target.value})} className="flex-1 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm" placeholder="Caption Foto..." />
                    <button type="button" onClick={addGalleryItem} className="bg-green-500 text-white font-bold px-4 rounded-xl text-sm whitespace-nowrap shadow-md"><Plus size={16} className="inline"/> Tambah</button>
                  </div>
                </div>
              </div>

              {Array.isArray(newsForm.gallery) && newsForm.gallery.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {newsForm.gallery.map((g, idx) => (
                    <div key={idx} className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 relative group text-center">
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2"><img src={g.src} className="w-full h-full object-cover"/></div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded block truncate mb-1">{g.group || 'Umum'}</span>
                      <button type="button" onClick={() => removeGalleryItem(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md"><X size={12}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RICH TEXT EDITOR */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Isi Berita Lengkap</label>
              <div className="flex flex-wrap gap-1 mb-2 p-1.5 bg-gray-50 rounded-xl border border-gray-200">
                <button type="button" onClick={() => handleToolbarClick('bold')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 font-serif font-bold w-10">B</button>
                <button type="button" onClick={() => handleToolbarClick('italic')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 font-serif italic w-10">I</button>
                <button type="button" onClick={() => handleToolbarClick('quote')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 w-10"><Quote size={16} className="mx-auto"/></button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button type="button" onClick={() => handleToolbarClick('h2')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 w-10"><Heading2 size={16} className="mx-auto"/></button>
                <button type="button" onClick={() => handleToolbarClick('h3')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 w-10"><Heading3 size={16} className="mx-auto"/></button>
                <button type="button" onClick={() => handleToolbarClick('color')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200"><Palette size={16}/></button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button type="button" onClick={() => handleToolbarClick('link')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200"><LinkIcon size={16} /></button>
                <button type="button" onClick={() => { setAssetTarget('editor'); setIsAssetLibraryOpen(true); }} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200"><ImageIcon size={16} /></button>
                <button type="button" onClick={() => handleToolbarClick('youtube')} className="p-2 text-gray-700 hover:text-red-500 bg-white shadow-sm rounded-lg border border-gray-200"><Youtube size={16} /></button>
              </div>
              <textarea ref={contentRef} value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} required rows="10" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-y text-gray-800 leading-relaxed"></textarea>
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg"><Save size={20} className="inline mr-2"/> Simpan Berita</button>
          </form>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900">Kelola Berita</h1>
          <button onClick={() => { pushHistory(); setCurrentNews(null); setNewsForm({ title: '', content: '', images: [], gallery: [], date: '' }); setIsEditingNews(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-md"><Plus size={20} /> Tulis Berita Baru</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {news.length === 0 && <p className="text-gray-500">Belum ada berita.</p>}
          {news.map(item => (
            <div key={item._id} className="bg-white rounded-2xl border flex flex-col overflow-hidden">
              <div className="aspect-video bg-gray-100 relative">
                <img src={item.images?.[0] || 'https://files.catbox.moe/3tf995.png'} className="w-full h-full object-cover"/>
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold">{item.gallery?.length || 0} Folder</div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-lg leading-tight mb-4 flex-1 line-clamp-2">{item.title}</h3>
                <div className="flex gap-2">
                  <button onClick={() => { pushHistory(); setCurrentNews(item); setNewsForm({ title: item.title, content: item.content, images: item.images || [], gallery: item.gallery || [], date: item.date }); setIsEditingNews(true); }} className="flex-1 bg-gray-50 text-blue-600 py-2.5 rounded-xl font-bold text-sm border"><Edit size={16} className="inline"/></button>
                  <button onClick={() => deleteNews(item._id)} className="w-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderVideosManager = () => {
    if (isEditingVideo) {
      return (
        <div className="animate-in fade-in max-w-2xl">
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
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
          <div><h1 className="font-display font-bold text-3xl md:text-4xl text-gray-900 mb-2 tracking-tight">Kelola Video</h1><p className="text-gray-500 font-medium text-sm md:text-base">Pengaturan video YouTube di beranda.</p></div>
          <button onClick={() => { pushHistory(); setCurrentVideo(null); setVideoForm({ judul: '', deskripsi: '', url: '' }); setIsEditingVideo(true); }} className="w-full md:w-auto bg-orange-500 text-white px-6 py-3.5 rounded-2xl md:rounded-full font-bold shadow-lg shadow-orange-500/30 hover:-translate-y-1 hover:bg-orange-600 transition-all flex items-center justify-center gap-2"><Plus size={20} /> Tambah Video</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {videos.length === 0 && <p className="text-gray-500 font-medium col-span-2">Belum ada video.</p>}
          {videos.map((vid) => {
            // PENGAMAN STRING PADA URL
            const urlStr = String(vid.url || '');
            const m = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
            const thumb = m && m[1] ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : "https://files.catbox.moe/3tf995.png";
            
            return (
              <div key={vid._id} className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4 md:gap-5">
                <div className="w-full sm:w-32 h-40 sm:h-24 relative rounded-xl overflow-hidden bg-black shrink-0"><img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-80" /><Youtube className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white" size={24} /></div>
                <div className="flex-1 w-full overflow-hidden text-center sm:text-left"><h4 className="font-bold text-gray-900 truncate mb-1">{vid.judul}</h4><p className="text-xs text-gray-500 truncate mb-3">{vid.url}</p>
                  <div className="flex gap-2 justify-center sm:justify-start">
                    <button onClick={() => { pushHistory(); setCurrentVideo(vid); setVideoForm({ judul: vid.judul, deskripsi: vid.deskripsi, url: vid.url }); setIsEditingVideo(true); }} className="flex-1 sm:flex-none sm:px-6 bg-gray-50 text-blue-600 py-2 rounded-xl font-bold text-xs flex justify-center items-center gap-1 border border-gray-200"><Edit size={14} /> Edit</button>
                    <button onClick={() => deleteVideo(vid._id)} className="w-12 bg-red-50 text-red-500 rounded-xl flex justify-center items-center"><Trash2 size={14} /></button>
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
        <div className="animate-in fade-in max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setIsEditingTool(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center border shadow-sm"><X size={20}/></button>
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
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold mb-4">{(!t.type || t.type === 'link') ? 'URL LINK' : 'APP HTML'}</span>
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

  const renderSettings = () => (
    <div className="animate-in fade-in max-w-4xl">
      <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-2">Akun Cloudinary</h1>
      <p className="text-gray-500 mb-8">Penyimpanan awan untuk auto-kompres WebP. Bisa ditumpuk banyak akun.</p>

      <form onSubmit={saveNewCloud} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Tambah Akun Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="block text-sm font-bold text-gray-700 mb-2">Cloud Name</label><input type="text" value={newCloud.name} onChange={e => setNewCloud({...newCloud, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" required placeholder="Contoh: dpqzxxx" /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-2">Upload Preset (Unsigned)</label><input type="text" value={newCloud.preset} onChange={e => setNewCloud({...newCloud, preset: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" required placeholder="Contoh: tk_upload" /></div>
        </div>
        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-black transition-colors flex justify-center items-center gap-2">
          <Plus size={20} /> Tambahkan Akun
        </button>
      </form>

      <h3 className="font-bold text-xl mb-4 text-gray-900">Daftar Akun Tersimpan</h3>
      <div className="space-y-4">
        {cloudAccounts.length === 0 && <p className="text-gray-500 bg-white p-6 rounded-2xl border text-center font-medium">Belum ada akun tersimpan.</p>}
        {cloudAccounts.map(c => (
          <div key={c._id} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${c.active ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:border-blue-300'}`}>
            <div>
              <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-1">
                {c.name} {c.active && <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider">AKTIF DIGUNAKAN</span>}
              </h4>
              <p className="text-sm text-gray-500 font-medium">Preset: {c.preset}</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {!c.active && <button onClick={() => activateCloud(c._id)} className="flex-1 md:flex-none bg-white text-gray-800 border border-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 font-bold px-5 py-2.5 rounded-xl text-sm shadow-sm transition-all">Gunakan Ini</button>}
              <button onClick={() => deleteCloud(c._id)} className="w-12 h-11 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f4f6] font-sans text-gray-800 flex flex-col md:flex-row">
      {isLoading && renderLoader()}
      {renderNotification()}
      {renderAssetLibraryModal()}
      {renderSidebar()}
      <main className="flex-1 md:ml-72 p-4 pt-6 md:p-12 overflow-x-hidden min-h-screen">
        <div className="max-w-5xl mx-auto pb-24">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'visuals' && renderVisualManager()}
          {activeTab === 'news' && renderNewsManager()}
          {activeTab === 'videos' && renderVideosManager()}
          {activeTab === 'tools' && renderToolsManager()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>
    </div>
  );
}
