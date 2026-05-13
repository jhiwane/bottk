"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
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
  images: ["https://images.unsplash.com/photo-1588075592446-265fd1e6e761?q=80&w=2072&auto=format&fit=crop"],
  gallery: [
    { group: 'foto_1', type: 'image', src: "https://images.unsplash.com/photo-1588075592446-265fd1e6e761?q=80&w=2072&auto=format&fit=crop", caption: "Dokumentasi Kelas" },
    { group: 'video_1', type: 'video', src: "https://youtu.be/s3m7RsCY_TM", caption: "Video Profil" }
  ]
}];

const defaultVideos = [{
  url: "https://youtu.be/s3m7RsCY_TM",
  judul: "Profil sekolah",
  deskripsi: "Profil TK Baiturrohman."
}];

const defaultHeroImages = [
];

// Fallback default profil agar ada 2 gambar untuk bisa bergantian
const defaultProfileImages = [
  "https://images.unsplash.com/photo-1588075592446-265fd1e6e761?q=80&w=2072&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop"
];

// FIX BUG: Algoritma cerdas untuk mendeteksi semua jenis link YouTube (Shorts, youtu.be, embed, watch)
const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function Page() {
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('home'); 
  
  const [newsData, setNewsData] = useState(defaultNews);
  const [videoData, setVideoData] = useState(defaultVideos);
  const [toolsData, setToolsData] = useState([]);
  
  // STATE TAMPILAN (HERO & PROFIL)
  const [heroImages, setHeroImages] = useState(defaultHeroImages);
  const [profileImages, setProfileImages] = useState(defaultProfileImages);
  
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [currentDetail, setCurrentDetail] = useState(null);
  const [iframeData, setIframeData] = useState({ url: '', title: '' });
  const [isLoadingIframe, setIsLoadingIframe] = useState(false);
  const [mediaViewerData, setMediaViewerData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [heroIndex, setHeroIndex] = useState(0);
  const [profileIndex, setProfileIndex] = useState(0); // Tambahan index untuk profil
  const [newsSlideIndex, setNewsSlideIndex] = useState(0);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);

  // FUNGSI NAVIGASI SWIPE BACK
  const pushHistory = () => {
    window.history.pushState({ open: true }, '');
  };

  const openAppIframe = (url, title) => {
    pushHistory();
    setIsLoadingIframe(true);
    setIframeData({ url, title });
    setActiveView('iframe');
    setIsSidebarOpen(false);
  };

  // SMART VIDEO EMBED
  const playVideo = (url, title) => {
    const ytId = getYouTubeId(url);
    if (ytId) {
      openAppIframe(`https://www.youtube.com/embed/${ytId}?autoplay=1`, title);
    } else {
      // Fallback jika berupa MP4 atau link lain, langsung putar di Iframe
      if (String(url).match(/\.(mp4|webm|ogg)$/i)) {
        openAppIframe(url, title);
      } else {
        window.open(url, '_blank');
      }
    }
  };

  useEffect(() => {
    let isMounted = true; 
    const loadContent = async () => {
      try {
        const res = await fetch('/api/content?t=' + new Date().getTime());
        const data = await res.json();
        if (!isMounted) return;
        
        if (data.news && data.news.length > 0) setNewsData(data.news);
        if (data.videos && data.videos.length > 0) setVideoData(data.videos);
        if (data.tools) setToolsData(data.tools.filter(t => t.name !== "HIDDEN_NEWS_HTML"));
        
        // Memuat gambar dari konfigurasi Admin
        if (data.config) {
          if (data.config.heroImages && data.config.heroImages.length > 0) setHeroImages(data.config.heroImages);
          if (data.config.profileImages && data.config.profileImages.length > 0) setProfileImages(data.config.profileImages);
        }
      } catch (e) {
        if (!isMounted) return;
        setNewsData(defaultNews);
        setVideoData(defaultVideos);
      } finally {
        if (isMounted) {
          setTimeout(() => setIsLoadingGlobal(false), 800);
        }
      }
    };
    loadContent();
    return () => { isMounted = false; };
  }, []);

  // ANIMASI ROTASI HERO
  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroIndex(prev => heroImages.length > 0 ? (prev + 1) % heroImages.length : 0);
    }, 6000);
    return () => clearInterval(heroInterval);
  }, [heroImages]);

  // ANIMASI ROTASI FOTO PROFIL
  useEffect(() => {
    const profileInterval = setInterval(() => {
      setProfileIndex(prev => profileImages.length > 0 ? (prev + 1) % profileImages.length : 0);
    }, 5000); 
    return () => clearInterval(profileInterval);
  }, [profileImages]);

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

  useEffect(() => {
    if (isSidebarOpen || activeView !== 'home' || zoomImage || infoModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isSidebarOpen, activeView, zoomImage, infoModalOpen]);

  // EVENT LISTENER UNTUK SWIPE BACK HP
  useEffect(() => {
    const handlePopState = () => {
      if (zoomImage) {
        setZoomImage(null);
      } else if (infoModalOpen) {
        setInfoModalOpen(false);
      } else if (isSidebarOpen) {
        setIsSidebarOpen(false);
      } else if (activeView !== 'home') {
        if (activeView === 'mediaViewer') {
           setActiveView('detailNews');
        } else {
           setActiveView('home');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [zoomImage, infoModalOpen, activeView, isSidebarOpen]);

  // Penghubung fungsi global untuk HTML murni dari DB
  useEffect(() => {
    window.openMediaViewer = (index, filter) => {
      const targetData = newsData[index] || currentDetail;
      if (!targetData) return;
      pushHistory();
      setMediaViewerData({ ...targetData, activeFilter: filter });
      setActiveView('mediaViewer');
    };
    window.openIframe = openAppIframe;
    
    return () => {
      delete window.openMediaViewer;
      delete window.openIframe;
    };
  }, [newsData, currentDetail]);

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
    if (e && e.target && e.target.id === 'waForm') {
      const nama = e.target.namaAnak.value;
      const umur = e.target.umur.value;
      const jk = e.target.jk.value;
      const ortu = e.target.namaOrtu.value;
      const alamat = e.target.alamat.value;
      msg = `Halo Admin TK BAITURROHMAN, saya ingin mendaftarkan anak saya.\n\n📋 *FORMULIR PENDAFTARAN*\n--------------------------------\n👤 *Nama Anak:* ${nama}\n🎂 *Umur:* ${umur} Tahun\n⚧ *Jenis Kelamin:* ${jk}\n👨‍👩‍👧 *Nama Ortu:* ${ortu}\n🏠 *Alamat:* ${alamat}\n--------------------------------\nMohon info selanjutnya. Terima kasih.`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const logoTightGlowStyle = {
    filter: 'drop-shadow(0px 0px 2px white) drop-shadow(0px 0px 5px white) drop-shadow(0px 0px 10px rgba(255,255,255,0.9))'
  };

  // === UI RENDERERS ===
  const renderLoader = () => (
    <div className={`fixed inset-0 bg-white/95 backdrop-blur-3xl z-[50000] flex justify-center items-center transition-opacity duration-700 ease-out ${isLoadingGlobal ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <Image src="https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyd3lvaDA3Y2V5ZG1hcjVudXEzZTZyenc1ZGpmOXF3Z2V1N3VzMjFtaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/rjZscpFx7CSYTOMSnN/giphy.gif" alt="Loading..." width={192} height={192} unoptimized className="object-contain animate-pulse-slow" />
    </div>
  );

  const renderNavbar = () => (
    <nav className="fixed w-full z-50 top-0 py-4 px-4 md:px-8 transition-all duration-500">
      <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/70 backdrop-blur-2xl rounded-3xl md:rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-3 md:px-6 border border-white/60">
        <a href="#beranda" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
          <div style={logoTightGlowStyle} className="flex items-center justify-center">
             <Image src="/logotk.webp" alt="Logo" width={56} height={56} className="h-10 md:h-12 w-auto object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg md:text-xl text-blue-600 tracking-tight">TK BAITURROHMAN</span>
            <span className="text-[10px] md:text-xs font-semibold text-gray-500 tracking-wide">Membangun Generasi Baiti</span>
          </div>
        </a>
        <div className="flex items-center gap-3">
          <a href="#daftar" className="hidden md:block bg-blue-600 text-white px-6 py-2.5 rounded-full font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5 text-sm">
            Daftar Sekarang
          </a>
          <button 
            onClick={() => { pushHistory(); setIsSidebarOpen(true); }} 
            className="w-11 h-11 md:w-12 md:h-12 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-full flex items-center justify-center transition-all duration-300"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </nav>
  );

  const renderSidebar = () => (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998] transition-opacity duration-500 ease-out ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white/95 backdrop-blur-3xl shadow-2xl z-[9999] transform transition-transform duration-500 ease-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col overflow-y-auto border-l border-white/60 rounded-l-[2rem]`}>
        <div className="p-8 pb-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-2xl text-gray-800 tracking-tight">Menu Utama</h3>
          <button onClick={() => setIsSidebarOpen(false)} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col p-6 gap-3 overflow-y-auto">
          <a href="#beranda" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300">
            <div className="w-8 flex justify-center text-blue-500"><Home size={22} /></div> Beranda
          </a>
          <a href="#profil" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300">
            <div className="w-8 flex justify-center text-blue-500"><Building size={22} /></div> Profil Sekolah
          </a>
          <a href="#galeri" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300">
            <div className="w-8 flex justify-center text-blue-500"><ImageIcon size={22} /></div> Galeri & Berita
          </a>
          <a href="#video" onClick={() => setIsSidebarOpen(false)} className="font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300">
            <div className="w-8 flex justify-center text-blue-500"><Youtube size={22} /></div> Video Kegiatan
          </a>
          
          <div className="h-px bg-gray-100 my-2"></div>
          
          <button onClick={() => { pushHistory(); setActiveView('listNews'); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 w-full">
            <div className="w-8 flex justify-center text-blue-500"><Newspaper size={22} /></div> Daftar Berita
          </button>
          <button onClick={() => { pushHistory(); setActiveView('listVideo'); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 w-full">
            <div className="w-8 flex justify-center text-blue-500"><Youtube size={22} /></div> Daftar Video
          </button>
          <button onClick={() => { pushHistory(); setActiveView('tools'); setIsSidebarOpen(false); }} className="text-left font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 p-3 rounded-2xl flex items-center gap-4 transition-all duration-300 w-full">
            <div className="w-8 flex justify-center text-blue-500"><Rocket size={22} /></div> Tools & Aplikasi
          </button>
          
          <div className="h-px bg-gray-100 my-2"></div>

          <a href="https://docs.google.com/forms/d/e/1FAIpQLSfdM7hAS0t6Pbt1Sb4B43flvSZ2pg8JWpdaVlP0y3lv1mV_xg/viewform?usp=publish-editor" target="_blank" rel="noreferrer" className="bg-gray-50 border border-gray-200 text-gray-700 text-center py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2 mt-2">
            <FileText size={20} className="text-blue-600" /> Form PPDB (Google)
          </a>

          <a href="#daftar" onClick={() => setIsSidebarOpen(false)} className="bg-orange-500 text-white text-center py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all mt-2">
            Daftar Sekarang
          </a>
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
      <div className={`fixed inset-0 z-[2000] bg-gray-50/90 backdrop-blur-2xl transform transition-transform duration-500 ease-out flex flex-col ${activeView.startsWith('list') ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="sticky top-0 bg-white/80 backdrop-blur-xl p-4 shadow-sm flex items-center gap-4 z-10 border-b border-gray-200/50">
          <button onClick={() => { setActiveView('home'); setSearchQuery(''); }} className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full shadow-sm border border-gray-100 flex justify-center items-center transition-all duration-300">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <input 
            type="text" 
            placeholder={`Cari ${isNews ? 'berita' : 'video'}...`} 
            className="flex-1 bg-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm border border-gray-100 text-gray-700 font-medium transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
          {filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center mt-20 opacity-50">
               <ImageIcon size={64} className="mb-4 text-gray-400" />
               <p className="text-center text-gray-500 font-bold text-lg">Tidak ada data ditemukan.</p>
            </div>
          ) : (
            filteredData.map((item, idx) => {
              const title = item.title || item.judul;
              const date = item.date || 'Video Kegiatan';
              let thumb = "https://files.catbox.moe/3tf995.png";
              
              if (isNews && item.images && item.images.length > 0) thumb = item.images[0];
              if (!isNews && item.url) {
                const vid = getYouTubeId(item.url);
                if (vid) thumb = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`;
              }
              if (typeof thumb === 'string' && thumb.includes('cloudinary')) {
                  thumb = thumb.replace('/upload/', '/upload/w_200,q_auto,f_auto/');
              }

              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (isNews) {
                      // FITUR FULL PAGE UNTUK HTML APP
                      if (item.type === 'html') { 
                        window.location.href = item.fileUrl; 
                      } else { 
                        pushHistory(); setCurrentDetail(item); setActiveView('detailNews'); 
                      }
                    } else { 
                      playVideo(item.url, title); 
                    }
                  }}
                  className="flex gap-5 bg-white p-4 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border border-gray-100"
                >
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <Image src={thumb} fill sizes="112px" className="object-cover rounded-2xl bg-gray-100" alt="Thumbnail" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-[11px] uppercase tracking-wider text-orange-500 font-bold mb-1">{date}</span>
                    <h4 className="font-bold text-gray-800 line-clamp-2 text-base md:text-lg leading-snug">{title}</h4>
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
    <div className={`fixed inset-0 z-[2000] bg-gray-50/90 backdrop-blur-2xl transform transition-transform duration-500 ease-out flex flex-col ${activeView === 'tools' ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="sticky top-0 bg-white/80 backdrop-blur-xl p-4 shadow-sm flex items-center gap-4 z-10 border-b border-gray-200/50">
        <button onClick={() => setActiveView('home')} className="w-12 h-12 bg-white hover:bg-gray-50 rounded-full shadow-sm border border-gray-100 flex justify-center items-center transition-all duration-300">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h3 className="font-bold text-xl text-gray-800 tracking-tight">Tools & Aplikasi</h3>
      </div>
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto">
        {toolsData.length === 0 ? (
           <p className="col-span-2 md:col-span-4 text-center text-gray-500 mt-10 font-bold">Belum ada tools tersedia.</p>
        ) : (
          toolsData.map((t, idx) => {
            const link = (t.type === 'html_code') ? `/api/render?id=${t._id}` : t.url;
            return (
              <div 
                key={idx} 
                onClick={() => {
                  // FITUR FULL PAGE UNTUK HTML APP & EXTERNAL LINK
                  if (t.type === 'html_code' || t.type === 'link') {
                    window.location.href = link;
                  }
                }} 
                className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 shadow-inner">
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
    <div className={`fixed inset-0 z-[11000] bg-black transform transition-transform duration-500 ease-out flex flex-col ${activeView === 'iframe' ? 'translate-y-0' : 'translate-y-full'}`}>
      <button onClick={() => setActiveView('home')} className="absolute top-4 left-4 w-12 h-12 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full flex justify-center items-center z-[11001] shadow-lg border border-white/20 transition-all">
        <ArrowLeft size={22} className="text-white" />
      </button>
      <div className="flex-1 w-full relative">
        {isLoadingIframe && (
          <div className="absolute inset-0 flex justify-center items-center z-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-white"></div>
          </div>
        )}
        {activeView === 'iframe' && (
          <iframe src={iframeData.url} className="w-full h-full border-0 absolute inset-0 z-10 bg-black" onLoad={() => setIsLoadingIframe(false)} title={iframeData.title} allowFullScreen allow="autoplay; encrypted-media"/>
        )}
      </div>
    </div>
  );

  // DESAIN BERITA RAPI LAYAKNYA PORTAL NEWS KORAN PROFESIONAL
  const renderNewsFullPage = () => {
    if (!currentDetail) return null;
    return (
      <div className={`fixed inset-0 z-[2000] bg-gray-100 transform transition-transform duration-500 ease-out overflow-y-auto ${activeView === 'detailNews' ? 'translate-y-0' : 'translate-y-full'}`} style={{ fontFamily: "'Open Sans', sans-serif" }}>
        
        {/* HEADER PORTAL NEWS */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => setActiveView('listNews')} className="text-gray-600 hover:text-red-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="text-xl md:text-2xl font-black text-red-600 tracking-tighter uppercase">TK BAITURROHMAN <span className="text-gray-800">NEWS</span></div>
                </div>
                <nav className="hidden md:flex space-x-6 font-bold text-sm uppercase">
                    <span className="text-red-600">Pendidikan</span>
                </nav>
            </div>
        </header>

        <div className="w-full bg-gray-200 h-1">
            <div className="bg-red-600 h-1 w-1/3"></div>
        </div>

        <main className="max-w-6xl mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* KONTEN ARTIKEL UTAMA */}
                <div className="lg:w-2/3 bg-white p-6 md:p-10 shadow-sm rounded-xl">
                    <div className="flex items-center text-xs mb-4 space-x-2 text-gray-500">
                        <span className="cursor-pointer hover:underline" onClick={() => setActiveView('home')}>Home</span>
                        <span>/</span>
                        <span className="cursor-pointer hover:underline">Pendidikan</span>
                        <span>/</span>
                        <span className="text-gray-400">Kegiatan Sekolah</span>
                    </div>

                    <div className="text-sm mb-2 text-green-700 font-bold uppercase tracking-widest">Info Sekolah</div>
                    
                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-6 text-gray-900 text-left">
                        {currentDetail.title}
                    </h1>

                    <div className="flex items-center space-x-3 mb-8 pb-6 border-b border-gray-100 text-sm">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">
                           <ImageIcon size={20}/>
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">Redaksi TK Baiturrohman</p>
                            <p className="text-gray-500 text-xs">{currentDetail.date}</p>
                        </div>
                    </div>

                    {/* HERO IMAGES CROSSFADE */}
                    <figure className="mb-8 relative w-full aspect-video bg-gray-100 rounded-2xl shadow-md overflow-hidden group cursor-pointer" onClick={() => { if(currentDetail.images?.length) { pushHistory(); setZoomImage(currentDetail.images[newsSlideIndex]); }}}>
                        {currentDetail.images?.map((src, i) => (
                            <div key={i} className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${i === newsSlideIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                                <Image src={src} fill sizes="100vw" className="object-cover" alt="Hero" />
                            </div>
                        ))}
                        <div className="absolute top-4 left-4 text-white text-[11px] font-extrabold flex items-center gap-1.5 z-20 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                            <span className="animate-pulse h-2 w-2 bg-red-500 rounded-full inline-block shadow-[0_0_6px_rgba(239,68,68,1)]"></span> FOTO UTAMA
                        </div>
                    </figure>

                    {/* ISI KONTEN (CSS KHUSUS UNTUK PROSE BERITA AGAR TAB RAPI) */}
                    <div className="article-content text-lg text-gray-800 space-y-6 pb-4" dangerouslySetInnerHTML={{ __html: currentDetail.content }} />

                    {/* JELAJAHI LIPUTAN */}
                    {currentDetail.gallery && currentDetail.gallery.length > 0 && (
                      <div className="mt-12 pt-8 border-t border-gray-200">
                          <h3 className="text-lg font-bold mb-4 text-center font-sans text-gray-900">Jelajahi Liputan Selengkapnya</h3>
                          <div className="flex flex-col sm:flex-row justify-center gap-4">
                              <button onClick={() => { pushHistory(); setMediaViewerData(currentDetail); setActiveView('mediaViewer'); }} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-md transition flex items-center justify-center gap-2 font-sans w-full md:w-auto">
                                  <ImageIcon size={20} /> Lihat Semua Dokumentasi
                              </button>
                          </div>
                      </div>
                    )}

                    {/* TAGS */}
                    <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-2 font-sans">
                        <span className="text-sm font-bold mt-1 text-gray-700">TAGS:</span>
                        <span className="bg-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-300 font-semibold text-gray-800 cursor-pointer">TK Baiturrohman</span>
                        <span className="bg-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-300 font-semibold text-gray-800 cursor-pointer">Pendidikan Karakter</span>
                    </div>
                </div>

                {/* RIGHT SIDEBAR WIDGETS */}
                <aside className="lg:w-1/3 space-y-8">
                    {/* PPDB Banner */}
                    <div className="bg-red-600 text-white p-8 rounded-xl text-center shadow-md">
                        <p className="text-xs uppercase tracking-widest mb-2 opacity-80">Pendaftaran Siswa Baru</p>
                        <h4 className="text-xl font-bold mb-4">Tahun Ajaran 2026/2027 Telah Dibuka!</h4>
                        <button onClick={openWhatsApp} className="inline-block bg-white text-red-600 px-6 py-2 rounded-full font-bold text-sm uppercase shadow-lg hover:bg-gray-100 transition">
                            Info Selengkapnya
                        </button>
                    </div>
                </aside>
            </div>
        </main>
      </div>
    );
  };

  const renderMediaViewer = () => {
    if (!mediaViewerData) return null;
    
    // Fitur: Kalau admin memberikan filter dari Inline Text Link (group), maka difilter. Jika null, tampilkan semua
    const filteredGallery = mediaViewerData.gallery?.filter(item => {
      if (!mediaViewerData.activeFilter || mediaViewerData.activeFilter === 'null') return true;
      return item.group === mediaViewerData.activeFilter;
    }) || [];

    return (
      <div className={`fixed inset-0 z-[3000] bg-black/95 backdrop-blur-2xl transform transition-transform duration-500 ease-out overflow-y-auto flex flex-col ${activeView === 'mediaViewer' ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}>
        
        {/* HEADER SUPER BERSIH: HANYA ICON KEMBALI */}
        <div className="sticky top-0 left-0 right-0 z-[301] p-4 flex items-start bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
          <button onClick={() => setActiveView('detailNews')} className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 transition-colors shadow-lg pointer-events-auto">
            <ArrowLeft size={24} />
          </button>
        </div>
        
        <div className="flex-1 w-full max-w-4xl mx-auto p-4 flex flex-col gap-10 pb-20 items-center justify-center -mt-8">
          {filteredGallery.length === 0 ? (
            <p className="text-white/50 font-medium">Tidak ada media.</p>
          ) : (
            filteredGallery.map((item, i) => {
              if (item.type === 'image') {
                return (
                  <div key={i} className="w-full flex flex-col items-center relative group">
                    <Image src={item.src} width={1200} height={800} className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl mb-2 cursor-zoom-in" onClick={() => { pushHistory(); setZoomImage(item.src); }} alt="Galeri" />
                    {item.caption && <p className="text-gray-300 text-sm font-medium italic text-center mt-2 bg-black/40 px-4 py-2 rounded-full">{item.caption}</p>}
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
                      {item.caption && <p className="text-gray-300 text-sm font-medium italic text-center mb-2 mt-2 bg-black/40 px-4 py-2 rounded-full">{item.caption}</p>}
                    </div>
                  );
                } else {
                  return (
                    <div key={i} className="w-full flex flex-col items-center">
                      <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl mb-2 bg-black border border-white/10 flex justify-center items-center relative">
                        <video controls preload="metadata" className="w-full h-full object-contain" src={item.src}>
                          <source src={item.src} />
                        </video>
                      </div>
                      {item.caption && <p className="text-gray-300 text-sm font-medium italic text-center mb-2 mt-2 bg-black/40 px-4 py-2 rounded-full">{item.caption}</p>}
                    </div>
                  );
                }
              }
              return null;
            })
          )}
        </div>
      </div>
    );
  }

  // === RENDER UTAMA ===

  return (
    <div className="font-sans text-gray-800 min-h-screen relative overflow-x-hidden bg-[#f4f4f6]">
      {/* GLOBAL CSS STYLE INJECTION */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap');
        
        html { scroll-behavior: smooth; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes kenburns { 0% { transform: scale(1) translate(0, 0); } 100% { transform: scale(1.15) translate(-2%, -2%); } }
        .animate-kenburns { animation: kenburns 20s ease-out infinite alternate; }

        /* Custom Styles for PortalNews Article Content */
        .article-content { font-family: 'Merriweather', serif; }
        .article-content h2, .article-content h3 { font-family: 'Open Sans', sans-serif; font-weight: bold; color: #111827; text-align: left; text-indent: 0; }
        .article-content h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; }
        .article-content h3 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 1rem; }
        .article-content p { margin-bottom: 1.25rem; text-align: justify; text-indent: 2.5rem; line-height: 1.8; }
        .article-content a { color: #dc2626; text-decoration: none; font-weight: 600; }
        .article-content a:hover { text-decoration: underline; }
        .article-content blockquote { border-left: 4px solid #dc2626; margin: 2.5rem 0; font-style: italic; font-size: 1.25rem; color: #374151; background-color: #f9fafb; padding: 1.5rem; border-radius: 0 1rem 1rem 0; text-indent: 0; text-align: left; }
        .article-content img { border-radius: 1.5rem; margin: 2rem auto; width: 100%; aspect-ratio: 4/3; object-fit: cover; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); display: block; }
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={() => setInfoModalOpen(false)}></div>
          <div className="relative bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 transform transition-all border border-white overflow-hidden animate-in fade-in zoom-in duration-300 ease-out">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-b-[60%] -translate-y-16"></div>
            <div className="relative z-10 text-center pt-6">
              <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 text-blue-500 border border-gray-100 rotate-12">
                <Info size={36} className="-rotate-12" />
              </div>
              <h3 className="font-bold text-2xl text-gray-900 mb-3 tracking-tight">Info Terbaru</h3>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 mb-8 text-left text-sm text-gray-600 font-medium">
                Selamat datang di sistem baru TK Baiturrohman. Informasi PPDB dan formulir pendaftaran kini bisa diakses dari menu!
              </div>
              <button onClick={() => setInfoModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-8 rounded-full shadow-lg shadow-blue-600/30 transition-all w-full">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[12000] flex flex-col justify-center items-center animate-in fade-in duration-300">
          <div className="fixed top-0 left-0 w-full p-6 flex justify-between z-[12001] bg-gradient-to-b from-black/80 to-transparent">
             <span className="text-white/80 text-sm font-semibold px-4 py-2 rounded-full bg-white/10 backdrop-blur-md">Ketuk gambar untuk menutup</span>
             <button onClick={() => setZoomImage(null)} className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                 <X size={24} />
             </button>
          </div>
          <Image src={zoomImage} width={1920} height={1080} className="max-w-[100vw] max-h-[100vh] object-contain cursor-zoom-out drop-shadow-2xl" onClick={() => setZoomImage(null)} alt="Zoom" />
        </div>
      )}

      {/* MAIN HOMEPAGE */}
      <div style={{ display: activeView === 'home' ? 'block' : 'none' }}>
        
        {/* HERO SECTION - KEMBALI KE ASLINYA (DENGAN SVG) */}
        <header id="beranda" className="relative w-full h-[100dvh] overflow-hidden flex items-center justify-center text-center bg-gray-900">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/20 z-10 pointer-events-none"></div>
          {heroImages.map((src, i) => (
            <div key={i} className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${i === heroIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}>
               <Image src={src} fill priority={i === 0} sizes="100vw" className="object-cover animate-kenburns" alt="Hero Background" />
            </div>
          ))}
          
          <div className="relative z-20 max-w-4xl px-6 flex flex-col items-center justify-center h-full pt-32 md:pt-44 pb-32">
             <div className="animate-in slide-in-from-bottom-8 fade-in duration-1000 ease-out delay-200">
                 <span className="inline-block py-2.5 px-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-white font-bold text-xs md:text-sm mb-8 shadow-xl">
                    ✨ Pendaftaran Siswa Baru Telah Dibuka
                 </span>
                 <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 drop-shadow-2xl leading-tight tracking-tight">
                    Bermain, Belajar & <br/><span className="text-orange-400">Bertumbuh</span>
                 </h1>
                 <p className="text-base md:text-2xl text-white/90 mb-10 font-medium max-w-2xl mx-auto drop-shadow-md">
                    TK Baiturrohman membentuk karakter anak yang cerdas, kreatif, berakhlak mulia, Bertaqwa, Dan Berguna.
                 </p>
                 <div className="flex justify-center w-full">
                    <a href="#daftar" className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-12 rounded-full text-lg shadow-lg shadow-orange-500/40 transition-all duration-300 hover:-translate-y-1 border border-white/10">
                      Daftar Sekarang
                    </a>
                 </div>
             </div>
          </div>
          <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-[0] z-20 pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(146%_+_1.3px)] h-[80px] text-[#f4f4f6] fill-current">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"></path>
             </svg>
          </div>
        </header>

        {/* FEATURES (Glassmorphism iOS) */}
        <section className="relative -mt-12 z-30 px-4 md:px-6 overflow-hidden">
          <div className="max-w-6xl mx-auto bg-white/60 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 border border-white">
             <div className="text-center group p-6 rounded-3xl hover:bg-white/50 transition-all duration-300 cursor-default">
               <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm"><BookOpen size={32}/></div>
               <h3 className="font-bold text-2xl mb-3 text-gray-900 tracking-tight">Kurikulum Merdeka</h3>
               <p className="text-gray-600 font-medium">Pembelajaran berpusat pada minat anak.</p>
             </div>
             <div className="text-center group p-6 rounded-3xl hover:bg-white/50 transition-all duration-300 cursor-default">
               <div className="w-20 h-20 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-orange-500 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500 shadow-sm"><Heart size={32}/></div>
               <h3 className="font-bold text-2xl mb-3 text-gray-900 tracking-tight">Pendidikan Islam</h3>
               <p className="text-gray-600 font-medium">Penanaman nilai agama sejak dini.</p>
             </div>
             <div className="text-center group p-6 rounded-3xl hover:bg-white/50 transition-all duration-300 cursor-default">
               <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm"><Shapes size={32}/></div>
               <h3 className="font-bold text-2xl mb-3 text-gray-900 tracking-tight">Fasilitas Lengkap</h3>
               <p className="text-gray-600 font-medium">Area bermain aman & edukatif.</p>
             </div>
          </div>
        </section>

        {/* PROFILE */}
        <section id="profil" className="py-24 px-6 relative">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
             <div className="lg:w-1/2 relative h-[400px] md:h-[550px] w-full">
               <div className="absolute -top-6 -left-6 w-40 h-40 bg-blue-200/50 backdrop-blur-3xl rounded-full animate-float blur-xl"></div>
               <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-orange-200/50 backdrop-blur-3xl rounded-full animate-float blur-xl" style={{animationDelay: '1s'}}></div>
               
               <div className="w-full h-full relative group perspective bg-gray-100 rounded-[3rem] overflow-hidden">
                 {profileImages.map((src, i) => (
                    <div key={i} className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${i === profileIndex ? 'opacity-100 z-20' : 'opacity-0 z-10'}`}>
                       <Image src={src} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]" alt={`Profile ${i+1}`}/>
                    </div>
                 ))}
                 <div className="absolute inset-0 rounded-[3rem] border border-white/50 z-30 pointer-events-none"></div>
               </div>
             </div>

             <div className="lg:w-1/2">
               <h4 className="text-orange-500 font-bold tracking-widest uppercase mb-4">Tentang Kami</h4>
               <h2 className="font-display font-bold text-4xl md:text-5xl text-gray-900 mb-6 leading-tight tracking-tight">Mewujudkan Lingkungan Belajar yang Ceria & Islami</h2>
               <p className="text-gray-600 mb-10 leading-relaxed font-medium text-lg">TK Baiturrohman berkomitmen untuk menyediakan pendidikan anak usia dini yang berkualitas. Kami percaya setiap anak adalah bintang yang memiliki potensi unik.</p>
               <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <li className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1"><div className="bg-blue-50 p-2 rounded-xl text-blue-600"><CheckCircle size={20}/></div><span className="font-bold text-gray-800 text-sm">Pendidik Profesional</span></li>
                 <li className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1"><div className="bg-blue-50 p-2 rounded-xl text-blue-600"><CheckCircle size={20}/></div><span className="font-bold text-gray-800 text-sm">Lingkungan Aman</span></li>
                 <li className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1"><div className="bg-blue-50 p-2 rounded-xl text-blue-600"><CheckCircle size={20}/></div><span className="font-bold text-gray-800 text-sm">Seni Lukis</span></li>
                 <li className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1"><div className="bg-blue-50 p-2 rounded-xl text-blue-600"><CheckCircle size={20}/></div><span className="font-bold text-gray-800 text-sm">Baca Tulis Al-Qur'an</span></li>
               </ul>
             </div>
          </div>
        </section>

        {/* GALLERY / NEWS (Presisi Kotak) */}
        <section id="galeri" className="py-24 px-4 md:px-6 relative bg-white border-y border-gray-100 shadow-[inset_0_10px_30px_rgba(0,0,0,0.02)]">
          <div className="max-w-7xl mx-auto mb-12 text-center">
             <h2 className="font-display font-bold text-4xl md:text-5xl text-gray-900 mb-4 tracking-tight">Galeri & Berita</h2>
             <p className="text-gray-500 font-medium">Geser dan klik foto untuk melihat aktivitas anak-anak.</p>
          </div>
          <div className="max-w-[90rem] mx-auto relative group">
             <button onClick={() => handleScroll(galleryRef, -1)} className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white text-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-gray-100 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:text-blue-600"><ChevronLeft size={28}/></button>
             <button onClick={() => handleScroll(galleryRef, 1)} className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white text-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-gray-100 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:text-blue-600"><ChevronRight size={28}/></button>
             
             <div ref={galleryRef} className="flex overflow-x-auto gap-6 hide-scroll snap-x snap-mandatory scroll-smooth pb-10 px-4 md:px-8">
                {newsData.map((n, i) => {
                  let img = n.images && n.images.length > 0 ? n.images[0] : "https://files.catbox.moe/3tf995.png";
                  if (typeof img === 'string' && img.includes('cloudinary')) {
                      img = img.replace('/upload/', '/upload/w_600,q_auto,f_auto/');
                  }
                  const isHtml = n.type === 'html';
                  return (
                    <div key={i} onClick={() => { if(isHtml) openAppIframe(n.fileUrl, n.title); else { pushHistory(); setCurrentDetail(n); setActiveView('detailNews'); } }} className="w-[85vw] md:w-[400px] flex-shrink-0 snap-center rounded-[2.5rem] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 cursor-pointer group/item transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
                      <div className="w-full aspect-square relative overflow-hidden bg-gray-100">
                         <Image src={img} fill sizes="(max-width: 768px) 85vw, 400px" className="object-cover transition-transform duration-700 ease-out group-hover/item:scale-105" alt="News"/>
                         <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <div className="p-8">
                         <span className={`${isHtml ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50'} text-[11px] px-3 py-1.5 rounded-lg font-bold tracking-wider uppercase mb-3 inline-block`}>{isHtml ? 'Aplikasi' : 'Berita'}</span>
                         <h3 className="font-bold text-2xl text-gray-900 line-clamp-2 leading-tight tracking-tight mb-4 group-hover/item:text-blue-600 transition-colors">{n.title}</h3>
                         <p className="text-gray-500 font-medium text-sm flex items-center gap-2"><Hand size={16} className="text-gray-400"/> Baca selengkapnya</p>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </section>

        {/* VIDEO (Presisi Kotak) */}
        <section id="video" className="py-24 px-4 md:px-6 relative">
          <div className="max-w-7xl mx-auto mb-12 text-center">
             <h2 className="font-display font-bold text-4xl md:text-5xl text-gray-900 mb-4 tracking-tight">Video Kegiatan</h2>
          </div>
          
          <div className="max-w-[90rem] mx-auto relative group">
             <button onClick={() => handleScroll(videoRef, -1)} className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white text-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-gray-100 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:text-blue-600"><ChevronLeft size={28}/></button>
             <button onClick={() => handleScroll(videoRef, 1)} className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-white text-gray-800 shadow-[0_8px_30px_rgba(0,0,0,0.1)] border border-gray-100 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:text-blue-600"><ChevronRight size={28}/></button>
             
             <div ref={videoRef} className="flex overflow-x-auto gap-6 hide-scroll snap-x snap-mandatory scroll-smooth pb-10 px-4 md:px-8">
                {videoData.map((v, i) => {
                  const id = getYouTubeId(v.url);
                  if(!id) return null;
                  const thumb = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
                  return (
                    <div key={i} className="w-[85vw] sm:w-[380px] md:w-[450px] flex-shrink-0 snap-center rounded-[2.5rem] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-gray-100 group/vid transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.1)] overflow-hidden">
                      <div className="w-full aspect-video relative overflow-hidden bg-gray-900 cursor-pointer" onClick={() => playVideo(v.url, v.judul)}>
                         <Image src={thumb} fill sizes="(max-width: 768px) 85vw, 450px" className="object-cover opacity-80 group-hover/vid:opacity-100 transition-all duration-700 ease-out group-hover/vid:scale-105" alt="Thumb"/>
                         <div className="absolute inset-0 flex justify-center items-center z-10">
                            <div className="w-[64px] h-[48px] bg-white/90 backdrop-blur-md rounded-[14px] flex items-center justify-center transform group-hover/vid:scale-110 transition-transform duration-300 shadow-xl">
                              <PlayCircle className="text-orange-500" size={32} fill="currentColor"/>
                            </div>
                         </div>
                      </div>
                      <div className="p-8">
                         <h3 className="font-bold text-2xl text-gray-900 mb-3 line-clamp-1 tracking-tight">{v.judul}</h3>
                         <p className="text-gray-500 font-medium line-clamp-2 text-sm leading-relaxed mb-6">{v.deskripsi}</p>
                         <button onClick={() => playVideo(v.url, v.judul)} className="w-full text-sm bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 hover:text-blue-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors border border-gray-200"><Youtube size={18} className="text-red-500"/> Putar di Web</button>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>
        </section>

        {/* REGISTRATION */}
        <section id="daftar" className="py-24 px-4 md:px-6 relative bg-white border-y border-gray-100">
          <div className="max-w-6xl mx-auto bg-gray-50 rounded-[3rem] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col md:flex-row">
             
             <div className="md:w-5/12 bg-blue-600 p-10 md:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10">
                   <h3 className="font-display font-bold text-4xl md:text-5xl mb-6 tracking-tight">Daftar Sekarang</h3>
                   <p className="text-blue-100 mb-10 text-lg font-medium leading-relaxed">Silahkan isi formulir di sini. Data akan masuk ke nomor kepala sekolah.</p>
                   <div className="space-y-6 text-sm md:text-base">
                      <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                         <Phone size={24} className="text-blue-200 shrink-0" />
                         <span className="font-bold tracking-wider">0895-3910-01402</span>
                      </div>
                      <div className="flex items-start gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
                         <MapPin size={24} className="mt-1 text-blue-200 shrink-0" />
                         <span className="font-medium leading-relaxed">Jl. Andong kencono No. III, Pulodarat RT 19 RW 02, Pecangaan, Jepara.</span>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="md:w-7/12 p-8 md:p-16 bg-white">
                <form id="waForm" className="space-y-6" onSubmit={openWhatsApp}>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Nama Lengkap Anak</label>
                     <input type="text" name="namaAnak" required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" placeholder="Contoh: Ahmad Zaky"/>
                   </div>
                   <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Umur (Tahun)</label>
                        <input type="number" name="umur" required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" placeholder="Ex: 5"/>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Jenis Kelamin</label>
                        <select name="jk" className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium cursor-pointer">
                           <option>Laki-laki</option>
                           <option>Perempuan</option>
                        </select>
                      </div>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Nama Orang Tua</label>
                     <input type="text" name="namaOrtu" required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium" placeholder="Contoh: Bpk. Budi"/>
                   </div>
                   <div>
                     <label className="block text-sm font-bold text-gray-700 mb-2">Alamat Domisili</label>
                     <textarea name="alamat" rows="3" required className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-gray-800 font-medium resize-none" placeholder="Alamat lengkap..."></textarea>
                   </div>
                   <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white font-bold text-lg py-5 rounded-2xl shadow-xl shadow-gray-900/20 transition-all duration-300 hover:-translate-y-1 flex justify-center items-center gap-3">
                      Kirim Pendaftaran
                   </button>
                </form>
             </div>
          </div>
        </section>

        {/* MAPS */}
        <section id="lokasi" className="py-16 px-4 md:px-6 relative">
          <div className="max-w-6xl mx-auto">
             <div className="w-full h-[450px] rounded-[3rem] overflow-hidden shadow-sm border border-gray-100 bg-white">
                <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5804911944147!2d110.71185243070909!3d-6.6987642984019065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e70dffdf8c9501b%3A0xa0ec339baa98c01e!2sTK%20BAITURROHMAN%20Pulodarat!5e0!3m2!1sid!2sid!4v1769270324442!5m2!1sid!2sid" className="w-full h-full border-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Map"></iframe>
             </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-white border-t border-gray-100 pt-20 pb-10 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
             <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-4 mb-6">
                   <div style={logoTightGlowStyle}>
                      <Image src="/logotk.webp" width={64} height={64} className="h-16 w-auto object-contain" alt="Logo"/>
                   </div>
                   <span className="font-bold text-2xl text-gray-900 tracking-tight">TK BAITURROHMAN</span>
                </div>
                <p className="text-gray-500 mb-6 max-w-sm text-base font-medium leading-relaxed">Membentuk generasi masa depan yang cerdas, kreatif, dan religius berakhlak mulia dan Baiti.</p>
             </div>
             <div>
                <h4 className="font-bold text-lg mb-6 text-gray-900 tracking-tight">Tautan Cepat</h4>
                <ul className="space-y-4 text-gray-500 font-medium text-sm">
                   <li><a href="#beranda" className="hover:text-blue-600 transition-colors">Beranda</a></li>
                   <li><a href="#profil" className="hover:text-blue-600 transition-colors">Tentang Kami</a></li>
                   <li><button onClick={() => { pushHistory(); setActiveView('listNews'); }} className="hover:text-blue-600 transition-colors">Galeri Foto</button></li>
                   <li><a href="#daftar" className="hover:text-blue-600 transition-colors">Info PPDB</a></li>
                </ul>
             </div>
             <div>
                <h4 className="font-bold text-lg mb-6 text-gray-900 tracking-tight">Hubungi Kami</h4>
                <ul className="space-y-4 text-gray-500 font-medium text-sm">
                   <li className="flex items-center gap-3"><Phone size={18} className="text-gray-400"/><span className="text-gray-700">0895-3910-01402</span></li>
                   <li className="flex items-center gap-3"><Mail size={18} className="text-gray-400 shrink-0"/><span className="text-gray-700 break-all">dapodiktkbaiturrohman@gmail.com</span></li>
                   <li className="flex items-start gap-3"><MapPin size={18} className="mt-0.5 text-gray-400 shrink-0"/><span className="text-gray-700 leading-relaxed">Pulodarat RT 19 RW 02, Pecangaan, Jepara.</span></li>
                </ul>
             </div>
          </div>
          <div className="border-t border-gray-100 pt-8 text-center text-gray-400 text-sm font-medium">
             <p>© 2026 TK Baiturrohman Pulodarat. All Rights Reserved.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}
