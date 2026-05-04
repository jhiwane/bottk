"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, X, MessageCircle, Info, Newspaper, Youtube, Rocket, 
  ArrowLeft, BookOpen, Heart, Shapes, CheckCircle, ChevronLeft, 
  ChevronRight, Phone, MapPin, Mail, PlayCircle, Hand, Home, Image as ImageIcon, Building, FileText
} from 'lucide-react';

// === DATA BAWAAN / DEFAULT ===
const defaultNews = [{
  title: "Profil sekolah",
  date: "20 januari 2026",
  content: `Tetap stay di web kami bunda. segala informasi nanti kami update bisa lihat foto. Untuk melihat aktivitas bisa ke channel video youtube kami bunda. <br><br><span class="text-xs text-gray-500 italic">jika video tidak bisa dibuka di web ada tulisan kecil dibawah buka app youtube.</span>`,
  images: ["https://res.cloudinary.com/duiir5ek2/image/upload/v1769449099/yebafqfauc1comzntgcn.jpg"],
  gallery: [
    { group: 'foto_1', type: 'image', src: "https://res.cloudinary.com/duiir5ek2/image/upload/v1769449099/yebafqfauc1comzntgcn.jpg", caption: "Dokumentasi" },
    { group: 'video_1', type: 'video', src: "https://youtu.be/s3m7RsCY_TM", caption: "Video Profil" }
  ]
}];

const defaultVideos = [{
  url: "https://youtu.be/s3m7RsCY_TM",
  judul: "Profil sekolah",
  deskripsi: "Profil TK Baiturrohman."
}];

const defaultHeroImages = [
  "https://images.unsplash.com/photo-1587691592099-24045742c181?q=80&w=2073&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2120&auto=format&fit=crop"
];

// === FUNGSI HELPER ===
const getYouTubeId = (url) => {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})/);
  return m ? m[1] : null;
};

