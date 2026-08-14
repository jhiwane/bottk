"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import {
  Menu, X, Info, Newspaper, Youtube, Rocket,
  ArrowLeft, BookOpen, Heart, Shapes, CheckCircle, ChevronLeft,
  ChevronRight, Phone, MapPin, Mail, Play, Home, Image as ImageIcon,
  Building, FileText, GraduationCap, Sparkles, MapPinned,
} from 'lucide-react';
// ====== HELPER GAMBAR & YOUTUBE (in-file, TIDAK butuh lib/images.js) ======
function optImg(url, w = 1400) {
  if (!url || typeof url !== 'string') return '';
  try {
    if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
      if (/\/upload\/(?:c_|w_|q_|f_)/.test(url)) {
        return url.replace(/\/upload\/[^/]+(\/[^/]+)/, `/upload/c_limit,w_${w},q_auto,f_auto$1`);
      }
      return url.replace('/upload/', `/upload/c_limit,w_${w},q_auto,f_auto/`);
    }
    if (url.includes('images.unsplash.com')) {
      const u = new URL(url);
      u.searchParams.set('w', String(w));
      u.searchParams.set('q', '72');
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
  } catch (_) {}
  return url;
}
function getYouTubeId(url) {
  if (!url) return null;
  const s = String(url).trim();
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/v\/([\w-]{11})/,
    /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}

// ====== DATA DEFAULT ======
const FALLBACK_HERO =
  'https://images.unsplash.com/photo-1588075592446-265fd1e6e761?q=80&w=1600&auto=format&fit=crop';
const FALLBACK_PROFILE =
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop';
const FALLBACK_THUMB =
  'https://files.catbox.moe/3tf995.png';

const defaultNews = [{
  title: 'Profil Sekolah',
  date: '20 Januari 2026',
  content:
    '<p>Tetap stay di web kami Bunda. Segala informasi akan kami update. Untuk melihat aktivitas, kunjungi channel video YouTube kami.</p>',
  images: [FALLBACK_HERO],
  gallery: [
    { group: 'foto_1', type: 'image', src: FALLBACK_HERO, caption: 'Dokumentasi Kelas' },
    { group: 'video_1', type: 'video', src: 'https://youtu.be/s3m7RsCY_TM', caption: 'Video Profil' },
  ],
}];

const defaultVideos = [{
  url: 'https://youtu.be/s3m7RsCY_TM',
  judul: 'Profil Sekolah',
  deskripsi: 'Profil TK Baiturrohman Pulodarat.',
}];

const defaultHeroImages = [FALLBACK_HERO];
const defaultProfileImages = [FALLBACK_HERO, FALLBACK_PROFILE];

// Thumbnail YouTube dengan fallback (maxres sering 404 untuk video non-HD)
const ytThumb = (id) => [
  `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
  `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
];

