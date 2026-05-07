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
  
  // FIX: Mendukung banyak foto sekaligus (array srcs)
  const [newGalleryItem, setNewGalleryItem] = useState({ group: '', type: 'image', srcs: [], caption: '' });

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
        showNotif('Sesi kedaluwarsa atau password salah.', 'error');
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
        } else showNotif(`Gagal: ${data.error?.message}`, 'error');
      } catch (err) { showNotif('Error upload jaringan.', 'error'); }
    }
    setIsUploading(false);
    return uploadedUrls;
  };

  // --- MENGELOLA TAMPILAN WEB (HERO & PROFIL) ---
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
      // Menambahkan ke array gambar (bisa pilih banyak berulang kali)
      setNewGalleryItem(prev => ({ ...prev, srcs: [...(prev.srcs || []), url] }));
    } else if (assetTarget === 'editor') {
      insertAtCursor(`<img src="${url}" alt="Gambar Sisipan" loading="lazy" class="rounded-xl my-4 w-full h-auto shadow-sm" />`);
    } else if (assetTarget === 'heroImages') {
      setConfigForm(prev => ({ ...prev, heroImages: [...(prev.heroImages || []), url] }));
    } else if (assetTarget === 'profileImages') {
      setConfigForm(prev => ({ ...prev, profileImages: [...(prev.profileImages || []), url] }));
    }
    setIsAssetLibraryOpen(false);
    showNotif('Aset dipilih!');
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

  const handleEditorImageUpload = async (e) => {
    const urls = await uploadToCloudinary(Array.from(e.target.files));
    if (urls.length > 0) {
      const htmlToInsert = urls.map(url => `<br><img src="${url}" alt="Gambar Sisipan" loading="lazy" class="rounded-xl my-4 w-full h-auto shadow-sm" /><br>`).join('\n');
      insertAtCursor(htmlToInsert);
      showNotif(`Berhasil menyisipkan ${urls.length} gambar ke dalam teks.`);
    }
    e.target.value = '';
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
    if (urls.length > 0) setNewGalleryItem(prev => ({ ...prev, srcs: [...(prev.srcs || []), ...urls] })); 
    e.target.value = '';
  };

  // IDE BRILIAN: Tombol Tambah Langsung Inject Link ke Text Editor
  const addGalleryItem = () => {
    if (!newGalleryItem.srcs || newGalleryItem.srcs.length === 0) return showNotif('Foto belum dipilih/diupload!', 'error');
    if (!newGalleryItem.group) return showNotif('Nama Kategori Folder wajib diisi!', 'error');
    
    // Tentukan ID grup 
    const groupId = newGalleryItem.group; 
    
    const itemsToAdd = newGalleryItem.srcs.map(src => {
       let type = 'image';
       if (src.includes('youtu') || src.match(/\.(mp4|webm|ogg)$/i)) type = 'video';
       return {
         group: groupId,
         type: type,
         src: src,
         caption: newGalleryItem.caption
       };
    });

    setNewsForm(prev => ({ ...prev, gallery: [...(prev.gallery || []), ...itemsToAdd] }));
    
    // INJECT LINK OTOMATIS KE TEXT EDITOR (Desain Tombol Elegan di dalam Artikel)
    const catLink = `\n<br><p class="text-center my-4"><a onclick="openMediaViewer(null, '${groupId}')" class="inline-block bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-5 py-3 rounded-xl text-sm cursor-pointer border border-blue-200 shadow-sm transition-colors">👉 Lihat Galeri Kategori: ${groupId}</a></p><br>\n`;
    insertAtCursor(catLink);

    setNewGalleryItem({ group: '', type: 'image', srcs: [], caption: '' }); 
    showNotif(`${itemsToAdd.length} media masuk Galeri & Link otomatis ditambahkan ke teks!`);
  };

  const removeGalleryItem = (index) => {
    setNewsForm(prev => ({ ...prev, gallery: prev.gallery.filter((_, idx) => idx !== index) }));
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
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} required autoFocus className="w-full mt-6 px-5 py-4 rounded-2xl bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center text-xl font-bold tracking-widest text-gray-800 mb-6 border border-gray-200" placeholder="••••••••" />
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

  const renderNotification = () => {
    if (!notification) return null;
    return (
      <div className="fixed top-6 right-4 md:right-6 z-[60000] animate-in slide-in-from-right-8 fade-in duration-300">
        <div className={`flex items-center gap-3 px-5 py-3 md:px-6 md:py-4 rounded-2xl shadow-xl backdrop-blur-md border ${notification.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-700' : 'bg-green-50/90 border-green-200 text-green-700'}`}>
          <AlertCircle size={20} />
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      </div>
    );
  };

  const renderAssetLibraryModal = () => {
    if (!isAssetLibraryOpen) return null;
    const assets = getAllHistoryAssets();
    return (
      <div className="fixed inset-0 z-[40000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="font-bold text-lg flex items-center gap-2"><BookOpen size={20}/> Riwayat Media Web</h3>
            <button onClick={() => setIsAssetLibraryOpen(false)} className="p-2 bg-white rounded-full hover:bg-gray-100"><X size={20}/></button>
          </div>
          <div className="p-4 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 content-start">
            {assets.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">Belum ada riwayat gambar di database.</p>}
            {assets.map((url, i) => {
               const strUrl = String(url || '');
               const thumb = strUrl.includes('cloudinary') ? strUrl.replace('/upload/', '/upload/w_200,q_auto,f_auto/') : strUrl;
               return (
                 <div key={i} onClick={() => handleSelectAsset(strUrl)} className="relative w-full pb-[100%] rounded-xl overflow-hidden cursor-pointer hover:ring-4 hover:ring-blue-500 transition-all shadow-sm bg-gray-100 block">
                   {thumb && <img src={thumb} className="absolute inset-0 w-full h-full object-cover" />}
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
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><LayoutDashboard size={20} /></div><h1 className="font-bold text-gray-900 leading-tight">Admin TK</h1></div>
        <button onClick={() => { pushHistory(); setIsMobileMenuOpen(true); }} className="p-2 bg-gray-50 border border-gray-200 rounded-xl"><Menu size={22} /></button>
      </div>

      <div className={`fixed inset-0 bg-black/50 z-[9998] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}></div>

      <aside className={`fixed left-0 top-0 h-full w-72 max-w-[85vw] bg-white border-r border-gray-100 shadow-xl flex flex-col z-[9999] transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 pb-2 flex justify-between items-center mt-2"><div className="flex items-center gap-3"><div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><LayoutDashboard size={24} /></div><div><h2 className="font-bold text-xl text-gray-900">Admin TK</h2><p className="text-[10px] font-bold text-gray-500 tracking-wider">DATABASE</p></div></div><button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2"><X size={20} /></button></div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <button onClick={() => selectTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => selectTab('visuals')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'visuals' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><ImagePlus size={20} /> Tampilan Web</button>
          <button onClick={() => selectTab('news')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'news' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Newspaper size={20} /> Berita & Folder</button>
          <button onClick={() => selectTab('videos')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'videos' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Youtube size={20} /> Video Utama</button>
          <button onClick={() => selectTab('tools')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'tools' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Rocket size={20} /> Tools HTML</button>
          <div className="h-px bg-gray-100 my-4 mx-2"></div>
          <button onClick={() => selectTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={20} /> Multi Cloudinary</button>
        </nav>
        <div className="p-4 mt-auto border-t border-gray-100">
          <button onClick={handleLogout} className="w-full mb-2 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold transition-colors hover:bg-red-100"><LogOut size={18} /> Logout Aman</button>
          <a href="/" target="_blank" className="w-full flex items-center justify-center gap-2 bg-gray-50 text-gray-700 px-4 py-3 rounded-xl font-bold border border-gray-200 transition-colors hover:bg-gray-100">Lihat Web Publik</a>
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
          <button onClick={() => { setAssetTarget('profileImages'); setIsAssetLibraryOpen(true); }} className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><BookOpen size={18} /> Riwayat</button>
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
          <button onClick={() => { setAssetTarget('heroImages'); setIsAssetLibraryOpen(true); }} className="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"><BookOpen size={18} /> Riwayat</button>
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
        <Save size={20} /> Simpan Tampilan (Muncul di Web)
      </button>
    </div>
  );

  const renderCloudSettings = () => (
    <div className="animate-in fade-in max-w-4xl">
      <h1 className="font-bold text-3xl md:text-4xl text-gray-900 mb-2">Akun Cloudinary</h1>
      <p className="text-gray-500 mb-8">Penyimpanan awan untuk auto-kompres WebP. Bisa tambah banyak akun.</p>

      <form onSubmit={saveNewCloud} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-8">
        <h3 className="font-bold text-xl mb-4 text-gray-800">Tambah Akun Baru</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div><label className="block text-sm font-bold text-gray-700 mb-2">Cloud Name</label><input type="text" value={newCloud.name} onChange={e => setNewCloud({...newCloud, name: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" required placeholder="Contoh: dpqzxxx" /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-2">Upload Preset (Unsigned)</label><input type="text" value={newCloud.preset} onChange={e => setNewCloud({...newCloud, preset: e.target.value})} className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all" required placeholder="Contoh: tk_upload" /></div>
        </div>
        <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-md hover:bg-black transition-colors flex justify-center items-center gap-2">
          <Plus size={20} /> Tambahkan & Simpan Akun
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

  const renderNewsManager = () => {
    if (isEditingNews) {
      return (
        <div className="animate-in fade-in max-w-5xl">
          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setIsEditingNews(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"><X size={20}/></button>
            <h1 className="font-bold text-2xl md:text-3xl text-gray-900">{currentNews ? 'Edit Berita' : 'Tulis Berita Profesional'}</h1>
          </div>
          <form onSubmit={handleSaveNews} className="space-y-6 md:space-y-8 bg-white p-4 md:p-10 rounded-[2rem] border border-gray-100 shadow-sm">
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
                <label className="text-sm font-bold text-gray-700">Foto Thumbnail Utama</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAssetTarget('news_images'); setIsAssetLibraryOpen(true); }} className="bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1 items-center"><BookOpen size={14}/> Riwayat</button>
                  <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1 items-center"><UploadCloud size={14} /> Upload <input type="file" multiple accept="image/*" onChange={handleNewsFileUpload} className="hidden" disabled={isUploading}/></label>
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

            {/* FOLDER GALERI MANAGER (FIX LAYOUT ANTI-BERANTAKAN) */}
            <div className="p-4 md:p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
              <label className="block text-sm font-bold text-blue-900 mb-4 flex items-center gap-2"><Building size={18}/> Kelola Galeri Kategori Tambahan</label>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-48 bg-gray-50 rounded-xl relative flex flex-wrap gap-2 p-3 shrink-0 border-2 border-dashed border-gray-300 min-h-[120px] items-center justify-center">
                  {newGalleryItem.srcs && newGalleryItem.srcs.length > 0 ? (
                    newGalleryItem.srcs.map((src, i) => (
                      <div key={i} className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-gray-300 group/thumb shadow-sm">
                        <img src={src} className="w-full h-full object-cover"/>
                        <button type="button" onClick={() => setNewGalleryItem(p => ({...p, srcs: p.srcs.filter((_,idx)=>idx!==i)}))} className="absolute inset-0 m-auto w-6 h-6 bg-red-500 flex items-center justify-center text-white rounded-full opacity-0 group-hover/thumb:opacity-100 transition-all"><X size={12}/></button>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-400 text-xs flex flex-col items-center"><ImageIcon size={24} className="mb-2 opacity-50"/> <p className="font-medium">Preview Foto</p></div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button type="button" onClick={() => { setAssetTarget('news_gallery'); setIsAssetLibraryOpen(true); }} className="flex-1 bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-3 rounded-xl text-xs font-bold flex justify-center items-center gap-1 border border-purple-200 transition-colors"><BookOpen size={14}/> Pilih dari Riwayat</button>
                    <label className="flex-1 cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-3 rounded-xl text-xs font-bold flex justify-center items-center gap-1 border border-blue-200 transition-colors"><UploadCloud size={14} /> Upload Foto Baru <input type="file" multiple accept="image/*" onChange={handleGalleryUpload} className="hidden" disabled={isUploading}/></label>
                  </div>
                  <input type="text" value={newGalleryItem.group} onChange={e => setNewGalleryItem({...newGalleryItem, group: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Nama Kategori Folder (Misal: Lomba Tarik Tambang)" />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input type="text" value={newGalleryItem.caption} onChange={e => setNewGalleryItem({...newGalleryItem, caption: e.target.value})} className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="Caption Foto (Opsional)..." />
                    <button type="button" onClick={addGalleryItem} className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm whitespace-nowrap shadow-md transition-all active:scale-95 w-full sm:w-auto">Tambah ke Galeri</button>
                  </div>
                </div>
              </div>

              {Array.isArray(newsForm.gallery) && newsForm.gallery.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {newsForm.gallery.map((g, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-200 relative group text-center flex flex-col items-center">
                      <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
                        {g.type === 'video' ? <div className="w-full h-full bg-black flex items-center justify-center"><Youtube className="text-white"/></div> : <img src={g.src} className="w-full h-full object-cover"/>}
                      </div>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded block truncate w-full mb-1">{g.group || 'Umum'}</span>
                      <button type="button" onClick={() => removeGalleryItem(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md transition-opacity"><X size={12}/></button>
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
                <button type="button" onClick={() => handleToolbarClick('quote')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 font-bold w-10">"</button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button type="button" onClick={() => handleToolbarClick('h2')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 font-bold text-xs w-10">H2</button>
                <button type="button" onClick={() => handleToolbarClick('h3')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 font-bold text-xs w-10">H3</button>
                <button type="button" onClick={() => handleToolbarClick('color')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200"><Palette size={16}/></button>
                <div className="w-px bg-gray-300 mx-1"></div>
                <button type="button" onClick={() => handleToolbarClick('link')} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 font-bold text-xs">URL</button>
                <button type="button" onClick={() => { setAssetTarget('editor'); setIsAssetLibraryOpen(true); }} className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200" title="Pilih dari Riwayat"><ImageIcon size={16} /></button>
                
                {/* UPLOAD MULTIPLE GAMBAR INLINE */}
                <label className="p-2 text-gray-700 hover:text-blue-600 bg-white shadow-sm rounded-lg border border-gray-200 cursor-pointer flex items-center justify-center" title="Upload Banyak Foto Menjadi Teks">
                  <UploadCloud size={16} />
                  <input type="file" multiple accept="image/*" onChange={handleEditorImageUpload} className="hidden" disabled={isUploading}/>
                </label>

                <button type="button" onClick={() => handleToolbarClick('youtube')} className="p-2 text-gray-700 hover:text-red-500 bg-white shadow-sm rounded-lg border border-gray-200"><Youtube size={16} /></button>
              </div>
              <textarea ref={contentRef} value={newsForm.content} onChange={e => setNewsForm({...newsForm, content: e.target.value})} required rows="10" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-y text-gray-800 leading-relaxed"></textarea>
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg"><CheckCircle size={20} className="inline mr-2"/> Simpan Berita</button>
          </form>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900">Kelola Berita</h1>
          <button onClick={() => { pushHistory(); setCurrentNews(null); setNewsForm({ title: '', content: '', images: [], gallery: [], date: '' }); setIsEditingNews(true); }} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl md:rounded-full font-bold flex justify-center items-center gap-2 shadow-md hover:-translate-y-1 transition-transform"><Plus size={20} /> Tulis Berita Baru</button>
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
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Judul Video</label><input type="text" value={videoForm.judul} onChange={e=>setVideoForm({...videoForm, judul: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold text-gray-900" placeholder="Lomba Agustusan" /></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Deskripsi Video</label><textarea value={videoForm.deskripsi} onChange={e=>setVideoForm({...videoForm, deskripsi: e.target.value})} required rows="3" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none text-gray-800" placeholder="Deskripsi..."></textarea></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Link URL YouTube</label><input type="url" value={videoForm.url} onChange={e=>setVideoForm({...videoForm, url: e.target.value})} required className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800" placeholder="https://youtube.com/watch?v=..." /></div>
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-transform hover:-translate-y-1 flex justify-center items-center gap-2"><Save size={20}/> Simpan Video</button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {videos.length === 0 && <p className="text-gray-500 font-medium bg-white p-6 rounded-2xl border text-center col-span-2">Belum ada video.</p>}
          {videos.map(v => {
            const urlStr = String(v?.url || '');
            const m = urlStr.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
            const thumb = m && m[1] ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : "https://files.catbox.moe/3tf995.png";
            return (
              <div key={v._id} className="bg-white p-4 md:p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-5 group hover:shadow-md transition-shadow">
                <div className="w-full sm:w-36 h-40 sm:h-24 relative rounded-xl overflow-hidden bg-black shrink-0"><img src={thumb} alt="thumb" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" /><Youtube className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-md" size={32} /></div>
                <div className="flex-1 w-full overflow-hidden text-center sm:text-left flex flex-col h-full"><h4 className="font-bold text-gray-900 line-clamp-2 mb-1">{v.judul}</h4><p className="text-xs text-gray-500 truncate mb-4">{v.url}</p>
                  <div className="flex gap-2 justify-center sm:justify-start mt-auto"><button onClick={() => { pushHistory(); setCurrentVideo(v); setVideoForm({judul: v.judul, deskripsi: v.deskripsi, url: v.url}); setIsEditingVideo(true); }} className="flex-1 sm:flex-none sm:px-6 bg-gray-50 hover:bg-blue-50 text-blue-600 border border-gray-200 py-2 rounded-xl font-bold text-xs flex justify-center items-center gap-1 transition-colors"><Edit size={14} /> Edit</button><button onClick={()=>deleteVideo(v._id)} className="w-12 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex justify-center items-center"><Trash2 size={14} /></button></div>
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
            <button onClick={() => setIsEditingTool(false)} className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex justify-center items-center border shadow-sm"><X size={20} className="text-gray-600" /></button>
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
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg"><CheckCircle size={20} className="inline mr-2"/> Simpan Menu Tool</button>
          </form>
        </div>
      );
    }
    return (
      <div className="animate-in fade-in">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="font-bold text-3xl md:text-4xl text-gray-900">Kelola Tools</h1>
          <button onClick={() => { pushHistory(); setCurrentTool(null); setToolForm({ name: '', url: '', type: 'link', content: '' }); setIsEditingTool(true); }} className="w-full md:w-auto bg-purple-600 text-white px-6 py-3.5 rounded-xl md:rounded-full font-bold flex justify-center items-center gap-2 shadow-md"><Plus size={20} /> Tambah Tool</button>
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
      {renderAssetLibraryModal()}
      {renderSidebar()}
      <main className="flex-1 md:ml-72 p-4 pt-6 md:p-12 overflow-x-hidden min-h-screen">
        <div className="max-w-5xl mx-auto pb-24">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'visuals' && renderVisualManager()}
          {activeTab === 'news' && renderNewsManager()}
          {activeTab === 'videos' && renderVideosManager()}
          {activeTab === 'tools' && renderToolsManager()}
          {activeTab === 'settings' && renderCloudSettings()}
        </div>
      </main>
    </div>
  );
}
