const TelegramBot = require('node-telegram-bot-api');
const { MongoClient, ObjectId } = require('mongodb');
const { removeBackground, uploadToCloudinary } = require('./utils');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const mongoUri = process.env.MONGODB_URI;
const adminId = process.env.ADMIN_TELEGRAM_ID;

const bot = new TelegramBot(token);
// Client di luar handler agar koneksi awet (Serverless Friendly)
const client = new MongoClient(mongoUri);

// ==========================================
// 1. DEFINISI KEYBOARD (MENU) LENGKAP
// ==========================================

const mainMenu = {
    reply_markup: {
        keyboard: [
            ['📰 Buat Berita', '🎥 Tambah Video Slider'],
            ['🛠️ Kelola Tools', '🖼️ Atur Tampilan'],
            ['✏️ Edit/Hapus', '⚙️ Cloudinary'],
            ['📸 Quick Upload', '❓ Bantuan']
        ],
        resize_keyboard: true
    }
};

const cancelMenu = {
    reply_markup: {
        keyboard: [['❌ Batal / Selesai']],
        resize_keyboard: true
    }
};

const toolsMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Tool Baru', callback_data: 'add_tool' }],
            [{ text: '✏️ Edit / Hapus Tool', callback_data: 'list_tools_edit' }]
        ]
    }
};

const visualMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Slide Hero', callback_data: 'add_hero' }, { text: '🔄 Reset Hero (Ganti Total)', callback_data: 'reset_hero' }],
            [{ text: '➕ Tambah Slide Profil', callback_data: 'add_profile' }, { text: '🔄 Reset Profil (Ganti Total)', callback_data: 'reset_profile' }],
            [{ text: '🤖 Ganti Mascot', callback_data: 'set_mascot' }],
            [{ text: '📝 Edit Teks Info Popup', callback_data: 'set_info_text' }]
        ]
    }
};

const editTypeMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '📝 Edit Berita', callback_data: 'list_news' }],
            [{ text: '🎬 Edit Video Slider', callback_data: 'list_videos' }],
            [{ text: '🖼️ Hapus Slide Hero', callback_data: 'list_hero' }]
        ]
    }
};

const cloudMenu = {
    reply_markup: {
        inline_keyboard: [
            [{ text: '➕ Tambah Akun Baru', callback_data: 'add_cloud' }],
            [{ text: '📋 Lihat Daftar Akun', callback_data: 'list_cloud' }]
        ]
    }
};

// Helper: Membuat List Tombol Inline Secara Dinamis
const createListKeyboard = (items, type) => {
    return {
        inline_keyboard: items.map(item => {
            let label = (item.title || item.judul || item.name || "Item Tanpa Nama").substring(0, 30);
            if (type === 'h') label = `Slide ke-${item.id + 1}`; 
            return [{ text: label, callback_data: `sel_${type}_${item._id}` }];
        })
    };
};