export default function Page() {
  // === STATE MANAGEMENT TINGKAT TINGGI ===
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('home'); 
  
  // Data State
  const [newsData, setNewsData] = useState(defaultNews);
  const [videoData, setVideoData] = useState(defaultVideos);
  const [toolsData, setToolsData] = useState([]);
  
  // Modals & Detail State
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [currentDetail, setCurrentDetail] = useState(null);
  const [iframeData, setIframeData] = useState({ url: '', title: '' });
  const [isLoadingIframe, setIsLoadingIframe] = useState(false);
  const [mediaViewerData, setMediaViewerData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Slideshow State
  const [heroIndex, setHeroIndex] = useState(0);
  const [newsSlideIndex, setNewsSlideIndex] = useState(0);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);

  // === EFFECTS ===
  
  // 1. Initial Load & Fake API Fetch
  useEffect(() => {
    const loadContent = async () => {
      try {
        const res = await fetch('/api/content?t=' + new Date().getTime());
        const data = await res.json();
        if (data.news && data.news.length > 0) setNewsData(data.news);
        if (data.videos && data.videos.length > 0) setVideoData(data.videos);
        if (data.tools) setToolsData(data.tools.filter(t => t.name !== "HIDDEN_NEWS_HTML"));
      } catch (e) {
        setNewsData(defaultNews);
        setVideoData(defaultVideos);
      } finally {
        setTimeout(() => setIsLoadingGlobal(false), 800);
      }
    };
    loadContent();
  }, []);

  // 2. Hero Slideshow Auto-play
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % defaultHeroImages.length);
    }, 6000);
    return () => clearInterval(heroInterval);
  }, []);

  // 3. News Detail Slideshow Auto-play
  useEffect(() => {
    let newsInterval;
    if (activeView === 'detailNews' && currentDetail?.images?.length > 1) {
      newsInterval = setInterval(() => {
        setNewsSlideIndex(prev => (prev + 1) % currentDetail.images.length);
      }, 3000);
    } else {
      setNewsSlideIndex(0);
    }
    return () => clearInterval(newsInterval);
  }, [activeView, currentDetail]);

  // 4. Kunci Scroll Body saat Modal/Sidebar terbuka
  useEffect(() => {
    if (isSidebarOpen || activeView !== 'home' || zoomImage || infoModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isSidebarOpen, activeView, zoomImage, infoModalOpen]);

  // === HANDLERS ===
  const handleScroll = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth * 0.8;
      ref.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
  };

  const openWhatsApp = (e) => {
    if(e) e.preventDefault();
    const phone = "62895391001402";
    let msg = "Halo Admin TK BAITURROHMAN...";
    
    if (e && e.target.id === 'waForm') {
      const nama = e.target.namaAnak.value;
      const umur = e.target.umur.value;
      const jk = e.target.jk.value;
      const ortu = e.target.namaOrtu.value;
      const alamat = e.target.alamat.value;
      msg = `Halo Admin TK BAITURROHMAN, saya ingin mendaftarkan anak saya.\n\n📋 *FORMULIR PENDAFTARAN*\n--------------------------------\n👤 *Nama Anak:* ${nama}\n🎂 *Umur:* ${umur} Tahun\n⚧ *Jenis Kelamin:* ${jk}\n👨‍👩‍👧 *Nama Ortu:* ${ortu}\n🏠 *Alamat:* ${alamat}\n--------------------------------\nMohon info selanjutnya. Terima kasih.`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openAppIframe = (url, title) => {
    setIsLoadingIframe(true);
    setIframeData({ url, title });
    setActiveView('iframe');
    setIsSidebarOpen(false);
  };

  // === RENDERERS (KOMPONEN UI) ===

  const renderLoader = () => (
    <div className={`fixed inset-0 bg-white/95 backdrop-blur-xl z-[50000] flex justify-center items-center transition-opacity duration-500 ${isLoadingGlobal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <img src="https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyd3lvaDA3Y2V5ZG1hcjVudXEzZTZyenc1ZGpmOXF3Z2V1N3VzMjFtaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/rjZscpFx7CSYTOMSnN/giphy.gif" alt="Loading..." className="w-48 h-48 object-contain" />
    </div>
  );

  const renderNavbar = () => (
    <nav className="fixed w-full z-50 top-0 py-4 px-4 md:px-8 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/80 backdrop-blur-xl rounded-2xl md:rounded-full shadow-lg px-4 py-3 md:px-6 border border-white/50">
        <a href="#beranda" className="flex items-center gap-3">
          {/* Logo Tanpa Pembungkus */}
          <img src="/logotk.webp" alt="Logo" className="h-10 md:h-14 w-auto object-contain drop-shadow-md" />
          <div className="flex flex-col leading-none">
            {/* Teks Logo Diubah Ke Biru */}
            <span className="font-bold text-base md:text-xl text-blue-600 tracking-wide drop-shadow-sm">TK BAITURROHMAN</span>
            <span className="text-[10px] md:text-xs font-bold text-gray-500 tracking-wide mt-1">Membangun Generasi Baiti</span>
          </div>
        </a>
        <div className="flex items-center gap-2">
          <a href="#daftar" className="hidden md:block bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-full font-bold hover:shadow-xl transition transform hover:-translate-y-1 text-sm mr-4 border border-white/20">
            Daftar Sekarang
          </a>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="w-10 h-10 md:w-12 md:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );

  const renderSidebar = () => (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-2xl shadow-2xl z-[9999] transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col overflow-y-auto border-l border-white/50`}>
        <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex justify-between items-center rounded-bl-3xl shrink-0 shadow-md">
          <h3 className="font-bold text-xl">Menu Utama</h3>
          <button onClick={() => setIsSidebarOpen(false)} className="hover:rotate-90 transition-transform">
            <X size={24} />
          </button>
        </div>
        
        {/* Menu Items: Konsisten dan Formal (Hanya Biru & Oranye) */}
        <div className="flex flex-col p-6 gap-5 overflow-y-auto">
          <a href="#beranda" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><Home size={20} /></div> Beranda
          </a>
          <a href="#profil" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><Building size={20} /></div> Profil
          </a>
          <a href="#galeri" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><ImageIcon size={20} /></div> Galeri
          </a>
          <a href="#video" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><Youtube size={20} /></div> Video
          </a>
          
          <hr className="border-gray-200" />
          
          <button onClick={() => { setActiveView('listNews'); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 w-full transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><Newspaper size={20} /></div> Daftar Berita
          </button>
          <button onClick={() => { setActiveView('listVideo'); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 w-full transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><Youtube size={20} /></div> Daftar Video
          </button>
          <button onClick={() => { setActiveView('tools'); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 w-full transition-colors">
            <div className="w-8 flex justify-center text-blue-600"><Rocket size={20} /></div> Tools & Aplikasi
          </button>
          <button onClick={() => { setInfoModalOpen(true); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-700 hover:text-blue-600 flex items-center gap-4 w-full transition-colors">
            <div className="w-8 flex justify-center text-blue-600">
              <Info size={20} />
            </div> Info Terbaru
          </button>

          <hr className="border-gray-200" />

          {/* Tombol-Tombol Aksi (Hanya Biru & Oranye) */}
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSfdM7hAS0t6Pbt1Sb4B43flvSZ2pg8JWpdaVlP0y3lv1mV_xg/viewform?usp=publish-editor" target="_blank" rel="noreferrer" className="bg-white border-2 border-blue-600 text-blue-600 text-center py-3 rounded-xl font-bold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm">
            <FileText size={20} /> Form Pendaftaran
          </a>

          <a href="#daftar" onClick={() => setIsSidebarOpen(false)} className="bg-orange-500 text-white text-center py-4 rounded-xl font-bold shadow-lg hover:bg-orange-600 hover:-translate-y-1 transition-all">
            Daftar Sekarang
          </a>
          <button onClick={() => openWhatsApp()} className="bg-blue-600 text-white text-center py-4 rounded-xl font-bold shadow-lg hover:bg-blue-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
            <MessageCircle size={20} /> Hubungi WhatsApp
          </button>
        </div>
      </div>
    </>
  );

  const renderListModal = () => {
    const isNews = activeView === 'listNews';
    const data = isNews ? newsData : videoData;
    const filteredData = data.filter(item => 
      (item.title || item.judul || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className={`fixed inset-0 z-[2000] bg-white/95 backdrop-blur-xl transform transition-transform duration-300 flex flex-col ${activeView.startsWith('list') ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 shadow-sm flex items-center gap-4 z-10 border-b border-gray-100">
          <button onClick={() => { setActiveView('home'); setSearchQuery(''); }} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <input 
            type="text" 
            placeholder={`Cari ${isNews ? 'berita' : 'video'}...`} 
            className="flex-1 bg-gray-100 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 border border-transparent focus:border-blue-300 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
          {filteredData.length === 0 ? (
            <p className="text-center text-gray-500 mt-10 font-medium bg-white/80 p-6 rounded-2xl shadow-sm border border-gray-100">Tidak ada data ditemukan.</p>
          ) : (
            filteredData.map((item, idx) => {
              const title = item.title || item.judul;
              const date = item.date || 'Video';
              let thumb = "https://files.catbox.moe/3tf995.png";
              
              if (isNews && item.images && item.images.length > 0) thumb = item.images[0];
              if (!isNews && item.url) {
                const vid = getYouTubeId(item.url);
                if (vid) thumb = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
              }
              if (thumb.includes('cloudinary')) thumb = thumb.replace('/upload/', '/upload/w_200,q_auto,f_auto/');

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (isNews) {
                      if (item.type === 'html') {
                        openAppIframe(item.fileUrl, title);
                      } else {
                        setCurrentDetail(item);
                        setActiveView('detailNews');
                      }
                    } else {
                      window.open(item.url, '_blank');
                    }
                  }}
                  className="flex gap-4 bg-white p-3 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-[0.98] active:scale-95 border border-gray-100"
                >
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <img src={thumb} loading="lazy" className="w-full h-full object-cover rounded-xl bg-gray-100 border border-gray-50" alt="Thumbnail" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <h4 className="font-bold text-gray-800 line-clamp-2 text-sm md:text-base">{title}</h4>
                    <span className="text-xs text-orange-500 font-bold mt-2 block">{date}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderToolsModal = () => (
    <div className={`fixed inset-0 z-[2000] bg-white/95 backdrop-blur-xl transform transition-transform duration-300 flex flex-col ${activeView === 'tools' ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="sticky top-0 bg-white/90 backdrop-blur-md p-4 shadow-sm flex items-center gap-4 z-10 border-b border-gray-100">
        <button onClick={() => setActiveView('home')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h3 className="font-bold text-lg text-gray-800">Tools & Aplikasi</h3>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto">
        {toolsData.length === 0 ? (
          <p className="col-span-2 md:col-span-4 text-center text-gray-500 mt-10 bg-white/80 p-6 rounded-2xl shadow-sm border border-gray-100">Belum ada tools.</p>
        ) : (
          toolsData.map((t, idx) => {
            const link = (t.type === 'html_code') ? `/api/render?id=${t._id}` : t.url;
            return (
              <div 
                key={idx} 
                onClick={() => openAppIframe(link, t.name)} 
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all active:scale-95"
              >
                <div className="w-16 h-16 bg-blue-50/80 rounded-full flex items-center justify-center mb-3 text-blue-600 border border-blue-100 shadow-inner">
                  <Rocket size={28} />
                </div>
                <span className="font-bold text-center text-sm text-gray-800 line-clamp-2">{t.name}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const renderIframeModal = () => (
    <div className={`fixed inset-0 z-[11000] bg-white transform transition-transform duration-300 flex flex-col ${activeView === 'iframe' ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="sticky top-0 bg-white/95 backdrop-blur-md p-4 shadow-sm flex items-center gap-4 z-10 border-b">
        <button onClick={() => setActiveView('home')} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h3 className="font-bold text-lg text-gray-800 truncate">{iframeData.title || 'Aplikasi'}</h3>
      </div>
      <div className="flex-1 w-full relative bg-gray-50">
        {isLoadingIframe && (
          <div className="absolute inset-0 flex justify-center items-center backdrop-blur-sm bg-white/50 z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        )}
        {activeView === 'iframe' && (
          <iframe 
            src={iframeData.url} 
            className="w-full h-full border-0 absolute inset-0 z-10 bg-white" 
            onLoad={() => setIsLoadingIframe(false)}
            title={iframeData.title}
          />
        )}
      </div>
    </div>
  );

  const renderNewsFullPage = () => {
    if (!currentDetail) return null;
    return (
      <div className={`fixed inset-0 z-[2000] bg-white/95 backdrop-blur-xl transform transition-transform duration-300 overflow-y-auto ${activeView === 'detailNews' ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="sticky top-0 bg-white/90 backdrop-blur-md shadow-sm z-[201] px-4 py-3 flex items-center gap-4 border-b border-gray-100">
          <button onClick={() => setActiveView('listNews')} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h3 className="font-bold text-lg text-gray-800 truncate">Detail Kegiatan</h3>
        </div>
        
        <div className="max-w-5xl mx-auto bg-white/90 min-h-screen pb-24 border-x border-gray-100 shadow-sm">
          <div className="relative w-full h-[50vh] md:h-[70vh] bg-black overflow-hidden group cursor-pointer" onClick={() => { if(currentDetail.images?.length) setZoomImage(currentDetail.images[newsSlideIndex]); }}>
            {currentDetail.images?.map((src, i) => (
              <div key={i} className={`absolute inset-0 w-full h-full transition-opacity duration-1000 bg-black ${i === newsSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                <img src={src} loading="lazy" className="absolute inset-0 w-full h-full object-cover blur-md opacity-60 scale-110 z-0" alt="blur-bg" />
                <img src={src} loading="lazy" className="relative z-10 w-full h-full object-contain" alt="slide" />
              </div>
            ))}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none z-20" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white z-30 pointer-events-none">
              <span className="bg-orange-500/90 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs font-bold mb-4 inline-block tracking-widest uppercase shadow-lg border border-white/20">
                {currentDetail.date}
              </span>
              <h2 className="font-bold text-3xl md:text-5xl leading-tight drop-shadow-lg mb-2">{currentDetail.title}</h2>
            </div>
          </div>
          
          <div className="px-6 md:px-10 max-w-3xl mx-auto relative z-10 pt-8">
            <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
              <img src="/logotk.webp" loading="lazy" className="w-14 h-14 object-contain drop-shadow-md" alt="Admin" />
              <div><p className="font-bold text-gray-800 text-lg">Admin TK</p><p className="text-sm text-gray-500">Kegiatan Sekolah</p></div>
            </div>
            
            {currentDetail.gallery && currentDetail.gallery.length > 0 && (
               <div className="mb-6 flex gap-2 overflow-x-auto hide-scroll">
                  <button onClick={() => { setMediaViewerData(currentDetail); setActiveView('mediaViewer'); }} className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-4 py-2 rounded-xl border border-blue-200 flex gap-2 items-center text-sm whitespace-nowrap transition-colors">
                    <ImageIcon size={16}/> Lihat Semua Galeri Media
                  </button>
               </div>
            )}

            <div className="py-2 prose prose-lg prose-blue max-w-none text-gray-700 leading-loose" dangerouslySetInnerHTML={{ __html: currentDetail.content }} />
            
            <div className="mt-12 bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 border border-gray-100 shadow-xl">
              <div className="flex-1 text-center md:text-left">
                <h4 className="font-bold text-2xl text-gray-800 mb-2">Info Pendaftaran?</h4>
                <p className="text-gray-600">Hubungi kami via WhatsApp.</p>
              </div>
              <button onClick={() => openWhatsApp()} className="bg-blue-600 text-white py-4 px-10 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 flex gap-3 transition-all border border-blue-500">
                <MessageCircle size={24} /> Chat Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMediaViewer = () => {
    if (!mediaViewerData) return null;
    return (
      <div className={`fixed inset-0 z-[3000] bg-black/95 backdrop-blur-xl transform transition-transform duration-300 overflow-y-auto flex flex-col ${activeView === 'mediaViewer' ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        <div className="sticky top-0 left-0 right-0 bg-black/50 backdrop-blur-md z-[301] px-4 py-4 flex items-center border-b border-white/10">
          <button onClick={() => setActiveView('detailNews')} className="flex items-center gap-3 text-white hover:text-gray-300 transition-colors bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-full backdrop-blur-sm">
            <ArrowLeft size={20} /> Kembali
          </button>
        </div>
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col gap-8 pb-20 items-center justify-center mt-4">
          {mediaViewerData.gallery?.map((item, i) => {
            if (item.type === 'image') {
              return (
                <div key={i} className="w-full flex flex-col items-center relative">
                  <img src={item.src} loading="lazy" className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl mb-2 cursor-zoom-in" onClick={() => setZoomImage(item.src)} alt="Galeri" />
                  <p className="text-gray-400 text-sm italic text-center mt-2 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm">{item.caption}</p>
                </div>
              );
            } else if (item.type === 'video') {
              const vid = getYouTubeId(item.src);
              if (vid) {
                return (
                  <div key={i} className="w-full flex flex-col items-center">
                    <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mb-2 bg-black border border-white/10">
                      <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${vid}?rel=0`} frameBorder="0" allowFullScreen></iframe>
                    </div>
                    <p className="text-gray-400 text-sm italic text-center mb-1 mt-2 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm">{item.caption}</p>
                    <a href={`https://www.youtube.com/watch?v=${vid}`} target="_blank" rel="noreferrer" className="text-xs bg-blue-600/20 text-blue-400 px-4 py-2 rounded-full font-bold hover:bg-blue-600/40 transition-colors mb-4 flex items-center gap-2 mt-2">
                      <Youtube size={16} /> Buka di App YouTube
                    </a>
                  </div>
                );
              } else {
                return (
                  <div key={i} className="w-full flex flex-col items-center">
                    <video controls className="w-full max-h-[85vh] rounded-2xl shadow-2xl mb-2 bg-black border border-white/10">
                      <source src={item.src} type="video/mp4" />
                    </video>
                    <p className="text-gray-400 text-sm italic text-center mb-4 mt-2 bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm">{item.caption}</p>
                  </div>
                );
              }
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  // === RENDER UTAMA ===

  return (
    <div 
      className="font-sans text-gray-800 min-h-screen relative overflow-x-hidden bg-[#fafafb] bg-fixed"
      style={{ 
        backgroundImage: `
          radial-gradient(at 0% 0%, hsla(28, 100%, 74%, 0.5) 0px, transparent 65%),
          radial-gradient(at 100% 0%, hsla(38, 100%, 74%, 0.5) 0px, transparent 65%),
          radial-gradient(at 100% 100%, hsla(28, 100%, 74%, 0.5) 0px, transparent 65%),
          radial-gradient(at 0% 100%, hsla(200, 100%, 94%, 0.6) 0px, transparent 65%)
        `
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        html { scroll-behavior: smooth; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes kenburns { 0% { transform: scale(1) translate(0, 0); } 100% { transform: scale(1.15) translate(-2%, -2%); } }
        .animate-kenburns { animation: kenburns 20s ease-out infinite alternate; }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .8; transform: scale(1.05); } }
        .animate-pulse-slow { animation: pulse-slow 3s infinite; }
      `}} />

      {renderLoader()}
      {renderNavbar()}
      {renderSidebar()}
      
      {renderListModal()}
      {renderToolsModal()}
      {renderIframeModal()}
      {renderNewsFullPage()}
      {renderMediaViewer()}

      {/* Info Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setInfoModalOpen(false)}></div>
          <div className="relative bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 transform transition-all border border-white/50 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-b-[50%] -translate-y-12"></div>
            <div className="relative z-10 text-center pt-6">
              <div className="w-24 h-24 bg-white rounded-full mx-auto shadow-xl flex items-center justify-center mb-5 text-blue-600 border-4 border-blue-100">
                <Info size={40} className="animate-pulse" />
              </div>
              <h3 className="font-bold text-2xl text-gray-800 mb-2">Info Terbaru</h3>
              <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 mb-6 text-left text-sm text-gray-600 shadow-inner">
                Selamat datang di sistem baru TK Baiturrohman. Informasi PPDB dan formulir pendaftaran kini bisa diakses dari menu!
              </div>
              <button onClick={() => setInfoModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-full shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all transform hover:-translate-y-1 border border-white/20 w-full">Tutup Info</button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[12000] flex flex-col justify-center items-center animate-in fade-in duration-200">
          <div className="fixed top-0 left-0 w-full p-4 flex justify-between z-[12001] bg-gradient-to-b from-black/80 to-transparent">
             <span className="text-white/80 text-sm font-bold drop-shadow-md bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Ketuk gambar untuk menutup</span>
             <button onClick={() => setZoomImage(null)} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 border border-white/20 transition-colors">
                 <X size={28} />
             </button>
          </div>
          <img src={zoomImage} className="max-w-[100vw] max-h-[100vh] object-contain cursor-zoom-out" onClick={() => setZoomImage(null)} alt="Zoom" />
        </div>
      )}

      {/* MAIN HOMEPAGE */}
      <div style={{ display: activeView === 'home' ? 'block' : 'none' }}>
        
        {/* HERO SECTION */}
        <header id="beranda" className="relative w-full h-[100dvh] overflow-hidden flex items-center justify-center text-center bg-gray-900">
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/10 z-10 pointer-events-none"></div>
          {defaultHeroImages.map((src, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-1500 ease-in-out ${i === heroIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}>
               <img src={src} loading="lazy" className="w-full h-full object-cover animate-kenburns" alt="Hero Background" />
            </div>
          ))}
          
          <div className="relative z-20 max-w-4xl px-6 flex flex-col items-center justify-center h-full pt-32 md:pt-44 pb-32">
             <div className="animate-in slide-in-from-bottom-10 fade-in duration-1000 delay-200">
                 <span className="inline-block py-2 px-5 rounded-full bg-black/30 backdrop-blur-md border border-white/30 text-white font-bold text-xs md:text-sm mb-6 animate-pulse-slow shadow-lg">
                    ✨ Pendaftaran Siswa Baru Telah Dibuka
                 </span>
                 <h1 className="font-display text-4xl md:text-7xl font-bold text-white mb-6 drop-shadow-2xl leading-tight">
                    Bermain, Belajar & <br/><span className="text-orange-400 drop-shadow-lg">Bertumbuh Bersama</span>
                 </h1>
                 <p className="text-base md:text-2xl text-white/95 mb-10 font-medium max-w-2xl mx-auto drop-shadow-md">
                    TK Baiturrohman membentuk karakter anak yang cerdas, kreatif, berakhlak mulia, Bertaqwa, Dan Berguna.
                 </p>
                 <div className="flex flex-col md:flex-row gap-4 justify-center w-full md:w-auto">
                    <a href="#daftar" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-full text-lg shadow-[0_10px_20px_rgba(249,115,22,0.4)] transition-transform hover:-translate-y-1 w-full md:w-auto border border-white/20">
                      Daftar Sekarang
                    </a>
                 </div>
             </div>
          </div>
          
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-20 pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(146%_+_1.3px)] h-[80px] text-white/40 fill-current backdrop-blur-sm">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
             </svg>
          </div>
        </header>

        {/* FEATURES (Konsisten Biru & Oranye Saja) */}
        <section className="relative -mt-10 z-30 px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 border border-white/60">
             <div className="text-center group">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 group-hover:bg-blue-600 transition-colors duration-300 text-blue-600 group-hover:text-white shadow-md border border-gray-100"><BookOpen size={32}/></div>
               <h3 className="font-bold text-2xl mb-2 text-gray-800">Kurikulum Merdeka</h3>
               <p className="text-gray-600 font-medium">Pembelajaran berpusat pada minat anak.</p>
             </div>
             <div className="text-center group">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 group-hover:bg-orange-500 transition-colors duration-300 text-orange-500 group-hover:text-white shadow-md border border-gray-100"><Heart size={32}/></div>
               <h3 className="font-bold text-2xl mb-2 text-gray-800">Pendidikan Islam</h3>
               <p className="text-gray-600 font-medium">Penanaman nilai agama sejak dini.</p>
             </div>
             <div className="text-center group">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 group-hover:bg-blue-600 transition-colors duration-300 text-blue-600 group-hover:text-white shadow-md border border-gray-100"><Shapes size={32}/></div>
               <h3 className="font-bold text-2xl mb-2 text-gray-800">Fasilitas Lengkap</h3>
               <p className="text-gray-600 font-medium">Area bermain aman & edukatif.</p>
             </div>
          </div>
        </section>

        {/* PROFILE */}
        <section id="profil" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
             <div className="lg:w-1/2 relative h-96 md:h-[500px] w-full">
               <div className="absolute -top-4 -left-4 w-32 h-32 bg-orange-400/30 backdrop-blur-md rounded-full animate-float shadow-xl border border-white/60"></div>
               <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-blue-400/30 backdrop-blur-md rounded-full animate-float shadow-xl border border-white/60" style={{animationDelay: '1s'}}></div>
               <div className="w-full h-full relative rotate-2 hover:rotate-0 transition-transform duration-500 flex items-center justify-center">
                 <img src="https://res.cloudinary.com/duiir5ek2/image/upload/v1769449099/yebafqfauc1comzntgcn.jpg" loading="lazy" className="absolute inset-0 w-full h-full object-cover drop-shadow-2xl border-[10px] border-white/90 rounded-[3rem] z-20 shadow-[0_20px_50px_rgba(0,0,0,0.15)]" alt="Profile"/>
               </div>
             </div>
             <div className="lg:w-1/2 bg-white/70 backdrop-blur-xl p-8 md:p-10 rounded-[3rem] shadow-xl border border-white/60">
               <h4 className="text-orange-500 font-bold tracking-widest uppercase mb-3 drop-shadow-sm">Tentang Kami</h4>
               <h2 className="font-bold text-4xl text-gray-900 mb-6 leading-tight drop-shadow-sm">Mewujudkan Lingkungan Belajar yang <span className="text-orange-500 underline decoration-wavy">Ceria & Islami</span></h2>
               <p className="text-gray-700 mb-8 leading-relaxed font-medium text-lg">TK Baiturrohman berkomitmen untuk menyediakan pendidikan anak usia dini yang berkualitas. Kami percaya setiap anak adalah bintang yang memiliki potensi unik.</p>
               <ul className="space-y-4 mb-2">
                 <li className="flex items-center gap-4 bg-white/60 p-3.5 rounded-2xl border border-white/50 shadow-sm"><CheckCircle className="text-blue-600" size={24}/><span className="font-bold text-gray-800">Tenaga pendidik profesional</span></li>
                 <li className="flex items-center gap-4 bg-white/60 p-3.5 rounded-2xl border border-white/50 shadow-sm"><CheckCircle className="text-blue-600" size={24}/><span className="font-bold text-gray-800">Lingkungan asri & aman</span></li>
                 <li className="flex items-center gap-4 bg-white/60 p-3.5 rounded-2xl border border-white/50 shadow-sm"><CheckCircle className="text-blue-600" size={24}/><span className="font-bold text-gray-800">Ekstrakurikuler seni lukis</span></li>
                 <li className="flex items-center gap-4 bg-white/60 p-3.5 rounded-2xl border border-white/50 shadow-sm"><CheckCircle className="text-blue-600" size={24}/><span className="font-bold text-gray-800">Baca tulis al-qur'an</span></li>
               </ul>
             </div>
          </div>
        </section>

        {/* GALLERY / NEWS */}
        <section id="galeri" className="py-24 px-6 relative bg-white/40 backdrop-blur-xl border-y border-white/40 shadow-sm">
          <div className="max-w-7xl mx-auto mb-10 text-center">
             <h2 className="font-bold text-4xl md:text-5xl text-gray-900 mb-4 drop-shadow-sm">Galeri & Berita</h2>
             <p className="text-gray-700 font-medium max-w-xl mx-auto bg-white/60 px-6 py-2.5 rounded-full inline-block backdrop-blur-md border border-white/50 shadow-sm">Geser dan klik foto untuk melihat detail kegiatan.</p>
          </div>
          <div className="max-w-6xl mx-auto relative group rounded-[3rem] p-3 bg-white/50 backdrop-blur-2xl shadow-xl border border-white/60">
             <button onClick={() => handleScroll(galleryRef, -1)} className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/90 hover:bg-white text-blue-600 backdrop-blur-md transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg border border-white/50"><ChevronLeft size={28}/></button>
             <button onClick={() => handleScroll(galleryRef, 1)} className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white/90 hover:bg-white text-blue-600 backdrop-blur-md transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg border border-white/50"><ChevronRight size={28}/></button>
             
             <div ref={galleryRef} className="flex overflow-x-auto gap-5 hide-scroll snap-x snap-mandatory scroll-smooth h-[450px] rounded-[2.5rem] p-1">
                {newsData.map((n, i) => {
                  let img = n.images && n.images.length > 0 ? n.images[0] : "https://files.catbox.moe/3tf995.png";
                  if (img.includes('cloudinary')) img = img.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
                  const isHtml = n.type === 'html';
                  return (
                    <div key={i} onClick={() => { if(isHtml) openAppIframe(n.fileUrl, n.title); else { setCurrentDetail(n); setActiveView('detailNews'); } }} className="min-w-[85vw] md:min-w-[45%] lg:min-w-[35%] h-full relative snap-center rounded-[2.5rem] flex items-center justify-center cursor-pointer group/item flex-shrink-0 overflow-hidden shadow-lg border border-white/60 bg-black">
                      <img src={img} loading="lazy" className="absolute inset-0 w-full h-full object-cover blur-xl opacity-70 scale-110 z-0" alt="News Blur" />
                      <img src={img} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/item:scale-110 z-10" alt="News"/>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8 z-20">
                         <span className={`${isHtml ? 'bg-purple-600' : 'bg-blue-600'} text-white text-xs px-3.5 py-1.5 rounded-full mb-3 inline-block font-bold shadow-md border border-white/20 tracking-wide`}>{isHtml ? 'Aplikasi' : 'Berita'}</span>
                         <h3 className="text-white font-bold text-2xl group-hover/item:text-orange-400 transition-colors drop-shadow-md">{n.title}</h3>
                         <p className="text-white/90 font-medium text-sm mt-2 flex items-center gap-2 bg-black/30 w-max px-3 py-1 rounded-full backdrop-blur-sm"><Hand size={14}/> Klik untuk buka</p>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </section>

        {/* VIDEO (LAYOUT KARTU KREDIT) */}
        <section id="video" className="py-24 px-6 relative">
          <div className="max-w-5xl mx-auto text-center mb-12">
             <h2 className="font-bold text-4xl md:text-5xl text-gray-900 drop-shadow-sm bg-white/60 px-8 py-3 rounded-full inline-block backdrop-blur-md border border-white/50 shadow-sm">Video Kegiatan</h2>
          </div>
          
          <div className="relative w-full max-w-5xl mx-auto group bg-white/50 backdrop-blur-xl p-6 md:p-8 rounded-[3.5rem] shadow-xl border border-white/60">
             <button onClick={() => handleScroll(videoRef, -1)} className="absolute -left-6 md:-left-8 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.1)] border border-white/80 hover:scale-110 opacity-0 md:group-hover:opacity-100 transition-all"><ChevronLeft size={32}/></button>
             <button onClick={() => handleScroll(videoRef, 1)} className="absolute -right-6 md:-right-8 top-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-white/95 text-blue-600 flex items-center justify-center shadow-[0_10px_20px_rgba(0,0,0,0.1)] border border-white/80 hover:scale-110 opacity-0 md:group-hover:opacity-100 transition-all"><ChevronRight size={32}/></button>
             
             {/* Layout Kartu Rasio Pas (Sekitar 380px) */}
             <div ref={videoRef} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scroll gap-6 pb-4 pt-2 px-2">
                {videoData.map((v, i) => {
                  const id = getYouTubeId(v.url);
                  if(!id) return null;
                  const thumb = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
                  return (
                    <div key={i} className="w-[85vw] sm:w-[360px] md:w-[400px] flex-shrink-0 relative snap-center rounded-[2rem] overflow-hidden shadow-lg border border-white/80 bg-white/90 backdrop-blur-md group/vid hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                      <div className="relative w-full aspect-video bg-black cursor-pointer overflow-hidden border-b border-gray-100" onClick={() => window.open(v.url, '_blank')}>
                         <img src={thumb} loading="lazy" className="absolute top-0 left-0 w-full h-full object-cover opacity-90 group-hover/vid:opacity-100 group-hover/vid:scale-105 transition-all duration-500 z-0" alt="Thumb"/>
                         <div className="absolute inset-0 flex justify-center items-center z-10">
                            {/* Play Button Konsisten dengan Palet (Oranye) */}
                            <div className="w-[64px] h-[46px] bg-orange-500/95 backdrop-blur-sm rounded-[14px] flex items-center justify-center transform group-hover/vid:scale-110 transition-transform shadow-[0_8px_15px_rgba(249,115,22,0.4)] border border-orange-400/50">
                              <PlayCircle className="text-white" size={28}/>
                            </div>
                         </div>
                      </div>
                      <div className="p-6 text-left bg-white">
                         <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-1">{v.judul}</h3>
                         <p className="text-gray-600 font-medium line-clamp-2 text-sm leading-relaxed">{v.deskripsi}</p>
                         <div className="mt-5">
                            <a href={v.url} target="_blank" rel="noreferrer" className="text-sm bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 px-4 py-2.5 rounded-xl flex items-center justify-center w-full gap-2 transition-colors border border-blue-100"><Youtube size={18}/> Buka YouTube</a>
                         </div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </section>

        {/* REGISTRATION (TEMA BIRU) */}
        <section id="daftar" className="py-24 px-6 relative bg-white/40 backdrop-blur-xl border-y border-white/50 shadow-inner">
          <div className="max-w-5xl mx-auto bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/80">
             
             <div className="md:w-5/12 bg-gradient-to-br from-blue-500 to-blue-600 p-10 md:p-14 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
                <div className="relative z-10">
                   <h3 className="font-bold text-4xl mb-6 drop-shadow-md">Pendaftaran Online</h3>
                   <p className="text-blue-50 mb-10 text-lg font-medium leading-relaxed">Silahkan isi formulir di sini. Data akan otomatis terkirim ke nomor kepala sekolah.</p>
                   {/* Info Kontak Tanpa Pembungkus */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                         <Phone size={24} className="text-orange-400 drop-shadow-sm" />
                         <span className="font-bold text-xl drop-shadow-sm">0895-3910-01402</span>
                      </div>
                      <div className="flex items-start gap-4">
                         <MapPin size={24} className="mt-1 flex-shrink-0 text-orange-400 drop-shadow-sm" />
                         <span className="font-medium leading-relaxed drop-shadow-sm">Jl. Andong kencono No. III, Pulodarat RT 19 RW 02, Pecangaan, Jepara, Jawa Tengah.</span>
                      </div>
                   </div>
                </div>
                <div className="mt-12 relative z-10 w-full flex justify-center">
                   {/* Logo Murni */}
                   <img src="/logotk.webp" loading="lazy" className="w-32 drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)] object-contain hover:scale-105 transition-transform" alt="Logo"/>
                </div>
             </div>
             
             <div className="md:w-7/12 p-8 md:p-12 bg-white">
                <h3 className="font-bold text-3xl text-gray-900 mb-8">Formulir Calon Siswa</h3>
                <form id="waForm" className="space-y-6" onSubmit={openWhatsApp}>
                   <div>
                     <label className="block text-sm font-bold text-gray-800 mb-2">Nama Lengkap Anak</label>
                     <input type="text" name="namaAnak" required className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-sm text-gray-800" placeholder="Contoh: Ahmad Zaky"/>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Umur (Tahun)</label>
                        <input type="number" name="umur" required className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-sm text-gray-800" placeholder="Ex: 5"/>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Jenis Kelamin</label>
                        <select name="jk" className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors appearance-none shadow-sm cursor-pointer text-gray-800">
                           <option>Laki-laki</option>
                           <option>Perempuan</option>
                        </select>
                      </div>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-800 mb-2">Nama Orang Tua / Wali</label>
                     <input type="text" name="namaOrtu" required className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors shadow-sm text-gray-800" placeholder="Contoh: Bpk. Budi"/>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-800 mb-2">Alamat Domisili</label>
                     <textarea name="alamat" rows="3" required className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors resize-none shadow-sm text-gray-800" placeholder="Alamat lengkap..."></textarea>
                   </div>
                   <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg py-5 rounded-xl shadow-[0_10px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.4)] transition-all transform hover:-translate-y-1 flex justify-center items-center gap-3 border border-orange-400">
                      <MessageCircle size={24}/> Kirim Pendaftaran via WA
                   </button>
                </form>
             </div>
          </div>
        </section>

        {/* MAPS */}
        <section id="lokasi" className="py-16 px-6 relative">
          <div className="max-w-5xl mx-auto text-center">
             <h2 className="font-bold text-4xl text-gray-900 mb-8 drop-shadow-sm bg-white/60 px-8 py-3 rounded-full inline-block backdrop-blur-md border border-white/50 shadow-sm">Lokasi Sekolah</h2>
             <div className="w-full h-[450px] rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white/90 relative group bg-white/50 backdrop-blur-xl p-2">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5804911944147!2d110.71185243070909!3d-6.6987642984019065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e70dffdf8c9501b%3A0xa0ec339baa98c01e!2sTK%20BAITURROHMAN%20Pulodarat!5e0!3m2!1sid!2sid!4v1769270324442!5m2!1sid!2sid" className="w-full h-full border-0 rounded-[2.5rem]" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map"></iframe>
             </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-slate-900/95 backdrop-blur-2xl text-white pt-20 pb-10 px-6 mb-0 overflow-hidden border-t border-white/10">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
             <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-5 mb-6">
                   {/* Logo Footer Murni */}
                   <img src="/logotk.webp" loading="lazy" className="h-20 w-auto object-contain drop-shadow-[0_5px_15px_rgba(255,255,255,0.2)]" alt="Logo"/>
                   <span className="font-bold text-3xl text-white drop-shadow-md tracking-wide">TK BAITURROHMAN</span>
                </div>
                <p className="text-gray-300 mb-6 max-w-sm text-lg font-medium leading-relaxed">Membentuk generasi masa depan yang cerdas, kreatif, dan religius berakhlak mulia dan Baiti (Baiturrohman islami).</p>
             </div>
             <div>
                <h4 className="font-bold text-xl mb-6 text-orange-500">Tautan Cepat</h4>
                <ul className="space-y-4 text-gray-300 font-medium">
                   <li><a href="#beranda" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Beranda</a></li>
                   <li><a href="#profil" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Tentang Kami</a></li>
                   <li><button onClick={() => setActiveView('listNews')} className="hover:text-white hover:translate-x-1 inline-block transition-transform">Galeri Foto</button></li>
                   <li><a href="#daftar" className="hover:text-white hover:translate-x-1 inline-block transition-transform">Info PPDB</a></li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-xl mb-6 text-orange-500">Hubungi Kami</h4>
                {/* Info Footer Tanpa Pembungkus */}
                <ul className="space-y-4 text-gray-300 font-medium">
                   <li className="flex items-center gap-4 transition-colors"><Phone size={20} className="text-blue-500"/><span className="font-bold text-white">0895-3910-01402</span></li>
                   <li className="flex items-center gap-4 transition-colors"><Mail size={20} className="text-blue-500"/><span className="truncate">dapodiktkbaiturrohman@gmail.com</span></li>
                   <li className="flex items-start gap-4 transition-colors"><MapPin size={20} className="mt-1 flex-shrink-0 text-blue-500"/><span className="leading-relaxed">Pulodarat RT 19 RW 02, Pecangaan, Jepara.</span></li>
                </ul>
             </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-400 text-sm font-medium flex flex-col md:flex-row justify-center items-center gap-2">
             <p>© 2026 TK Baiturrohman Pulodarat. All Rights Reserved.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