// ====== CSS DAN FONT DITANAM LANGSUNG (cukup ganti file ini) ======
const PAGE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
:root{--cream:#f7f3ea;--ink:#1c2433;--navy:#0b1f3a;--gold:#c28a28;}
.font-serif,h1,h2,h3{font-family:'Playfair Display',Georgia,serif;}
body{font-family:'Inter',system-ui,sans-serif;}
.hide-scroll::-webkit-scrollbar{display:none;}.hide-scroll{-ms-overflow-style:none;scrollbar-width:none;}
.bg-cream{background:var(--cream);}
.text-navy-900{color:var(--navy);}
.bg-navy-950,.bg-navy-900{background:#070f20;}
.bg-navy-800{background:#1a2c47;}
.text-navy-100{color:#e2e9f1;}.text-navy-200\/75,.text-navy-200\/80,.text-navy-200\/70{color:rgba(226,233,241,.75);}
.text-navy-300\/60{color:rgba(148,174,203,.6);}
.bg-gold-500{background:var(--gold);}.hover\\:bg-gold-600:hover{background:#a76c20;}
.text-gold-300,.text-gold-200{color:#e0b964;}.text-gold-500,.text-gold-600{color:var(--gold);}
.bg-gold-100{background:#f5ead0;}.text-gold-700{color:#844f1d;}
.border-gold-200{border-color:#ecd49e;}.border-gold-300\\/40{border-color:rgba(224,185,100,.4);}
.shadow-gold-500\\/30{--tw-shadow-color:rgba(194,138,40,.3);}
.text-navy-950{color:#070f20;}
.bg-navy-50{background:#f2f5f9;}.hover\\:bg-navy-100:hover{background:#e2e9f1;}.text-navy-700{color:#263e61;}.text-navy-800{color:#1a2c47;}
.hover\\:bg-navy-50:hover{background:#f2f5f9;}.hover\\:text-navy-800:hover{color:#1a2c47;}
.bg-navy-900\\/text{background:var(--navy);}
.ring-navy-900\\/20:focus{--tw-ring-color:rgba(11,31,58,.2);}
.focus\\:border-navy-700:focus{border-color:#263e61;}
.bg-navy-50\\/text{background:#f2f5f9;}
.from-navy-950\\/70{--tw-gradient-from:rgba(7,15,32,.7);}
@keyframes spin-slow{to{transform:rotate(360deg)}}.animate-spin-slow{animation:spin-slow 1s linear infinite;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}.animate-fade-in{animation:fadeIn .5s ease both;}
@keyframes kenburns{0%{transform:scale(1) translate(0,0)}100%{transform:scale(1.12) translate(-1.5%,-1.5%)}}.animate-kenburns{animation:kenburns 18s ease-out infinite alternate;}
.img-fade{opacity:0;transition:opacity .7s ease;}.img-fade.loaded{opacity:1;}
.shimmer{background:#ece6d8;background:linear-gradient(90deg,#ece6d8 25%,#f6f1e6 37%,#ece6d8 63%);background-size:800px 100%;animation:shimmer 1.6s linear infinite;}
@keyframes shimmer{0%{background-position:-468px 0}100%{background-position:468px 0}}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .9s cubic-bezier(.22,1,.36,1),transform .9s cubic-bezier(.22,1,.36,1);}
.reveal.in{opacity:1;transform:none;}
.gold-divider{display:inline-flex;align-items:center;gap:.6rem;color:var(--gold);}
.gold-divider::before,.gold-divider::after{content:"";width:38px;height:1px;background:linear-gradient(90deg,transparent,var(--gold));}
.gold-divider::after{background:linear-gradient(90deg,var(--gold),transparent);}
.article-content{font-family:'Inter',sans-serif;font-size:1.075rem;line-height:1.9;color:#334155;}
.article-content h2,.article-content h3{font-family:'Playfair Display',serif;font-weight:700;color:#0b1f3a;}
.article-content h2{font-size:1.6rem;margin:2rem 0 1rem;}.article-content h3{font-size:1.3rem;margin:1.6rem 0 .8rem;}
.article-content p{margin-bottom:1.1rem;text-align:justify;}
.article-content a{color:#c28a28;font-weight:600;text-decoration:underline;text-underline-offset:3px;}
.article-content blockquote{border-left:3px solid var(--gold);margin:1.6rem 0;padding:.5rem 1.25rem;background:#fbf7ed;border-radius:0 .75rem .75rem 0;font-style:italic;color:#475569;}
.article-content img{border-radius:1rem;margin:1.5rem auto;width:100%;height:auto;display:block;box-shadow:0 12px 30px -12px rgba(11,31,58,.35);}
`;

// ====== KOMPONEN GAMBAR CERDAS (in-file, tidak butuh folder components/) ======
const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1588075592446-265fd1e6e761?q=80&w=1400&auto=format&fit=crop';

function SmartImage({
  src, alt = '', width, height, fill = false, sizes, priority = false,
  quality, className = '', fallback = FALLBACK_POSTER, onClick, style,
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const finalSrc = errored ? fallback : (src ? optImg(String(src), quality) : fallback);

  if (fill) {
    return (
      <div className={`relative overflow-hidden ${className}`} style={style} onClick={onClick}>
        {!loaded && <div className="absolute inset-0 shimmer" aria-hidden="true" />}
        <Image
          src={finalSrc} alt={alt} fill sizes={sizes} priority={priority} unoptimized
          onLoad={() => setLoaded(true)}
          onError={() => { if (!errored) setErrored(true); }}
          className={`img-fade ${loaded ? 'loaded' : ''} object-cover`}
        />
      </div>
    );
  }
  return (
    <span className={`relative inline-block overflow-hidden ${className}`} style={{ lineHeight: 0, ...style }} onClick={onClick}>
      {!loaded && <span className="shimmer absolute inset-0" style={{ width, height }} aria-hidden="true" />}
      <Image
        src={finalSrc} alt={alt} width={width} height={height} priority={priority} unoptimized
        onLoad={() => setLoaded(true)}
        onError={() => { if (!errored) setErrored(true); }}
        className={`img-fade ${loaded ? 'loaded' : ''} h-auto w-full`}
      />
    </span>
  );
}

// ====== REVEAL ON SCROLL (in-file) ======
function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

export default function Page() {
  const [booted, setBooted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState('home');

  const [news, setNews] = useState(defaultNews);
  const [videos, setVideos] = useState(defaultVideos);
  const [tools, setTools] = useState([]);

  const [heroImages, setHeroImages] = useState(defaultHeroImages);
  const [profileImages, setProfileImages] = useState(defaultProfileImages);
  const [infoOpen, setInfoOpen] = useState(false);

  const [zoom, setZoom] = useState(null);
  const [detail, setDetail] = useState(null);
  const [iframe, setIframe] = useState({ url: '', title: '' });
  const [iframeLoading, setIframeLoading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [search, setSearch] = useState('');

  const [heroIdx, setHeroIdx] = useState(0);
  const [profileIdx, setProfileIdx] = useState(0);
  const [newsImgIdx, setNewsImgIdx] = useState(0);

  const galleryRef = useRef(null);
  const videoRef = useRef(null);

  // ===== history / swipe-back =====
  const pushHistory = () => { try { window.history.pushState({ open: true }, ''); } catch (_) {} };

  const openAppIframe = (url, title) => {
    pushHistory();
    setIframeLoading(true);
    setIframe({ url, title });
    setView('iframe');
    setSidebarOpen(false);
  };

  const playVideo = (url, title) => {
    const id = getYouTubeId(url);
    if (id) {
      openAppIframe(`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`, title);
    } else if (/\.(mp4|webm|ogg)$/i.test(String(url))) {
      openAppIframe(url, title);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // ===== load konten dari API =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/content?t=' + Date.now());
        const data = await res.json();
        if (!alive) return;
        if (Array.isArray(data.news) && data.news.length) setNews(data.news);
        if (Array.isArray(data.videos) && data.videos.length) setVideos(data.videos);
        if (Array.isArray(data.tools)) setTools(data.tools.filter((t) => t.name !== 'HIDDEN_NEWS_HTML'));
        if (data.config) {
          if (Array.isArray(data.config.heroImages) && data.config.heroImages.length) setHeroImages(data.config.heroImages);
          if (Array.isArray(data.config.profileImages) && data.config.profileImages.length) setProfileImages(data.config.profileImages);
        }
      } catch (_) {
        if (alive) { setNews(defaultNews); setVideos(defaultVideos); }
      } finally {
        if (alive) setTimeout(() => setBooted(true), 350);
      }
    })();
    return () => { alive = false; };
  }, []);

  // rotasi hero
  useEffect(() => {
    if (!heroImages.length) return;
    const t = setInterval(() => setHeroIdx((p) => (p + 1) % heroImages.length), 6500);
    return () => clearInterval(t);
  }, [heroImages]);

  // rotasi foto profil
  useEffect(() => {
    if (!profileImages.length) return;
    const t = setInterval(() => setProfileIdx((p) => (p + 1) % profileImages.length), 5500);
    return () => clearInterval(t);
  }, [profileImages]);

  // rotasi gambar di detail berita
  useEffect(() => {
    let t;
    if (view === 'detailNews' && detail?.images?.length > 1) {
      t = setInterval(() => setNewsImgIdx((p) => (p + 1) % detail.images.length), 3500);
    } else setNewsImgIdx(0);
    return () => clearInterval(t);
  }, [view, detail]);

  // kunci scroll saat overlay
  useEffect(() => {
    const locked = sidebarOpen || view !== 'home' || zoom || infoOpen;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen, view, zoom, infoOpen]);

  // tombol back HP
  useEffect(() => {
    const onPop = () => {
      if (zoom) setZoom(null);
      else if (infoOpen) setInfoOpen(false);
      else if (sidebarOpen) setSidebarOpen(false);
      else if (view !== 'home') setView(view === 'mediaViewer' ? 'detailNews' : 'home');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [zoom, infoOpen, sidebarOpen, view]);

  // bridge untuk HTML dari DB
  useEffect(() => {
    window.openMediaViewer = (index, filter) => {
      const target = news[index] || detail;
      if (!target) return;
      pushHistory();
      setMediaViewer({ ...target, activeFilter: filter });
      setView('mediaViewer');
    };
    window.openIframe = openAppIframe;
    return () => { delete window.openMediaViewer; delete window.openIframe; };
  }, [news, detail]);

  const scrollBy = (ref, dir) => {
    if (ref.current) ref.current.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  };

  const openWhatsApp = (e) => {
    if (e) e.preventDefault();
    const phone = '62895391001402';
    let msg = 'Halo Admin TK Baiturrohman.';
    const f = e && e.target && e.target.closest && e.target.closest('#waForm');
    if (f) {
      msg =
        `Halo Admin TK BAITURROHMAN, saya ingin mendaftarkan anak saya.\n\n` +
        `📋 FORMULIR PENDAFTARAN\n` +
        `--------------------------------\n` +
        `👤 Nama Anak: ${f.namaAnak.value}\n` +
        `🎂 Umur: ${f.umur.value} Tahun\n` +
        `⚧ Jenis Kelamin: ${f.jk.value}\n` +
        `👨‍👩‍👧 Nama Ortu: ${f.namaOrtu.value}\n` +
        `🏠 Alamat: ${f.alamat.value}\n` +
        `--------------------------------\nMohon info selanjutnya. Terima kasih.`;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const articleHtml = useMemo(
    () => (detail ? { __html: detail.content || '' } : null),
    [detail?.content]
  );

  // ===== renderers =====
  const Loader = () => (
    <div className={`fixed inset-0 z-[200] bg-navy-900 flex flex-col items-center justify-center transition-opacity duration-700 ${booted ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="relative w-20 h-20 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-gold-400/30" />
        <div className="absolute inset-0 rounded-full border-t-2 border-gold-300 animate-spin-slow" />
        <GraduationCap className="absolute inset-0 m-auto text-gold-300" size={30} />
      </div>
      <p className="text-gold-200 font-serif text-lg tracking-wide">TK Baiturrohman</p>
      <p className="text-navy-200/70 text-xs mt-1">Memuat pengalaman…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream text-navy-900 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: PAGE_CSS }} />
      <Loader />
      <Navbar onMenu={() => { pushHistory(); setSidebarOpen(true); }} onInfo={() => { pushHistory(); setInfoOpen(true); }} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        onNav={(v) => { setSidebarOpen(false); if (v) { pushHistory(); setView(v); } }} />

      <ListModal view={view} setView={setView} kind="listNews" title="Daftar Berita" search={search} setSearch={setSearch}
        items={news} onPick={(item) => { pushHistory(); setDetail(item); setView('detailNews'); }} />
      <ListModal view={view} setView={setView} kind="listVideo" title="Daftar Video" search={search} setSearch={setSearch}
        items={videos} onPick={(item) => playVideo(item.url, item.judul)} isVideo />
      <ToolsModal view={view} setView={setView} items={tools} openIframe={openAppIframe} />
      <IframeModal view={view} setView={setView} iframe={iframe} loading={iframeLoading} onLoad={() => setIframeLoading(false)} />
      <NewsDetail view={view} setView={setView} detail={detail} articleHtml={articleHtml}
        newsImgIdx={newsImgIdx} setZoom={setZoom} pushHistory={pushHistory} setMediaViewer={setMediaViewer} openWhatsApp={openWhatsApp} />
      <MediaViewer view={view} setView={setView} data={mediaViewer} setZoom={setZoom} pushHistory={pushHistory} />

      {/* Info modal */}
      {infoOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setInfoOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-gold-200">
            <div className="w-16 h-16 rounded-2xl bg-navy-900 text-gold-300 flex items-center justify-center mx-auto mb-5"><Info size={30} /></div>
            <h3 className="font-serif text-2xl text-center text-navy-900 mb-3">Info Terbaru</h3>
            <p className="text-slate-600 text-center leading-relaxed">
              Selamat datang di sistem baru TK Baiturrohman. Informasi PPDB dan formulir pendaftaran kini dapat diakses melalui menu.
            </p>
            <button onClick={() => setInfoOpen(false)} className="mt-7 w-full bg-navy-900 text-gold-200 font-semibold py-3 rounded-full hover:bg-navy-800 transition">Tutup</button>
          </div>
        </div>
      )}

      {/* Zoom */}
      {zoom && (
        <div className="fixed inset-0 z-[190] bg-black/95 flex items-center justify-center animate-fade-in" onClick={() => setZoom(null)}>
          <button className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><X size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="zoom" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      <div style={{ display: view === 'home' ? 'block' : 'none' }}>
        <Hero heroImages={heroImages} heroIdx={setHeroIdx < 0 ? 0 : heroIdx} />
        <Features />
        <Profile profileImages={profileImages} profileIdx={profileIdx} />
        <Gallery news={news} galleryRef={galleryRef} scrollBy={scrollBy}
          onOpen={(n) => { pushHistory(); setDetail(n); setView('detailNews'); }}
          onHtml={(n) => openAppIframe(n.fileUrl, n.title)} />
        <VideoSection videos={videos} videoRef={videoRef} scrollBy={scrollBy} onPlay={playVideo} />
        <Registration openWhatsApp={openWhatsApp} />
        <MapSection />
        <Footer onNav={(v) => { pushHistory(); setView(v); }} />
      </div>
    </div>
  );
}

/* ======================= SECTION: NAVBAR ======================= */
function Navbar({ onMenu, onInfo }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 py-4 px-4 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/85 backdrop-blur rounded-full pl-4 pr-2 py-2 shadow-[0_8px_30px_rgba(11,31,58,0.08)] border border-white">
        <a href="#beranda" className="flex items-center gap-3">
          <SmartImage src="/logotk.webp" alt="Logo" width={48} height={48} className="rounded-full" quality={120} />
          <div className="leading-tight">
            <span className="block font-serif font-bold text-lg text-navy-900">TK Baiturrohman</span>
            <span className="block text-[10px] tracking-[0.2em] uppercase text-gold-600 font-semibold">Pulodarat · Jepara</span>
          </div>
        </a>
        <div className="hidden md:flex items-center gap-7 text-sm font-semibold text-navy-800">
          <a href="#beranda" className="hover:text-gold-600 transition">Beranda</a>
          <a href="#profil" className="hover:text-gold-600 transition">Profil</a>
          <a href="#galeri" className="hover:text-gold-600 transition">Galeri</a>
          <a href="#video" className="hover:text-gold-600 transition">Video</a>
          <a href="#daftar" className="hover:text-gold-600 transition">PPDB</a>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onInfo} aria-label="Info" className="hidden sm:flex w-10 h-10 rounded-full bg-navy-50 text-navy-700 items-center justify-center hover:bg-navy-100 transition"><Info size={18} /></button>
          <a href="#daftar" className="hidden sm:inline-flex bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold text-sm px-5 py-2.5 rounded-full shadow-md shadow-gold-500/30 transition">Daftar</a>
          <button onClick={onMenu} aria-label="Menu" className="w-11 h-11 rounded-full bg-navy-900 text-gold-200 flex items-center justify-center hover:bg-navy-800 transition"><Menu size={20} /></button>
        </div>
      </div>
    </nav>
  );
}

/* ======================= SECTION: SIDEBAR ======================= */
function Sidebar({ open, onClose, onNav }) {
  const items = [
    { label: 'Beranda', href: '#beranda', icon: Home },
    { label: 'Profil Sekolah', href: '#profil', icon: Building },
    { label: 'Galeri & Berita', href: '#galeri', icon: ImageIcon },
    { label: 'Video Kegiatan', href: '#video', icon: Youtube },
  ];
  return (
    <>
      <div className={`fixed inset-0 bg-navy-950/50 z-[90] transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <aside className={`fixed top-0 right-0 h-full w-80 max-w-[86vw] bg-white z-[95] shadow-2xl transform transition-transform duration-500 ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col rounded-l-[2rem]`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <span className="font-serif text-xl text-navy-900">Menu</span>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-navy-800"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-1">
          {items.map((it) => (
            <a key={it.label} href={it.href} onClick={onClose}
               className="flex items-center gap-4 p-3.5 rounded-2xl text-navy-800 font-semibold hover:bg-navy-50 transition">
              <span className="w-9 h-9 rounded-xl bg-navy-900 text-gold-300 flex items-center justify-center"><it.icon size={18} /></span>
              {it.label}
            </a>
          ))}
          <div className="h-px bg-slate-100 my-3" />
          <button onClick={() => onNav('listNews')} className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-navy-800 font-semibold hover:bg-navy-50 transition">
            <span className="w-9 h-9 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center"><Newspaper size={18} /></span> Daftar Berita
          </button>
          <button onClick={() => onNav('listVideo')} className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-navy-800 font-semibold hover:bg-navy-50 transition">
            <span className="w-9 h-9 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center"><Youtube size={18} /></span> Daftar Video
          </button>
          <button onClick={() => onNav('tools')} className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-navy-800 font-semibold hover:bg-navy-50 transition">
            <span className="w-9 h-9 rounded-xl bg-gold-100 text-gold-700 flex items-center justify-center"><Rocket size={18} /></span> Tools & Aplikasi
          </button>
        </div>
        <div className="p-5 border-t border-slate-100 space-y-3">
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSfdM7hAS0t6Pbt1Sb4B43flvSZ2pg8JWpdaVlP0y3lv1mV_xg/viewform?usp=publish-editor"
             target="_blank" rel="noreferrer"
             className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border border-navy-200 text-navy-800 font-bold hover:bg-navy-50 transition">
            <FileText size={18} /> Formulir Online
          </a>
          <a href="#daftar" onClick={onClose} className="block text-center py-3.5 rounded-2xl bg-gold-500 text-navy-950 font-bold hover:bg-gold-600 transition">Daftar Sekarang</a>
        </div>
      </aside>
    </>
  );
}

/* ======================= SECTION: HERO ======================= */
function Hero({ heroImages, heroIdx }) {
  return (
    <header id="beranda" className="relative h-[100dvh] min-h-[640px] overflow-hidden bg-navy-950 text-white">
      {heroImages.map((src, i) => (
        <div key={i} className={`absolute inset-0 transition-opacity duration-[2000ms] ${i === heroIdx ? 'opacity-100' : 'opacity-0'}`}>
          <SmartImage src={src} alt={`Hero ${i + 1}`} fill priority quality={1600}
            sizes="100vw" className={i === heroIdx ? 'animate-kenburns' : ''} />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/45 to-navy-950/85" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy-950 to-transparent" />

      <div className="relative z-10 h-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-gold-300/40 bg-white/5 backdrop-blur text-gold-200 text-xs md:text-sm font-semibold tracking-wider uppercase">
            <Sparkles size={14} /> PPDB Tahun Ajaran 2026/2027
          </span>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="font-serif font-bold mt-7 text-[2.6rem] leading-[1.05] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            Bermain, Belajar
            <br />
            <span className="text-gold-300 italic">&amp; Bertumbuh</span>
          </h1>
        </Reveal>
        <Reveal delay={240}>
          <p className="mt-7 max-w-2xl text-base md:text-xl text-navy-100/90 leading-relaxed">
            TK Baiturrohman membentuk karakter anak yang cerdas, kreatif, dan berakhlak mulia — bertaqwa serta berguna bagi sesama.
          </p>
        </Reveal>
        <Reveal delay={360}>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href="#daftar" className="px-9 py-4 rounded-full bg-gold-500 text-navy-950 font-bold text-lg shadow-xl shadow-gold-600/30 hover:bg-gold-400 transition">Daftar Sekarang</a>
            <a href="#profil" className="px-9 py-4 rounded-full border border-white/30 text-white font-semibold text-lg hover:bg-white/10 transition">Kenali Kami</a>
          </div>
        </Reveal>
      </div>

      {/* indikator slide */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {heroImages.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === heroIdx ? 'w-8 bg-gold-300' : 'w-2 bg-white/40'}`} />
          ))}
        </div>
      )}
    </header>
  );
}

/* ======================= SECTION: FEATURES ======================= */
function Features() {
  const items = [
    { icon: BookOpen, title: 'Kurikulum Merdeka', desc: 'Pembelajaran berpusat pada minat & kebutuhan anak.' },
    { icon: Heart, title: 'Pendidikan Islam', desc: 'Penanaman nilai agama & akhlak sejak dini.' },
    { icon: Shapes, title: 'Fasilitas Lengkap', desc: 'Area bermain yang aman, nyaman, & edukatif.' },
  ];
  return (
    <section className="relative -mt-16 md:-mt-20 z-20 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5 bg-white rounded-[2rem] p-6 md:p-10 shadow-[0_30px_60px_-30px_rgba(11,31,58,0.35)] border border-slate-100">
        {items.map((it, i) => (
          <Reveal key={it.title} delay={i * 100} className="text-center md:px-4">
            <div className="w-16 h-16 rounded-2xl bg-navy-900 text-gold-300 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <it.icon size={28} />
            </div>
            <h3 className="font-serif text-xl text-navy-900 mb-2">{it.title}</h3>
            <p className="text-slate-500 leading-relaxed">{it.desc}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ======================= SECTION: PROFILE ======================= */
function Profile({ profileImages, profileIdx }) {
  const feats = ['Pendidik Profesional', 'Lingkungan Aman', 'Seni & Kreativitas', 'Baca Tulis Al-Qur\'an'];
  return (
    <section id="profil" className="py-24 md:py-32 px-5">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
        <Reveal className="relative order-2 lg:order-1">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl ring-1 ring-slate-200 bg-slate-100">
            {profileImages.map((src, i) => (
              <div key={i} className={`absolute inset-0 transition-opacity duration-[1500ms] ${i === profileIdx ? 'opacity-100' : 'opacity-0'}`}>
                <SmartImage src={src} alt={`Profil ${i + 1}`} fill quality={1200} sizes="(max-width:1024px) 100vw, 50vw" />
              </div>
            ))}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-[2.5rem]" />
          </div>
          <div className="hidden md:block absolute -bottom-6 -right-6 bg-navy-900 text-gold-200 rounded-2xl px-6 py-5 shadow-xl">
            <p className="font-serif text-3xl font-bold">10+</p>
            <p className="text-xs uppercase tracking-widest text-navy-200">Tahun Pengalaman</p>
          </div>
        </Reveal>

        <Reveal delay={120} className="order-1 lg:order-2">
          <span className="gold-divider text-xs uppercase tracking-[0.25em] font-bold">Tentang Kami</span>
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 leading-tight mt-5">
            Mewujudkan Lingkungan Belajar yang Ceria &amp; Islami
          </h2>
          <p className="mt-6 text-slate-600 leading-loose text-lg">
            TK Baiturrohman berkomitmen menyediakan pendidikan anak usia dini yang berkualitas. Kami percaya setiap anak adalah bintang yang menyimpan potensi unik untuk tumbuh menjadi generasi cerdas, berakhlak, dan bermanfaat.
          </p>
          <ul className="mt-8 grid sm:grid-cols-2 gap-3">
            {feats.map((f) => (
              <li key={f} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm">
                <CheckCircle size={18} className="text-gold-500 shrink-0" />
                <span className="font-semibold text-navy-800 text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* ======================= SECTION: GALLERY ======================= */
function Gallery({ news, galleryRef, scrollBy, onOpen, onHtml }) {
  return (
    <section id="galeri" className="py-24 md:py-32 px-4 bg-navy-950 text-white relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="relative max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          <span className="gold-divider text-xs uppercase tracking-[0.25em] font-bold">Galeri</span>
          <h2 className="font-serif text-4xl md:text-5xl mt-4">Galeri &amp; Berita</h2>
          <p className="text-navy-200/80 mt-4 max-w-xl mx-auto">Geser dan pilih foto untuk melihat aktivitas serta liputan kegiatan anak-anak.</p>
        </Reveal>

        <div className="relative group">
          <ScrollBtn dir="left" onClick={() => scrollBy(galleryRef, -1)} />
          <ScrollBtn dir="right" onClick={() => scrollBy(galleryRef, 1)} />
          <div ref={galleryRef} className="flex gap-6 overflow-x-auto hide-scroll snap-x snap-mandatory px-2 md:px-8 pb-4">
            {news.map((n, i) => {
              const img = n.images?.[0] || FALLBACK_THUMB;
              const isHtml = n.type === 'html';
              return (
                <Reveal key={i} delay={(i % 4) * 70}
                  className="w-[82vw] sm:w-[340px] md:w-[380px] shrink-0 snap-center group/card cursor-pointer"
                  onClick={() => (isHtml ? onHtml(n) : onOpen(n))}>
                  <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-navy-900 shadow-xl ring-1 ring-white/10">
                    <SmartImage src={img} alt={n.title} fill quality={900} sizes="(max-width:640px) 82vw, 380px" className="group-hover/card:scale-105 transition-transform duration-[1200ms]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
                    <span className={`absolute top-4 left-4 text-[10px] tracking-widest uppercase font-bold px-3 py-1.5 rounded-full ${isHtml ? 'bg-gold-400 text-navy-950' : 'bg-white/15 text-white backdrop-blur'}`}>
                      {isHtml ? 'Aplikasi' : 'Berita'}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <h3 className="font-serif text-xl leading-snug text-white line-clamp-2">{n.title}</h3>
                      <p className="mt-3 text-gold-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        {n.date || 'Baca'} <ArrowLeft className="rotate-180" size={13} />
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ======================= SECTION: VIDEO ======================= */
function VideoSection({ videos, videoRef, scrollBy, onPlay }) {
  const valid = videos.filter((v) => getYouTubeId(v.url) || /\.(mp4|webm|ogg)$/i.test(String(v.url)));
  return (
    <section id="video" className="py-24 md:py-32 px-4">
      <div className="max-w-7xl mx-auto">
        <Reveal className="text-center mb-14">
          <span className="gold-divider text-xs uppercase tracking-[0.25em] font-bold">Video</span>
          <h2 className="font-serif text-4xl md:text-5xl text-navy-900 mt-4">Video Kegiatan</h2>
        </Reveal>
        <div className="relative group">
          <ScrollBtn dir="left" onClick={() => scrollBy(videoRef, -1)} dark />
          <ScrollBtn dir="right" onClick={() => scrollBy(videoRef, 1)} dark />
          <div ref={videoRef} className="flex gap-6 overflow-x-auto hide-scroll snap-x snap-mandatory px-2 md:px-8 pb-4">
            {valid.map((v, i) => {
              const id = getYouTubeId(v.url);
              const [hq] = ytThumb(id);
              return (
                <Reveal key={i} delay={(i % 4) * 70}
                  className="w-[82vw] sm:w-[340px] md:w-[420px] shrink-0 snap-center group/vid cursor-pointer bg-white rounded-[2rem] overflow-hidden shadow-[0_20px_50px_-30px_rgba(11,31,58,0.4)] border border-slate-100"
                  onClick={() => onPlay(v.url, v.judul)}>
                  <div className="relative aspect-video overflow-hidden bg-navy-950">
                    <SmartImage src={hq} alt={v.judul} fill quality={900} sizes="(max-width:640px) 82vw, 420px" className="opacity-90 group-hover/vid:opacity-100 group-hover/vid:scale-105 transition-all duration-[1000ms]" />
                    <div className="absolute inset-0 flex items-center justify-center bg-navy-950/20 group-hover/vid:bg-navy-950/10 transition">
                      <span className="w-16 h-16 rounded-full bg-gold-500/95 text-navy-950 flex items-center justify-center shadow-2xl group-hover/vid:scale-110 transition-transform">
                        <Play size={26} className="ml-1" fill="currentColor" />
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-navy-900 line-clamp-1">{v.judul}</h3>
                    <p className="mt-2 text-slate-500 text-sm line-clamp-2 leading-relaxed">{v.deskripsi}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScrollBtn({ dir, onClick, dark }) {
  return (
    <button onClick={onClick} aria-label={dir === 'left' ? 'Sebelumnya' : 'Berikutnya'}
      className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full items-center justify-center shadow-xl transition-all opacity-0 group-hover:opacity-100 ${
        dir === 'left' ? '-left-2 md:-left-6' : '-right-2 md:-right-6'
      } ${dark ? 'bg-navy-900 text-gold-200 hover:bg-navy-800' : 'bg-white text-navy-900 hover:bg-gold-500 hover:text-navy-950'}`}>
      {dir === 'left' ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
    </button>
  );
}

/* ======================= SECTION: REGISTRATION ======================= */
function Registration({ openWhatsApp }) {
  return (
    <section id="daftar" className="py-24 md:py-32 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-5 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 bg-white">
        <div className="md:col-span-2 bg-navy-900 text-white p-9 md:p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,#c28a28_0,transparent_50%)]" />
          <div className="relative">
            <span className="gold-divider text-xs uppercase tracking-[0.25em] font-bold">PPDB</span>
            <h2 className="font-serif text-3xl md:text-4xl mt-4">Daftar Sekarang</h2>
            <p className="mt-5 text-navy-100/85 leading-relaxed">Isi formulir, data akan langsung terkirim ke nomor kepala sekolah melalui WhatsApp.</p>
            <div className="mt-9 space-y-4">
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                <Phone size={20} className="text-gold-300 shrink-0" />
                <span className="font-bold tracking-wide">0895-3910-01402</span>
              </div>
              <div className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                <MapPin size={20} className="text-gold-300 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">Jl. Andong Kencono No. III, Pulodarat RT 19 RW 02, Pecangaan, Jepara.</span>
              </div>
            </div>
          </div>
        </div>

        <form id="waForm" onSubmit={openWhatsApp} className="md:col-span-3 p-8 md:p-12 space-y-5">
          <Field label="Nama Lengkap Anak"><input required name="namaAnak" placeholder="Contoh: Ahmad Zaky" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Umur (Tahun)"><input required type="number" name="umur" placeholder="5" min="1" max="10" className={inputCls} /></Field>
            <Field label="Jenis Kelamin">
              <select name="jk" className={inputCls}>
                <option>Laki-laki</option>
                <option>Perempuan</option>
              </select>
            </Field>
          </div>
          <Field label="Nama Orang Tua"><input required name="namaOrtu" placeholder="Contoh: Bpk. Budi" className={inputCls} /></Field>
          <Field label="Alamat Domisili"><textarea required name="alamat" rows="3" placeholder="Alamat lengkap..." className={inputCls + ' resize-none'} /></Field>
          <button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold py-4 rounded-2xl text-lg shadow-lg shadow-gold-500/30 transition flex items-center justify-center gap-2">
            <Phone size={18} /> Kirim Pendaftaran
          </button>
        </form>
      </div>
    </section>
  );
}
const inputCls = 'w-full px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-navy-900/20 focus:border-navy-700 outline-none transition text-navy-900';
function Field({ label, children }) {
  return (<label className="block"><span className="block text-sm font-bold text-navy-800 mb-1.5">{label}</span>{children}</label>);
}

/* ======================= SECTION: MAP ======================= */
function MapSection() {
  return (
    <section id="lokasi" className="pb-24 px-4">
      <div className="max-w-6xl mx-auto">
        <Reveal className="text-center mb-10">
          <span className="gold-divider text-xs uppercase tracking-[0.25em] font-bold">Lokasi</span>
          <h2 className="font-serif text-3xl md:text-4xl text-navy-900 mt-4">Temukan Kami</h2>
        </Reveal>
        <div className="rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-slate-200">
          <iframe title="Lokasi TK Baiturrohman" className="w-full h-[420px]" loading="lazy"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3962.5804911944147!2d110.71185243070909!3d-6.6987642984019065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e70dffdf8c9501b%3A0xa0ec339baa98c01e!2sTK%20BAITURROHMAN%20Pulodarat!5e0!3m2!1sid!2sid!4v1769270324442!5m2!1sid!2sid"
            allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </section>
  );
}

/* ======================= SECTION: FOOTER ======================= */
function Footer({ onNav }) {
  return (
    <footer className="bg-navy-950 text-navy-100 pt-20 pb-10 px-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" />
      <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <SmartImage src="/logotk.webp" alt="Logo" width={56} height={56} className="rounded-full" quality={120} />
            <div>
              <p className="font-serif text-2xl text-white">TK Baiturrohman</p>
              <p className="text-[11px] tracking-[0.25em] uppercase text-gold-300 font-semibold">Pulodarat · Jepara</p>
            </div>
          </div>
          <p className="mt-5 max-w-sm text-navy-200/75 leading-relaxed">Membentuk generasi masa depan yang cerdas, kreatif, religius, dan berakhlak mulia.</p>
        </div>
        <div>
          <h4 className="font-serif text-lg text-white mb-5">Tautan</h4>
          <ul className="space-y-3 text-sm">
            <li><a href="#beranda" className="hover:text-gold-300 transition">Beranda</a></li>
            <li><a href="#profil" className="hover:text-gold-300 transition">Tentang Kami</a></li>
            <li><button onClick={() => onNav('listNews')} className="hover:text-gold-300 transition">Galeri Berita</button></li>
            <li><a href="#daftar" className="hover:text-gold-300 transition">Info PPDB</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-serif text-lg text-white mb-5">Kontak</h4>
          <ul className="space-y-3 text-sm text-navy-200/80">
            <li className="flex gap-3"><Phone size={16} className="text-gold-300 mt-0.5 shrink-0" /> 0895-3910-01402</li>
            <li className="flex gap-3"><Mail size={16} className="text-gold-300 mt-0.5 shrink-0" /> dapodiktkbaiturrohman@gmail.com</li>
            <li className="flex gap-3"><MapPinned size={16} className="text-gold-300 mt-0.5 shrink-0" /> Pulodarat RT 19 RW 02, Pecangaan, Jepara.</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-14 pt-7 border-t border-white/10 text-center text-navy-300/60 text-sm">
        © {new Date().getFullYear()} TK Baiturrohman Pulodarat. All Rights Reserved.
      </div>
    </footer>
  );
}

/* ======================= OVERLAY: LIST ======================= */
function ListModal({ view, setView, kind, title, search, setSearch, items, onPick, isVideo }) {
  const open = view === kind;
  const filtered = items.filter((it) => (it.title || it.judul || '').toLowerCase().includes(search.toLowerCase()));
  return (
    <div className={`fixed inset-0 z-[100] bg-cream transform transition-transform duration-500 flex flex-col ${open ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
      <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 p-4 flex items-center gap-3 z-10">
        <button onClick={() => setView('home')} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-navy-800"><ArrowLeft size={20} /></button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Cari ${isVideo ? 'video' : 'berita'}…`}
          className="flex-1 px-4 py-3 rounded-full bg-slate-100 outline-none focus:ring-2 focus:ring-navy-900/20" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h2 className="font-serif text-2xl text-navy-900 px-1 mb-2">{title}</h2>
        {filtered.length === 0 ? (
          <div className="text-center text-slate-400 mt-20"><Newspaper className="mx-auto mb-3" size={40} />Tidak ada data.</div>
        ) : filtered.map((item, i) => {
          const t = item.title || item.judul;
          const date = item.date || 'Video Kegiatan';
          let thumb = FALLBACK_THUMB;
          if (!isVideo && item.images?.[0]) thumb = item.images[0];
          if (isVideo) { const id = getYouTubeId(item.url); if (id) [thumb] = ytThumb(id); }
          return (
            <div key={i} onClick={() => onPick(item)} className="flex gap-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition">
              <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-slate-100">
                <SmartImage src={thumb} alt={t} fill quality={300} sizes="96px" />
              </div>
              <div className="min-w-0 py-1">
                <p className="text-[10px] tracking-widest uppercase font-bold text-gold-600">{date}</p>
                <h4 className="font-serif text-lg text-navy-900 line-clamp-2 mt-1">{t}</h4>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ======================= OVERLAY: TOOLS ======================= */
function ToolsModal({ view, setView, items, openIframe }) {
  const open = view === 'tools';
  const go = (t) => {
    if (t.type === 'html_code') window.location.href = `/api/render?id=${t._id}`;
    else if (t.type === 'link' && t.url) openIframe(t.url, t.name);
  };
  return (
    <div className={`fixed inset-0 z-[100] bg-cream transform transition-transform duration-500 flex flex-col ${open ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
      <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 p-4 flex items-center gap-3">
        <button onClick={() => setView('home')} className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-navy-800"><ArrowLeft size={20} /></button>
        <h3 className="font-serif text-xl text-navy-900">Tools &amp; Aplikasi</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {items.length === 0 ? (
          <p className="text-center text-slate-400 mt-20">Belum ada tools.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {items.map((t, i) => (
              <button key={i} onClick={() => go(t)} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition flex flex-col items-center text-center">
                <span className="w-14 h-14 rounded-2xl bg-navy-900 text-gold-300 flex items-center justify-center mb-3"><Rocket size={24} /></span>
                <span className="font-semibold text-navy-900 text-sm line-clamp-2">{t.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================= OVERLAY: IFRAME ======================= */
function IframeModal({ view, setView, iframe, loading, onLoad }) {
  const open = view === 'iframe';
  return (
    <div className={`fixed inset-0 z-[150] bg-black transition-opacity duration-500 flex flex-col ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <button onClick={() => setView('home')} className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"><ArrowLeft size={20} /></button>
      {open && <iframe title={iframe.title} src={iframe.url} onLoad={onLoad} className="flex-1 w-full border-0 bg-black" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" />}
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10"><div className="w-11 h-11 border-2 border-white/20 border-t-white rounded-full animate-spin-slow" /></div>}
    </div>
  );
}

/* ======================= OVERLAY: NEWS DETAIL ======================= */
function NewsDetail({ view, setView, detail, articleHtml, newsImgIdx, setZoom, pushHistory, setMediaViewer, openWhatsApp }) {
  const open = view === 'detailNews';
  if (!detail) return null;
  return (
    <div className={`fixed inset-0 z-[110] bg-slate-50 overflow-y-auto transition-transform duration-500 ${open ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-4">
          <button onClick={() => setView('home')} className="text-navy-700 hover:text-gold-600"><ArrowLeft size={24} /></button>
          <span className="font-serif text-xl md:text-2xl font-bold text-navy-900">TK Baiturrohman <span className="text-gold-600">News</span></span>
        </div>
        <div className="h-0.5 bg-slate-200"><div className="h-full w-1/3 bg-gold-500" /></div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
          <div className="p-6 md:p-12">
            <p className="text-gold-600 text-xs uppercase tracking-[0.2em] font-bold">Info Sekolah</p>
            <h1 className="font-serif text-3xl md:text-5xl text-navy-900 mt-3 leading-tight">{detail.title}</h1>
            <div className="flex items-center gap-3 mt-5 pb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center"><ImageIcon size={18} /></div>
              <div>
                <p className="font-bold text-navy-900 text-sm">Redaksi TK Baiturrohman</p>
                <p className="text-slate-400 text-xs">{detail.date}</p>
              </div>
            </div>

            {detail.images?.length > 0 && (
              <figure onClick={() => { pushHistory(); setZoom(detail.images[newsImgIdx]); }}
                className="relative mt-8 mx-auto w-full max-w-lg aspect-square rounded-3xl overflow-hidden bg-slate-100 cursor-zoom-in ring-1 ring-slate-200">
                {detail.images.map((src, i) => (
                  <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ${i === newsImgIdx ? 'opacity-100' : 'opacity-0'}`}>
                    <SmartImage src={src} alt={detail.title} fill quality={1200} sizes="(max-width:768px) 100vw, 720px" />
                  </div>
                ))}
                <figcaption className="absolute top-3 left-3 bg-navy-950/70 text-white text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full">Foto Utama</figcaption>
              </figure>
            )}

            <div className="article-content mt-8" dangerouslySetInnerHTML={articleHtml} />

            {detail.gallery?.length > 0 && (
              <div className="mt-10 pt-8 border-t border-slate-200 text-center">
                <button onClick={() => { pushHistory(); setMediaViewer(detail); setView('mediaViewer'); }}
                  className="inline-flex items-center gap-2 bg-navy-900 text-gold-200 font-bold px-6 py-3 rounded-full hover:bg-navy-800 transition">
                  <ImageIcon size={18} /> Lihat Semua Dokumentasi
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="mt-8 bg-gradient-to-br from-navy-900 to-navy-800 text-white rounded-3xl p-8 text-center shadow-lg">
          <p className="text-gold-300 text-xs uppercase tracking-[0.2em]">Pendaftaran Siswa Baru</p>
          <h4 className="font-serif text-2xl mt-2">PPDB 2026/2027 Telah Dibuka</h4>
          <button onClick={openWhatsApp} className="mt-5 inline-block bg-gold-500 text-navy-950 font-bold px-7 py-3 rounded-full hover:bg-gold-400 transition">Info Selengkapnya</button>
        </aside>
      </main>
    </div>
  );
}

/* ======================= OVERLAY: MEDIA VIEWER ======================= */
function MediaViewer({ view, setView, data, setZoom, pushHistory }) {
  const open = view === 'mediaViewer';
  const items = data ? (data.gallery || []).filter((it) => !data.activeFilter || data.activeFilter === 'null' || it.group === data.activeFilter) : [];
  return (
    <div className={`fixed inset-0 z-[120] bg-navy-950/97 overflow-y-auto transition-all duration-500 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="sticky top-0 p-4 flex items-start bg-gradient-to-b from-black/70 to-transparent">
        <button onClick={() => setView('detailNews')} className="w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><ArrowLeft size={22} /></button>
      </div>
      <div className="max-w-4xl mx-auto px-4 pb-20 -mt-6 space-y-10 flex flex-col items-center">
        {items.map((item, i) => {
          if (item.type === 'image') {
            return (
              <figure key={i} className="w-full">
                <div className="relative w-full rounded-2xl overflow-hidden bg-black/30" onClick={() => { pushHistory(); setZoom(item.src); }}>
                  <SmartImage src={item.src} alt={item.caption || 'Galeri'} width={1200} height={800} quality={1400} className="w-full cursor-zoom-in" />
                </div>
                {item.caption && <figcaption className="text-center text-navy-200/80 text-sm italic mt-3">{item.caption}</figcaption>}
              </figure>
            );
          }
          const id = getYouTubeId(item.src);
          if (id) {
            return (
              <figure key={i} className="w-full">
                <div className="aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
                  <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`} title={item.caption || 'Video'} allowFullScreen />
                </div>
                {item.caption && <figcaption className="text-center text-navy-200/80 text-sm italic mt-3">{item.caption}</figcaption>}
              </figure>
            );
          }
          return (
            <figure key={i} className="w-full">
              <video controls preload="metadata" className="w-full rounded-2xl" src={item.src}><source src={item.src} /></video>
              {item.caption && <figcaption className="text-center text-navy-200/80 text-sm italic mt-3">{item.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