// ==========================================
// 2. MAIN HANDLER FUNCTION
// ==========================================

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const update = req.body;
        if (!update.message && !update.callback_query) return res.send('ok');

        const msg = update.message || update.callback_query.message;
        const chatId = msg.chat.id;
        const fromId = update.message ? update.message.from.id : update.callback_query.from.id;
        const text = (update.message && update.message.text) ? update.message.text : '';

        // 1. Security Check
        if (String(fromId) !== String(adminId)) {
            await bot.sendMessage(chatId, "⛔ Maaf, Anda bukan Admin yang terdaftar.");
            return res.send('ok');
        }

        // 2. Koneksi Database
        try {
            if (!client.topology || !client.topology.isConnected()) {
                await client.connect();
            }
        } catch (e) {
            console.log("DB Connection Error:", e);
        }
        
        const db = client.db('school_db');
        const stateCol = db.collection('bot_state');
        const newsCol = db.collection('news');
        const videoCol = db.collection('videos');
        const toolsCol = db.collection('tools');
        const configCol = db.collection('config');
        const cloudCol = db.collection('cloudinary_accounts');

        let userState = await stateCol.findOne({ _id: chatId }) || {};

        // --- A. GLOBAL CANCEL HANDLER ---
        if (text === '❌ Batal / Selesai' || text === '/start') {
            // Khusus Berita: Jika sudah ada media tersimpan, jangan langsung hapus, tapi lanjut
            if (userState.step && userState.step.startsWith('news_') && userState.draft && userState.draft.gallery && userState.draft.gallery.length > 0) {
                 await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_title_input' } });
                 await bot.sendMessage(chatId, "✅ Selesai Upload.\n\nLangkah 2: Kirim **JUDUL BERITA**:", cancelMenu);
                 return res.send('ok');
            }
            
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "🔄 Kembali ke Menu Utama.", mainMenu);
            return res.send('ok');
        }

        // --- B. CALLBACK QUERY HANDLER ---
        if (update.callback_query) {
            const data = update.callback_query.data;
            await bot.answerCallbackQuery(update.callback_query.id);

            if (data === 'force_cancel') {
                await stateCol.deleteOne({ _id: chatId });
                await bot.sendMessage(chatId, "Dibatalkan.", mainMenu);
            }

            // MENU TOOLS
            if (data === 'add_tool') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'tool_content' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **File HTML/PDF** atau **Link URL** untuk Tool ini:", cancelMenu);
            }
            if (data === 'list_tools_edit') {
                const items = await toolsCol.find({}).toArray();
                if(items.length === 0) await bot.sendMessage(chatId, "Belum ada tools.");
                else await bot.sendMessage(chatId, "Pilih Tool:", { reply_markup: createListKeyboard(items, 't') });
            }

            // MENU TAMPILAN
            if (['add_hero', 'reset_hero', 'add_profile', 'reset_profile', 'set_mascot'].includes(data)) {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'upload_visual', mode: data } }, { upsert: true });
                let m = "📸 **Kirim FOTO** atau **Link URL**.\nBisa kirim banyak. Ketik 'Selesai' jika sudah.";
                if(data.includes('reset')) m = "⚠️ **MODE RESET**\nData lama akan dihapus.";
                await bot.sendMessage(chatId, m, cancelMenu);
            }
            if (data === 'set_info_text') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_title' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **Judul Info Popup**:", cancelMenu);
            }

            // MENU CLOUDINARY
            if (data === 'add_cloud') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_name' } }, { upsert: true });
                await bot.sendMessage(chatId, "Kirim **Cloud Name**:", cancelMenu);
            }
            if (data === 'list_cloud') {
                const accs = await cloudCol.find({}).toArray();
                let msg = "📋 **Daftar Akun Cloudinary:**\n";
                if(accs.length === 0) msg += "(Kosong)";
                else accs.forEach(a => msg += `- ${a.name} (${a.active ? '✅ Aktif' : 'Non-aktif'})\n`);
                await bot.sendMessage(chatId, msg, mainMenu);
            }

            // LISTING EDIT
            if (data === 'list_news') {
                const items = await newsCol.find({}).sort({_id:-1}).limit(10).toArray();
                await bot.sendMessage(chatId, "Pilih Berita:", { reply_markup: createListKeyboard(items, 'n') });
            }
            if (data === 'list_videos') {
                const items = await videoCol.find({}).sort({_id:-1}).limit(10).toArray();
                await bot.sendMessage(chatId, "Pilih Video Slider:", { reply_markup: createListKeyboard(items, 'v') });
            }
            if (data === 'list_hero') {
                const conf = await configCol.findOne({_id: 'main'});
                if(conf && conf.heroImages && conf.heroImages.length > 0) {
                    const heroItems = conf.heroImages.map((u, i) => ({ _id: i, id: i }));
                    await bot.sendMessage(chatId, "Pilih Slide untuk Dihapus:", { reply_markup: createListKeyboard(heroItems, 'h') });
                } else await bot.sendMessage(chatId, "Slide kosong.");
            }

            // SELEKSI ITEM
            if (data.startsWith('sel_')) {
                const [_, type, id] = data.split('_');
                
                // Edit Tool
                if (type === 't') {
                    await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                    await bot.sendMessage(chatId, "Opsi Tool:", {
                        reply_markup: { inline_keyboard: [
                            [{ text: '✏️ Edit Nama', callback_data: 'do_edit_tool_name' }],
                            [{ text: '📂 Ganti File/Link', callback_data: 'do_edit_tool_content' }],
                            [{ text: '🗑️ Hapus Tool', callback_data: 'do_delete_tool' }]
                        ]}
                    });
                    return res.send('ok');
                }
                
                // Hapus Hero
                if (type === 'h') { 
                    const conf = await configCol.findOne({_id: 'main'});
                    const newHero = conf.heroImages.filter((_, idx) => idx !== parseInt(id));
                    await configCol.updateOne({_id: 'main'}, {$set: {heroImages: newHero}});
                    await bot.sendMessage(chatId, "🗑️ Slide dihapus.", mainMenu);
                    return res.send('ok');
                }

                // Edit Berita / Video
                await stateCol.updateOne({ _id: chatId }, { $set: { targetId: id, targetType: type } }, { upsert: true });
                
                const actionButtons = [
                    [{ text: '✏️ Edit Judul', callback_data: 'do_edit_title' }],
                    [{ text: '📝 Edit Isi/Deskripsi', callback_data: 'do_edit_content' }]
                ];

                if (type === 'v') {
                    actionButtons.push([{ text: '🔗 Edit Link URL', callback_data: 'do_edit_video_url' }]);
                }
                actionButtons.push([{ text: '🗑️ HAPUS DATA', callback_data: 'do_delete' }]);

                await bot.sendMessage(chatId, "Pilih Tindakan:", {
                    reply_markup: { inline_keyboard: actionButtons }
                });
            }

            // EKSEKUSI EDIT / DELETE
            if (data === 'do_delete_tool') {
                await toolsCol.deleteOne({ _id: new ObjectId(userState.targetId) });
                await bot.sendMessage(chatId, "🗑️ Tool dihapus.", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            if (data === 'do_edit_tool_name') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_tool_name' } });
                await bot.sendMessage(chatId, "Kirim **Nama Tool Baru**:", cancelMenu);
            }
            if (data === 'do_edit_tool_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_tool_content' } });
                await bot.sendMessage(chatId, "Kirim **File/Link Baru**:", cancelMenu);
            }

            if (data === 'do_delete') {
                const col = userState.targetType === 'n' ? newsCol : videoCol;
                await col.deleteOne({ _id: new ObjectId(userState.targetId) });
                await bot.sendMessage(chatId, "🗑️ Data dihapus.", mainMenu);
                await stateCol.deleteOne({_id:chatId});
            }
            if (data === 'do_edit_title') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_title' } });
                await bot.sendMessage(chatId, "Kirim **Judul Baru**:", cancelMenu);
            }
            if (data === 'do_edit_content') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_content' } });
                await bot.sendMessage(chatId, "Kirim **Konten Baru**:", cancelMenu);
            }
            if (data === 'do_edit_video_url') {
                await stateCol.updateOne({ _id: chatId }, { $set: { step: 'editing_video_url' } });
                await bot.sendMessage(chatId, "Kirim **Link YouTube Baru**:", cancelMenu);
            }

            return res.send('ok');
        }

        // --- C. INPUT HANDLER ---

        // 1. TOOLS WIZARD
        if (text === '🛠️ Kelola Tools') {
            await bot.sendMessage(chatId, "Menu Pengelolaan Tools:", toolsMenu);
            return res.send('ok');
        }
        
        if (userState.step === 'tool_content') {
            const waitMsg = await bot.sendMessage(chatId, "⏳ Memproses...");
            let toolData = {};

            if (update.message.document) {
                try {
                    const fileId = update.message.document.file_id;
                    const fileName = update.message.document.file_name;
                    if (fileName.endsWith('.html') || fileName.endsWith('.htm') || fileName.endsWith('.txt')) {
                        const fileLink = await bot.getFileLink(fileId);
                        const response = await axios.get(fileLink, { responseType: 'text' });
                        toolData = { type: 'html_code', content: response.data };
                    } else {
                        const activeCloud = await cloudCol.findOne({ active: true });
                        if(!activeCloud) throw new Error("Cloudinary belum diset.");
                        const fileLink = await bot.getFileLink(fileId);
                        const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                        toolData = { type: 'url', content: url };
                    }
                } catch (e) {
                    await bot.deleteMessage(chatId, waitMsg.message_id);
                    await bot.sendMessage(chatId, `❌ Error: ${e.message}`);
                    return res.send('ok');
                }
            } else if (text.startsWith('http')) {
                toolData = { type: 'url', content: text.trim() };
            } else {
                await bot.deleteMessage(chatId, waitMsg.message_id);
                await bot.sendMessage(chatId, "❌ Input salah.");
                return res.send('ok');
            }

            await bot.deleteMessage(chatId, waitMsg.message_id);
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'tool_name', tempTool: toolData } });
            await bot.sendMessage(chatId, "✅ Data diterima! Kirim **NAMA TOOL**:", cancelMenu);
            return res.send('ok');
        }
        
        if (userState.step === 'tool_name') {
            const tData = userState.tempTool;
            await toolsCol.insertOne({
                name: text,
                type: tData.type,
                content: tData.content,
                url: (tData.type === 'url') ? tData.content : null,
                date: new Date()
            });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, `✅ Tool ditambahkan!`, mainMenu);
            return res.send('ok');
        }

        // EDITING TOOL
        if (userState.step === 'editing_tool_name') {
            await toolsCol.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {name: text}});
            await bot.sendMessage(chatId, "✅ Nama Updated!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        if (userState.step === 'editing_tool_content') {
            let toolUpdate = {};
            const waitMsg = await bot.sendMessage(chatId, "⏳ Memproses...");
            
            if (update.message.document) {
                const fileLink = await bot.getFileLink(update.message.document.file_id);
                if (update.message.document.file_name.endsWith('.html')) {
                    const response = await axios.get(fileLink, { responseType: 'text' });
                    toolUpdate = { type: 'html_code', content: response.data, url: null };
                } else {
                    const activeCloud = await cloudCol.findOne({ active: true });
                    const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                    toolUpdate = { type: 'url', content: url, url: url };
                }
            } else if (text.startsWith('http')) {
                toolUpdate = { type: 'url', content: text.trim(), url: text.trim() };
            }
            
            await bot.deleteMessage(chatId, waitMsg.message_id);
            await toolsCol.updateOne({_id: new ObjectId(userState.targetId)}, {$set: toolUpdate});
            await bot.sendMessage(chatId, "✅ Content Updated!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // 2. BERITA WIZARD (LOGIKA BARU: BATCH UPLOAD -> NAMING)
        if (text === '📰 Buat Berita') {
            // Reset state, siapkan buffer dan draft
            await stateCol.updateOne({ _id: chatId }, { 
                $set: { step: 'news_photos_upload', draft: { gallery: [], images: [] }, buffer: [] } 
            }, { upsert: true });
            
            await bot.sendMessage(chatId, 
                "**Langkah 1: Upload Media (Batch Upload)**\n\n" +
                "Kirim **Semua Link Foto/Video** untuk kategori pertama (misal: Dokumentasi).\n" +
                "Bisa kirim 10 link sekaligus (pisah baris).\n\n" +
                "➡️ Saya akan minta nama kategori setelah kamu kirim.", 
                cancelMenu
            );
            return res.send('ok');
        }

        // STEP 1.1: TERIMA FILE/LINK -> MASUKKAN KE BUFFER SEMENTARA
        if (userState.step === 'news_photos_upload') {
            const activeCloud = await cloudCol.findOne({ active: true });
            let newItems = [];

            // Jika Foto Telegram
            if (update.message.photo) {
                if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Cloudinary belum diset."); return res.send('ok'); }
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                if(url) newItems.push({url, type: 'image'});
            } 
            // Jika Teks Link (Multi URL)
            else if (text && !text.includes('Batal')) {
                const links = text.split('\n');
                links.forEach(l => {
                    const cleaned = l.trim();
                    if(cleaned.startsWith('http')) {
                        const type = (cleaned.includes('youtu')) ? 'video' : 'image';
                        newItems.push({url: cleaned, type});
                    }
                });
            }

            if (newItems.length > 0) {
                // Simpan ke BUFFER (Belum ke Draft utama)
                await stateCol.updateOne({ _id: chatId }, { 
                    $push: { buffer: { $each: newItems } },
                    $set: { step: 'news_naming_category' } // Pindah ke step penamaan
                });

                await bot.sendMessage(chatId, 
                    `✅ **${newItems.length} Media Diterima!**\n\n` +
                    `Sekarang kirim **NAMA KATEGORI** untuk grup foto ini.\n` +
                    `(Contoh: *Dokumentasi*, *Fasilitas*, atau *Kegiatan Inti*)`, 
                    cancelMenu
                );
            } else {
                await bot.sendMessage(chatId, "❌ Link tidak valid atau format salah.");
            }
            return res.send('ok');
        }

        // STEP 1.2: PROSES PENAMAAN KATEGORI & GENERATE KODE
        if (userState.step === 'news_naming_category') {
            const categoryName = text; // User mengetik "Dokumentasi"
            const buffer = userState.buffer || [];

            if (buffer.length === 0) {
                await bot.sendMessage(chatId, "⚠️ Error: Buffer kosong. Ulangi upload.");
                await stateCol.updateOne({_id:chatId}, {$set:{step:'news_photos_upload'}});
                return res.send('ok');
            }

            // Pindahkan Buffer ke Main Draft dengan Label Kategori
            let galleryItems = [];
            // ID Spesifik untuk kategori ini (agar bisa dipanggil sebagai album)
            const catId = categoryName.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random()*1000);
            
            // Loop items di buffer
            for (let i = 0; i < buffer.length; i++) {
                const item = buffer[i];
                const uniqueId = `img_${Date.now()}_${i}`; // ID unik per foto
                
                galleryItems.push({
                    id: uniqueId,
                    group: catId,            // Group ID (untuk filter kategori)
                    groupName: categoryName, // Nama Kategori (readable)
                    type: item.type,
                    src: item.url,
                    caption: categoryName
                });

                // Jika image, masukkan juga ke draft.images untuk header slideshow
                if(item.type === 'image') {
                    await stateCol.updateOne({_id:chatId}, {$push: {"draft.images": item.url}});
                }
            }

            // Push semua ke Gallery Utama
            await stateCol.updateOne({_id:chatId}, {
                $push: { "draft.gallery": { $each: galleryItems } },
                $set: { buffer: [], step: 'news_photos_upload' } // Reset buffer & kembali ke mode upload
            });

            // --- GENERATE LINK PINTAR ---
            // 1. Link In-Line Satu Foto (Ambil foto pertama dari batch ini)
            const singleLink = `<a onclick="openMediaViewer(currentNewsIndex, '${galleryItems[0].id}')" class="inline-link">[Lihat 1 Foto]</a>`;
            
            // 2. Link In-Line Kategori Spesifik (Album Dokumentasi)
            const catLink = `<a onclick="openMediaViewer(currentNewsIndex, '${catId}')" class="inline-link">[Lihat Album ${categoryName}]</a>`;
            
            // 3. Link In-Line All Foto (Semua)
            const allLink = `<a onclick="openMediaViewer(currentNewsIndex, 'all')" class="inline-link">[Lihat Semua Galeri]</a>`;

            const msgReply = 
                `📂 **Kategori Tersimpan: "${categoryName}"** (${buffer.length} item)\n\n` +
                `👇 **Salin Kode Link di bawah ini:**\n\n` +
                `1️⃣ **Link 1 Foto Saja:**\n<code>${singleLink.replace(/</g,'&lt;')}</code>\n\n` +
                `2️⃣ **Link Album "${categoryName}":**\n<code>${catLink.replace(/</g,'&lt;')}</code>\n\n` +
                `3️⃣ **Link Semua Galeri:**\n<code>${allLink.replace(/</g,'&lt;')}</code>\n\n` +
                `---\n` +
                `🔄 **Mau tambah kategori lain?** Kirim Link/Foto lagi sekarang.\n` +
                `✅ **Jika sudah semua**, ketik tombol **'Selesai'**.`;

            await bot.sendMessage(chatId, msgReply, {parse_mode:'HTML'});
            return res.send('ok');
        }

        if (userState.step === 'news_title_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_date_input', "draft.title": text } });
            await bot.sendMessage(chatId, "Langkah 3: Kirim **TANGGAL KEGIATAN**:", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_date_input') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'news_content_input', "draft.date": text } });
            await bot.sendMessage(chatId, "Langkah 4: Kirim **ISI BERITA** (Tempel kode link tadi disini):", cancelMenu);
            return res.send('ok');
        }

        if (userState.step === 'news_content_input') {
            const draft = userState.draft;
            draft.content = text + `<br><br><p class='text-center text-sm text-gray-500'><a onclick="openMediaViewer(currentNewsIndex, 'all')" class='inline-link'>[Lihat Semua Dokumentasi]</a></p>`;
            
            await newsCol.insertOne(draft);
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ **BERITA BERHASIL DITERBITKAN!**", mainMenu);
            return res.send('ok');
        }

        // 3. VIDEO SLIDER
        if (text === '🎥 Tambah Video Slider') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_title', draft: {} } }, { upsert: true });
            await bot.sendMessage(chatId, "Kirim **Judul Video**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_desc', "draft.judul": text } });
            await bot.sendMessage(chatId, "Kirim **Deskripsi Singkat**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_desc') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'vid_url', "draft.deskripsi": text } });
            await bot.sendMessage(chatId, "Kirim **Link YouTube**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'vid_url') {
            await videoCol.insertOne({ judul: userState.draft.judul, deskripsi: userState.draft.deskripsi, url: text });
            await stateCol.deleteOne({ _id: chatId });
            await bot.sendMessage(chatId, "✅ Video Slider Ditambah!", mainMenu);
            return res.send('ok');
        }

        // 4. UPLOAD VISUAL
        if (userState.step === 'upload_visual') {
            let finalUrl = null;
            if (update.message.photo) {
                const activeCloud = await cloudCol.findOne({ active: true });
                if(!activeCloud) { await bot.sendMessage(chatId, "⚠️ Set Cloudinary dulu."); return res.send('ok'); }
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                finalUrl = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
            } else if (text && text.startsWith('http')) {
                finalUrl = text.trim();
            }

            if (finalUrl) {
                if (userState.mode === 'set_mascot') {
                    await configCol.updateOne({_id:'main'}, {$set: {mascotUrl: finalUrl}}, {upsert:true});
                    await bot.sendMessage(chatId, "✅ Mascot Ganti!", mainMenu);
                    await stateCol.deleteOne({_id:chatId});
                } else {
                    const field = userState.mode.includes('hero') ? 'heroImages' : 'profileImages';
                    if (userState.mode.includes('reset')) {
                        await configCol.updateOne({_id:'main'}, {$set: {[field]: [finalUrl]}}, {upsert:true});
                        await stateCol.updateOne({_id:chatId}, {$set: {mode: userState.mode.replace('reset', 'add')}});
                        await bot.sendMessage(chatId, "✅ Reset Sukses! Kirim lagi untuk menambah.", cancelMenu);
                    } else {
                        await configCol.updateOne({_id:'main'}, {$push: {[field]: finalUrl}}, {upsert:true});
                        await bot.sendMessage(chatId, "✅ Slide Ditambah.", cancelMenu);
                    }
                }
            } else if (!text.includes('Selesai')) {
                await bot.sendMessage(chatId, "❌ Input salah.");
            }
            return res.send('ok');
        }

        // 5. INFO TEKS
        if (userState.step === 'info_title') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'info_content', temp: text } });
            await bot.sendMessage(chatId, "Kirim **Isi Info**:", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'info_content') {
            await configCol.updateOne({_id:'main'}, {$set: {infoTitle: userState.temp, infoContent: text}}, {upsert:true});
            await stateCol.deleteOne({_id:chatId});
            await bot.sendMessage(chatId, "✅ Info Update!", mainMenu);
            return res.send('ok');
        }

        // 6. CLOUDINARY
        if (userState.step === 'wait_cloud_name') {
            await stateCol.updateOne({ _id: chatId }, { $set: { step: 'wait_cloud_preset', temp: text } });
            await bot.sendMessage(chatId, "Kirim **Upload Preset** (Unsigned):", cancelMenu);
            return res.send('ok');
        }
        if (userState.step === 'wait_cloud_preset') {
            await cloudCol.updateMany({}, {$set:{active:false}});
            await cloudCol.insertOne({ name: userState.temp, preset: text, active: true, date: new Date() });
            await stateCol.deleteOne({_id:chatId});
            await bot.sendMessage(chatId, "✅ Akun Cloudinary Aktif!", mainMenu);
            return res.send('ok');
        }

        // 7. EDITING SAVE
        if (userState.step === 'editing_title' || userState.step === 'editing_content') {
            const col = userState.targetType === 'n' ? newsCol : videoCol;
            const field = (userState.step === 'editing_title') 
                ? (userState.targetType === 'n' ? 'title':'judul') 
                : (userState.targetType === 'n' ? 'content':'deskripsi');
            
            await col.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {[field]: text}});
            await bot.sendMessage(chatId, "✅ Update Berhasil!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        if (userState.step === 'editing_video_url') {
            await videoCol.updateOne({_id: new ObjectId(userState.targetId)}, {$set: {url: text}});
            await bot.sendMessage(chatId, "✅ Link Video Berhasil Update!", mainMenu);
            await stateCol.deleteOne({_id:chatId});
            return res.send('ok');
        }

        // 8. QUICK UPLOAD
        if (update.message.photo && !userState.step) {
            const activeCloud = await cloudCol.findOne({ active: true });
            if (activeCloud) {
                const waitMsg = await bot.sendMessage(chatId, "📸 Quick Upload...");
                const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                const fileLink = await bot.getFileLink(fileId);
                const url = await uploadToCloudinary(fileLink, activeCloud.name, activeCloud.preset);
                
                await bot.deleteMessage(chatId, waitMsg.message_id);
                if(url) await bot.sendMessage(chatId, `🔗 **URL:**\n\`${url}\``, {parse_mode:'Markdown'});
            }
        }

        // --- D. MENU UTAMA SWITCHER ---
        if (!userState.step) {
            switch (text) {
                case '✏️ Edit/Hapus': await bot.sendMessage(chatId, "Pilih Tipe:", editTypeMenu); break;
                case '🖼️ Atur Tampilan': await bot.sendMessage(chatId, "Pilih Tampilan:", visualMenu); break;
                case '⚙️ Cloudinary': await bot.sendMessage(chatId, "Menu Cloud:", cloudMenu); break;
                case '🛠️ Kelola Tools': await bot.sendMessage(chatId, "Menu Tools:", toolsMenu); break;
                case '📸 Quick Upload': await bot.sendMessage(chatId, "Kirim foto langsung disini.", mainMenu); break;
                case '❓ Bantuan': await bot.sendMessage(chatId, "Gunakan tombol menu.", mainMenu); break;
            }
        }

        res.send('ok');
    } else {
        res.send('Bot Active V16 Stable');
    }
}
